import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { commerceSearchText } from "./lib/commerce";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

/** Insert a minimal publicado Commerce owned by `ownerId`. */
async function insertCommerce(
  t: ReturnType<typeof convexTest>,
  ownerId: Id<"users">,
): Promise<Id<"commerces">> {
  const name = "Panadería El Trigal";
  const category = "Comida y bebida";
  const subcategories = ["Panadería y repostería"];
  const description = "Pan artesanal horneado a diario.";
  return t.run((ctx) =>
    ctx.db.insert("commerces", {
      name,
      category,
      subcategories,
      description,
      searchText: commerceSearchText({
        name,
        category,
        subcategories,
        description,
      }),
      whatsapp: "3182173887",
      photos: [],
      estado: "publicado",
      resides: "Resido en Monteazul",
      ownerId,
    }),
  );
}

/** Insert an Entrepreneur account. */
async function insertOwner(
  t: ReturnType<typeof convexTest>,
  email = "owner@example.com",
): Promise<Id<"users">> {
  return t.run((ctx) => ctx.db.insert("users", { email, role: "entreprise" }));
}

/** Insert a publicado Commerce plus its Entrepreneur, returning both ids. */
async function makeCommerceWithOwner(
  t: ReturnType<typeof convexTest>,
  email = "owner@example.com",
): Promise<{ commerceId: Id<"commerces">; ownerId: Id<"users"> }> {
  const ownerId = await insertOwner(t, email);
  const commerceId = await insertCommerce(t, ownerId);
  return { commerceId, ownerId };
}

/** Insert a minimal publicado Commerce to attach Contact WhatsApp events to. */
async function makeCommerce(
  t: ReturnType<typeof convexTest>,
): Promise<Id<"commerces">> {
  return insertCommerce(t, await insertOwner(t));
}

/** All journaled `visit` Événements. */
async function visitEvents(
  t: ReturnType<typeof convexTest>,
): Promise<Doc<"events">[]> {
  const events = await t.run((ctx) => ctx.db.query("events").collect());
  return events.filter((e) => e.type === "visit");
}

describe("recordWhatsAppClick", () => {
  test("records exactly one whatsapp_click event per call — N clicks = N events (raw, not deduplicated)", async () => {
    const t = convexTest(schema, modules);
    const commerceId = await makeCommerce(t);

    for (let i = 0; i < 3; i++) {
      await t.mutation(api.table.events.recordWhatsAppClick, {
        commerceId,
        visitorId: "anon-visitor-1",
      });
    }

    const events = await t.run((ctx) => ctx.db.query("events").collect());
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.type === "whatsapp_click")).toBe(true);
    expect(events.every((e) => e.commerceId === commerceId)).toBe(true);
  });

  test("does not deduplicate repeated clicks from the same anonymous visitor", async () => {
    const t = convexTest(schema, modules);
    const commerceId = await makeCommerce(t);

    await t.mutation(api.table.events.recordWhatsAppClick, {
      commerceId,
      visitorId: "anon-visitor-1",
    });
    await t.mutation(api.table.events.recordWhatsAppClick, {
      commerceId,
      visitorId: "anon-visitor-1",
    });

    const events = await t.run((ctx) => ctx.db.query("events").collect());
    expect(events).toHaveLength(2);
  });

  test("stores only opaque, non-personal fields (type, commerceId, timestamp, visitorId)", async () => {
    const t = convexTest(schema, modules);
    const commerceId = await makeCommerce(t);

    await t.mutation(api.table.events.recordWhatsAppClick, {
      commerceId,
      visitorId: "anon-visitor-1",
    });

    const events = await t.run((ctx) => ctx.db.query("events").collect());
    const event = events[0] as Record<string, unknown>;
    expect(Object.keys(event).sort()).toEqual([
      "_creationTime",
      "_id",
      "commerceId",
      "timestamp",
      "type",
      "visitorId",
    ]);
    expect(event.type).toBe("whatsapp_click");
    expect(event.visitorId).toBe("anon-visitor-1");
    expect(typeof event.timestamp).toBe("number");
  });
});

describe("recordVisit", () => {
  test("dedups the same visitor / same fiche / same day: N opens = 1 Visite", async () => {
    const t = convexTest(schema, modules);
    const { commerceId } = await makeCommerceWithOwner(t);

    for (let i = 0; i < 4; i++) {
      await t.mutation(api.table.events.recordVisit, {
        commerceId,
        visitorId: "anon-visitor-1",
      });
    }

    const visits = await visitEvents(t);
    expect(visits).toHaveLength(1);
    expect(visits[0].type).toBe("visit");
    expect(visits[0].visitorId).toBe("anon-visitor-1");
    expect(visits[0].commerceId).toBe(commerceId);
  });

  test("counts the same visitor on two different Bogota days as 2 Visites (midnight boundary in America/Bogota)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const t = convexTest(schema, modules);
      const { commerceId } = await makeCommerceWithOwner(t);

      // 2026-07-06 04:30 UTC = 2026-07-05 23:30 in America/Bogota (UTC-5).
      vi.setSystemTime(new Date(Date.UTC(2026, 6, 6, 4, 30)));
      await t.mutation(api.table.events.recordVisit, {
        commerceId,
        visitorId: "anon-visitor-1",
      });

      // 2026-07-06 05:30 UTC = 2026-07-06 00:30 in Bogota — next Bogota day,
      // yet the SAME UTC calendar day, so this only splits under a Bogota clock.
      vi.setSystemTime(new Date(Date.UTC(2026, 6, 6, 5, 30)));
      await t.mutation(api.table.events.recordVisit, {
        commerceId,
        visitorId: "anon-visitor-1",
      });

      expect(await visitEvents(t)).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  test("counts different visitors on the same fiche and day as separate Visites", async () => {
    const t = convexTest(schema, modules);
    const { commerceId } = await makeCommerceWithOwner(t);

    await t.mutation(api.table.events.recordVisit, {
      commerceId,
      visitorId: "anon-visitor-1",
    });
    await t.mutation(api.table.events.recordVisit, {
      commerceId,
      visitorId: "anon-visitor-2",
    });

    expect(await visitEvents(t)).toHaveLength(2);
  });

  test("excludes the Entrepreneur visiting their OWN fiche (no event)", async () => {
    const t = convexTest(schema, modules);
    const { commerceId, ownerId } = await makeCommerceWithOwner(t);

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.table.events.recordVisit, {
        commerceId,
        visitorId: "anon-owner",
      });

    expect(await visitEvents(t)).toHaveLength(0);
  });

  test("still counts the Entrepreneur on OTHER fiches (owner excluded only on their own)", async () => {
    const t = convexTest(schema, modules);
    const { ownerId } = await makeCommerceWithOwner(t, "owner-a@example.com");
    const { commerceId: otherFiche } = await makeCommerceWithOwner(
      t,
      "owner-b@example.com",
    );

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.table.events.recordVisit, {
        commerceId: otherFiche,
        visitorId: "anon-owner-a",
      });

    const visits = await visitEvents(t);
    expect(visits).toHaveLength(1);
    expect(visits[0].commerceId).toBe(otherFiche);
  });

  test("counts anonymous Visiteurs and logged-in Users (non-owner) alike", async () => {
    const t = convexTest(schema, modules);
    const { commerceId } = await makeCommerceWithOwner(t);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "user@example.com", role: "user" }),
    );

    // Anonymous Visiteur (no session).
    await t.mutation(api.table.events.recordVisit, {
      commerceId,
      visitorId: "anon-visitor-1",
    });
    // Logged-in User who is not the owner.
    await t
      .withIdentity({ subject: userId })
      .mutation(api.table.events.recordVisit, {
        commerceId,
        visitorId: "anon-visitor-2",
      });

    expect(await visitEvents(t)).toHaveLength(2);
  });

  test("stores only opaque, non-personal fields on a Visite (no personal data)", async () => {
    const t = convexTest(schema, modules);
    const { commerceId } = await makeCommerceWithOwner(t);

    await t.mutation(api.table.events.recordVisit, {
      commerceId,
      visitorId: "anon-visitor-1",
    });

    const event = (await visitEvents(t))[0] as Record<string, unknown>;
    expect(Object.keys(event).sort()).toEqual([
      "_creationTime",
      "_id",
      "commerceId",
      "timestamp",
      "type",
      "visitDay",
      "visitorId",
    ]);
    expect(event.visitorId).toBe("anon-visitor-1");
    expect(typeof event.timestamp).toBe("number");
  });
});
