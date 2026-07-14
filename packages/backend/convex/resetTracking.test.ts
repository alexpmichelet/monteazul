import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { commerceSearchText } from "./lib/commerce";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function insertCommerce(
  t: ReturnType<typeof convexTest>,
  name: string,
): Promise<Id<"commerces">> {
  const ownerId = await t.run((ctx) =>
    ctx.db.insert("users", { email: `${name}@example.com`, role: "entreprise" }),
  );
  return await t.run((ctx) =>
    ctx.db.insert("commerces", {
      name,
      category: "Tecnología",
      description: "Descripción.",
      searchText: commerceSearchText({
        name,
        category: "Tecnología",
        description: "Descripción.",
      }),
      whatsapp: "3001234567",
      photos: [],
      resides: "Resido en Monteazul",
      estado: "publicado",
      ownerId,
    }),
  );
}

describe("resetTracking — limpieza de lanzamiento", () => {
  test("vacía TODO el journal (los tres tipos de Événement) sin tocar fichas ni favoritos", async () => {
    const t = convexTest(schema, modules);
    const a = await insertCommerce(t, "FichaA");
    const b = await insertCommerce(t, "FichaB");

    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("events", {
        type: "visit",
        commerceId: a,
        timestamp: now,
        visitorId: "anon-1",
        visitDay: "2026-07-12",
      });
      await ctx.db.insert("events", {
        type: "whatsapp_click",
        commerceId: a,
        timestamp: now,
        visitorId: "anon-1",
      });
      await ctx.db.insert("events", {
        type: "instagram_click",
        commerceId: b,
        timestamp: now,
        visitorId: "anon-2",
      });
      const user = await ctx.db.insert("users", {
        email: "fan@example.com",
        role: "user",
      });
      await ctx.db.insert("favorites", { userId: user, commerceId: b });
    });

    const result = await t.mutation(internal.resetTracking.resetTracking, {});
    expect(result).toEqual({ deleted: 3 });

    await t.run(async (ctx) => {
      expect(await ctx.db.query("events").collect()).toEqual([]);
      // Fiches and Favoris are untouched — only the metrics reset to 0.
      expect(await ctx.db.get(a)).not.toBeNull();
      expect(await ctx.db.get(b)).not.toBeNull();
      expect((await ctx.db.query("favorites").collect()).length).toBe(1);
    });
  });
});
