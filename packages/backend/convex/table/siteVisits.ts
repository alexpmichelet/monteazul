import { defineTable } from "convex/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { bogotaDayKey } from "../lib/tracking";

/**
 * Ingreso a la plataforma — one SITE-WIDE unique daily visitor (Ronda 11).
 * Independent of the per-fiche Événement journal: it counts people OPENING
 * the directory at all, deduplicated to one row per (device, Bogota day),
 * whatever page they land on and however many times they reload. Same
 * anonymity contract as the journal: `visitorId` is the opaque localStorage
 * token, no personal data ever. Additive metric — nothing here reads or
 * writes the existing `events` table.
 */
const documentSchema = {
  // Server-side event time (ms epoch) — the evolution series buckets read it.
  timestamp: v.number(),
  // Opaque anonymous visitor id (localStorage on the client).
  visitorId: v.string(),
  // The America/Bogota calendar day ("YYYY-MM-DD") backing the dedup: one
  // Ingreso at most per (visitor, Bogota day).
  visitDay: v.string(),
};

export const siteVisits = defineTable(documentSchema).index("by_dedup", [
  "visitorId",
  "visitDay",
]);

/**
 * Records one Ingreso a la plataforma, DEDUPLICATED to at most one per
 * (visitor, Bogota day): reloads and repeat opens the same day are no-ops; a
 * first open the next Bogota day counts again. Called fire-and-forget when
 * the public site mounts (the client also keeps a localStorage day guard so
 * most repeats never even reach the server). Anonymous callers welcome —
 * that is the whole point of the metric.
 */
export const recordSiteVisit = mutation({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const visitDay = bogotaDayKey(now);

    const existing = await ctx.db
      .query("siteVisits")
      .withIndex("by_dedup", (q) =>
        q.eq("visitorId", args.visitorId).eq("visitDay", visitDay),
      )
      .first();
    if (existing) return null;

    await ctx.db.insert("siteVisits", {
      timestamp: now,
      visitorId: args.visitorId,
      visitDay,
    });
    return null;
  },
});
