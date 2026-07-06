import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { commerceSearchText } from "./lib/commerce";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

/** Insert a minimal publicado Commerce to attach Contact WhatsApp events to. */
async function makeCommerce(
  t: ReturnType<typeof convexTest>,
): Promise<Id<"commerces">> {
  const ownerId = await t.run((ctx) =>
    ctx.db.insert("users", { email: "owner@example.com", role: "entreprise" }),
  );
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
