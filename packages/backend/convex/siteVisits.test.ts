import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

describe("recordSiteVisit — ingresos a la plataforma", () => {
  test("cuenta una sola vez por dispositivo y día (recargas = no-op), anónimo", async () => {
    const t = convexTest(schema, modules);

    // Anonymous caller, repeated opens the same Bogota day.
    await t.mutation(api.table.siteVisits.recordSiteVisit, {
      visitorId: "device-1",
    });
    await t.mutation(api.table.siteVisits.recordSiteVisit, {
      visitorId: "device-1",
    });
    await t.mutation(api.table.siteVisits.recordSiteVisit, {
      visitorId: "device-1",
    });
    // A different device the same day counts separately.
    await t.mutation(api.table.siteVisits.recordSiteVisit, {
      visitorId: "device-2",
    });

    const rows = await t.run((ctx) => ctx.db.query("siteVisits").collect());
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.visitorId))).toEqual(
      new Set(["device-1", "device-2"]),
    );
    // No personal data: only the opaque token, a timestamp and the day bucket.
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual([
        "_creationTime",
        "_id",
        "timestamp",
        "visitDay",
        "visitorId",
      ]);
    }
  });

  test("el mismo dispositivo otro día cuenta de nuevo", async () => {
    const t = convexTest(schema, modules);
    // Seed yesterday's Ingreso directly (the mutation always stamps "today").
    await t.run(async (ctx) => {
      await ctx.db.insert("siteVisits", {
        timestamp: Date.now() - 24 * 60 * 60 * 1000,
        visitorId: "device-1",
        visitDay: "2020-01-01",
      });
    });

    await t.mutation(api.table.siteVisits.recordSiteVisit, {
      visitorId: "device-1",
    });

    const rows = await t.run((ctx) => ctx.db.query("siteVisits").collect());
    expect(rows).toHaveLength(2);
  });
});

describe("globalStats — siteTraffic", () => {
  async function makeAdmin(t: ReturnType<typeof convexTest>): Promise<Id<"users">> {
    return await t.run((ctx) =>
      ctx.db.insert("users", { email: "a@example.com", role: "admin" }),
    );
  }

  test("expone el total y una serie de ingresos, sin alterar las métricas existentes", async () => {
    const t = convexTest(schema, modules);
    const admin = await makeAdmin(t);

    await t.mutation(api.table.siteVisits.recordSiteVisit, {
      visitorId: "device-1",
    });
    await t.mutation(api.table.siteVisits.recordSiteVisit, {
      visitorId: "device-2",
    });

    const stats = await t
      .withIdentity({ subject: admin })
      .query(api.table.adminStats.globalStats, { period: "week" });

    expect(stats.siteTraffic.total).toBe(2);
    // Gap-filled daily series over the week; today's bucket carries both.
    expect(stats.siteTraffic.series.length).toBeGreaterThanOrEqual(2);
    expect(
      stats.siteTraffic.series.reduce((sum, p) => sum + p.count, 0),
    ).toBe(2);
    // The per-fiche journal stays untouched: an Ingreso is NOT a Visita.
    expect(stats.totals).toEqual({
      visits: 0,
      whatsappContacts: 0,
      instagramClicks: 0,
    });
  });
});
