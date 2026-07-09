import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { commerceSearchText } from "./lib/commerce";
import { bogotaDayKey } from "./lib/tracking";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

/**
 * `statsForCommerce` — the Entrepreneur's own statistics, aggregated AT READ
 * from the Événement journal (ADR-0001). Guarded by ownership: an Entrepreneur
 * only ever sees their OWN fiche's stats, never another's.
 */

async function insertOwner(
  t: ReturnType<typeof convexTest>,
  email: string,
  role: "user" | "entreprise" | "admin" = "entreprise",
): Promise<Id<"users">> {
  return t.run((ctx) => ctx.db.insert("users", { email, role }));
}

async function insertCommerce(
  t: ReturnType<typeof convexTest>,
  ownerId: Id<"users">,
): Promise<Id<"commerces">> {
  const name = "Panadería El Trigal";
  const category = "Comida y bebida";
  const description = "Pan artesanal horneado a diario.";
  return t.run((ctx) =>
    ctx.db.insert("commerces", {
      name,
      category,
      description,
      searchText: commerceSearchText({ name, category, description }),
      whatsapp: "3182173887",
      photos: [],
      estado: "publicado",
      resides: "Resido en Monteazul",
      ownerId,
    }),
  );
}

async function insertVisit(
  t: ReturnType<typeof convexTest>,
  commerceId: Id<"commerces">,
  timestamp: number,
  visitorId = "anon-1",
): Promise<void> {
  await t.run((ctx) =>
    ctx.db.insert("events", {
      type: "visit",
      commerceId,
      timestamp,
      visitorId,
      visitDay: bogotaDayKey(timestamp),
    }),
  );
}

async function insertWhatsAppClick(
  t: ReturnType<typeof convexTest>,
  commerceId: Id<"commerces">,
  timestamp: number,
  visitorId = "anon-1",
): Promise<void> {
  await t.run((ctx) =>
    ctx.db.insert("events", {
      type: "whatsapp_click",
      commerceId,
      timestamp,
      visitorId,
    }),
  );
}

const JUL5_2330 = Date.UTC(2026, 6, 6, 4, 30); // 2026-07-05 23:30 Bogota
const JUL6_11H = Date.UTC(2026, 6, 6, 16, 0); // 2026-07-06 11:00 Bogota

describe("statsForCommerce — ownership guard", () => {
  test("another Entrepreneur cannot read a fiche's stats", async () => {
    const t = convexTest(schema, modules);
    const owner = await insertOwner(t, "owner@example.com");
    const intruder = await insertOwner(t, "intruder@example.com");
    const commerceId = await insertCommerce(t, owner);

    await expect(
      t
        .withIdentity({ subject: intruder })
        .query(api.table.events.statsForCommerce, {
          commerceId,
          period: "all",
        }),
    ).rejects.toThrow();
  });

  test("a plain User and an anonymous caller cannot read a fiche's stats", async () => {
    const t = convexTest(schema, modules);
    const owner = await insertOwner(t, "owner@example.com");
    const client = await insertOwner(t, "client@example.com", "user");
    const commerceId = await insertCommerce(t, owner);

    await expect(
      t
        .withIdentity({ subject: client })
        .query(api.table.events.statsForCommerce, {
          commerceId,
          period: "all",
        }),
    ).rejects.toThrow();
    await expect(
      t.query(api.table.events.statsForCommerce, {
        commerceId,
        period: "all",
      }),
    ).rejects.toThrow();
  });

  test("even a Super admin is refused on another's fiche — stats are strictly owner-only (admins have globalStats)", async () => {
    const t = convexTest(schema, modules);
    const owner = await insertOwner(t, "owner@example.com");
    const admin = await insertOwner(t, "admin@example.com", "admin");
    const commerceId = await insertCommerce(t, owner);

    await expect(
      t
        .withIdentity({ subject: admin })
        .query(api.table.events.statsForCommerce, {
          commerceId,
          period: "all",
        }),
    ).rejects.toThrow();
  });
});

describe("statsForCommerce — aggregation", () => {
  test("the owner reads all-time totals and a series covering their own events", async () => {
    const t = convexTest(schema, modules);
    const owner = await insertOwner(t, "owner@example.com");
    const commerceId = await insertCommerce(t, owner);

    await insertVisit(t, commerceId, JUL5_2330, "anon-1");
    await insertVisit(t, commerceId, JUL6_11H, "anon-2");
    await insertWhatsAppClick(t, commerceId, JUL6_11H, "anon-2");

    const stats = await t
      .withIdentity({ subject: owner })
      .query(api.table.events.statsForCommerce, {
        commerceId,
        period: "all",
      });

    // Totals are all-time and deterministic. With the "all" period the series
    // is monthly and gap-filled up to the current month, so we assert the
    // data's own month is present (exact gap-fill length is time-dependent —
    // the day/week bucketing is pinned deterministically in lib/stats.test.ts).
    expect(stats.totals).toEqual({ visits: 2, whatsappContacts: 1 });
    expect(stats.series).toContainEqual({
      bucket: "2026-07",
      visits: 2,
      whatsappContacts: 1,
    });
  });

  test("stats are scoped to the queried fiche — another fiche's events are excluded", async () => {
    const t = convexTest(schema, modules);
    const owner = await insertOwner(t, "owner@example.com");
    const mine = await insertCommerce(t, owner);
    const otherOwner = await insertOwner(t, "other@example.com");
    const otherFiche = await insertCommerce(t, otherOwner);

    await insertVisit(t, mine, JUL6_11H, "anon-1");
    // Noise on another fiche must not leak into my stats.
    await insertVisit(t, otherFiche, JUL6_11H, "anon-9");
    await insertWhatsAppClick(t, otherFiche, JUL6_11H, "anon-9");

    const stats = await t
      .withIdentity({ subject: owner })
      .query(api.table.events.statsForCommerce, {
        commerceId: mine,
        period: "all",
      });

    expect(stats.totals).toEqual({ visits: 1, whatsappContacts: 0 });
  });
});
