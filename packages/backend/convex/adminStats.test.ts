import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { commerceSearchText } from "./lib/commerce";
import schema from "./schema";

/**
 * Site-wide statistics for the Super admin (story #15). The whole surface is
 * guarded by `requireAdmin`, and its numbers reuse the #14 aggregation module,
 * so the global totals reconcile with the sum of what each Entrepreneur sees on
 * their own Estadísticas page.
 */

const modules = import.meta.glob("./**/*.*s");

type Role = "user" | "entreprise" | "admin";

async function makeUser(
  t: ReturnType<typeof convexTest>,
  email: string,
  role: Role,
): Promise<Id<"users">> {
  return await t.run((ctx) => ctx.db.insert("users", { email, role }));
}

type CommerceSeed = {
  name: string;
  estado: "pendiente" | "publicado" | "suspendido";
  ownerId: Id<"users">;
};

async function insertCommerce(
  t: ReturnType<typeof convexTest>,
  seed: CommerceSeed,
): Promise<Id<"commerces">> {
  const category = "Tecnología";
  const description = "Descripción de prueba.";
  return await t.run((ctx) =>
    ctx.db.insert("commerces", {
      name: seed.name,
      category,
      description,
      searchText: commerceSearchText({ name: seed.name, category, description }),
      whatsapp: "3001234567",
      photos: [],
      resides: "Resido en Monteazul",
      estado: seed.estado,
      ownerId: seed.ownerId,
    }),
  );
}

/** Journal a Contact WhatsApp Événement directly (bypassing the mutation). */
async function insertContact(
  t: ReturnType<typeof convexTest>,
  commerceId: Id<"commerces">,
  timestamp: number,
): Promise<void> {
  await t.run((ctx) =>
    ctx.db.insert("events", {
      type: "whatsapp_click",
      commerceId,
      timestamp,
      visitorId: "anon",
    }),
  );
}

/** Journal a Visite Événement directly (bypassing the mutation). */
async function insertVisit(
  t: ReturnType<typeof convexTest>,
  commerceId: Id<"commerces">,
  timestamp: number,
  visitorId: string,
): Promise<void> {
  await t.run((ctx) =>
    ctx.db.insert("events", {
      type: "visit",
      commerceId,
      timestamp,
      visitorId,
      visitDay: "2026-07-06",
    }),
  );
}

const JUL6 = Date.UTC(2026, 6, 6, 16, 0); // 2026-07-06 11:00 Bogota

// -----------------------------------------------------------------------------
// Access — reserved to the Super admin (role `admin`).
// -----------------------------------------------------------------------------

describe("globalStats access guard", () => {
  test("refuses anonymous, user and entreprise; accepts admin", async () => {
    const t = convexTest(schema, modules);
    const user = await makeUser(t, "u@example.com", "user");
    const entre = await makeUser(t, "e@example.com", "entreprise");
    const admin = await makeUser(t, "a@example.com", "admin");

    await expect(
      t.query(api.table.adminStats.globalStats, { granularity: "day" }),
    ).rejects.toThrow();
    await expect(
      t
        .withIdentity({ subject: user })
        .query(api.table.adminStats.globalStats, { granularity: "day" }),
    ).rejects.toThrow();
    await expect(
      t
        .withIdentity({ subject: entre })
        .query(api.table.adminStats.globalStats, { granularity: "day" }),
    ).rejects.toThrow();

    const stats = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminStats.globalStats, { granularity: "day" });
    expect(stats.totals).toEqual({ visits: 0, whatsappContacts: 0 });
    expect(stats.ranking).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// Consistency — the global totals equal the sum of the per-commerce stats.
// -----------------------------------------------------------------------------

describe("globalStats consistency with the per-commerce Estadísticas (#14)", () => {
  test("global totals equal the sum of statsForCommerce totals over every fiche", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const ownerA = await makeUser(t, "oa@example.com", "entreprise");
    const ownerB = await makeUser(t, "ob@example.com", "entreprise");
    const a = await insertCommerce(t, {
      name: "Aromas",
      estado: "publicado",
      ownerId: ownerA,
    });
    const b = await insertCommerce(t, {
      name: "Bazar",
      estado: "publicado",
      ownerId: ownerB,
    });

    await insertVisit(t, a, JUL6, "v1");
    await insertVisit(t, a, JUL6, "v2");
    await insertContact(t, a, JUL6);
    await insertVisit(t, b, JUL6, "v3");
    await insertContact(t, b, JUL6);
    await insertContact(t, b, JUL6);

    const global = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminStats.globalStats, { granularity: "day" });

    const statsA = await t
      .withIdentity({ subject: ownerA })
      .query(api.table.events.statsForCommerce, {
        commerceId: a,
        granularity: "day",
      });
    const statsB = await t
      .withIdentity({ subject: ownerB })
      .query(api.table.events.statsForCommerce, {
        commerceId: b,
        granularity: "day",
      });

    expect(global.totals).toEqual({
      visits: statsA.totals.visits + statsB.totals.visits,
      whatsappContacts:
        statsA.totals.whatsappContacts + statsB.totals.whatsappContacts,
    });
    expect(global.totals).toEqual({ visits: 3, whatsappContacts: 3 });
  });
});

// -----------------------------------------------------------------------------
// Ranking — Commerces ordered by their WhatsApp contacts.
// -----------------------------------------------------------------------------

describe("globalStats ranking by WhatsApp contacts", () => {
  test("orders fiches by contacts desc and matches each fiche's own contact total", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    const a = await insertCommerce(t, {
      name: "Aromas",
      estado: "publicado",
      ownerId: owner,
    });
    const b = await insertCommerce(t, {
      name: "Bazar",
      estado: "publicado",
      ownerId: owner,
    });
    const c = await insertCommerce(t, {
      name: "Cafetería",
      estado: "suspendido",
      ownerId: owner,
    });

    // Bazar 3, Aromas 1, Cafetería 0.
    await insertContact(t, b, JUL6);
    await insertContact(t, b, JUL6);
    await insertContact(t, b, JUL6);
    await insertContact(t, a, JUL6);

    const stats = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminStats.globalStats, { granularity: "day" });

    expect(stats.ranking).toEqual([
      { commerceId: b, name: "Bazar", whatsappContacts: 3 },
      { commerceId: a, name: "Aromas", whatsappContacts: 1 },
      { commerceId: c, name: "Cafetería", whatsappContacts: 0 },
    ]);
  });
});

// -----------------------------------------------------------------------------
// Estado breakdown — count of Commerces per Estado.
// -----------------------------------------------------------------------------

describe("globalStats estado breakdown", () => {
  test("counts Commerces per Estado exactly, in the canonical order", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeUser(t, "a@example.com", "admin");
    const owner = await makeUser(t, "o@example.com", "entreprise");
    await insertCommerce(t, {
      name: "P1",
      estado: "pendiente",
      ownerId: owner,
    });
    await insertCommerce(t, {
      name: "Pub1",
      estado: "publicado",
      ownerId: owner,
    });
    await insertCommerce(t, {
      name: "Pub2",
      estado: "publicado",
      ownerId: owner,
    });
    await insertCommerce(t, {
      name: "Susp1",
      estado: "suspendido",
      ownerId: owner,
    });

    const stats = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminStats.globalStats, { granularity: "day" });

    expect(stats.estadoBreakdown).toEqual([
      { estado: "pendiente", count: 1 },
      { estado: "publicado", count: 2 },
      { estado: "suspendido", count: 1 },
    ]);
  });
});
