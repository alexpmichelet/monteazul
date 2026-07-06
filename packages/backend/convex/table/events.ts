import { getAuthUserId } from "@convex-dev/auth/server";
import { defineTable } from "convex/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { bogotaDayKey } from "../lib/tracking";

/**
 * The two kinds of tracking Événement journaled per Commerce (see CONTEXT.md
 * and ADR-0001). `visit` = a Visite (one unique visitor per fiche per day),
 * `whatsapp_click` = a Contact WhatsApp (raw, one per click).
 */
export const eventTypeValidator = v.union(
  v.literal("visit"),
  v.literal("whatsapp_click"),
);

/**
 * Événement — a timestamped entry of the tracking journal, always attached to a
 * Commerce (see CONTEXT.md). The product's statistics (totals, day/week/month
 * series) are aggregations over these rows — NEVER incremented counters
 * (ADR-0001). No personal visitor data is ever stored: `visitorId` is an opaque
 * anonymous token only.
 */
const documentSchema = {
  type: eventTypeValidator,
  commerceId: v.id("commerces"),
  // Server-side event time (ms epoch). Aggregations read this to build the
  // day/week/month series that back the monetisation metrics.
  timestamp: v.number(),
  // Opaque anonymous visitor id (localStorage on the client). Carries NO
  // personal data — it only lets the journal dedup visits and tag contacts.
  visitorId: v.string(),
  // Set on `visit` events only: the America/Bogota calendar day ("YYYY-MM-DD")
  // the Visite belongs to. It is a derived dedup bucket, not personal data —
  // it backs the `by_visit_dedup` index so a Visite is at most one per
  // (visitor, fiche, Bogota day). `whatsapp_click` events leave it undefined.
  visitDay: v.optional(v.string()),
};

export const events = defineTable(documentSchema)
  .index("by_commerce", ["commerceId"])
  .index("by_commerce_type", ["commerceId", "type"])
  // Visite dedup: a concrete `visitDay` only ever matches `visit` events.
  .index("by_visit_dedup", ["visitorId", "commerceId", "visitDay"]);

/**
 * Records one Contact WhatsApp — a `whatsapp_click` Événement — for a Commerce.
 * RAW, never deduplicated (each click is a real contact intention, ADR-0001):
 * N clicks create N events. Called fire-and-forget by the public annuaire right
 * before the `wa.me` redirect; if it fails or is slow, the redirect still
 * happens (contact prime sur la stat). Stores only an opaque anonymous visitor
 * id — no personal data.
 */
export const recordWhatsAppClick = mutation({
  args: {
    commerceId: v.id("commerces"),
    visitorId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("events", {
      type: "whatsapp_click",
      commerceId: args.commerceId,
      timestamp: Date.now(),
      visitorId: args.visitorId,
    });
    return null;
  },
});

/**
 * Records a Visite — a `visit` Événement — for a Commerce, DEDUPLICATED to at
 * most one per (visitor, fiche, day), the day computed in America/Bogota
 * (ADR-0001). Repeated opens the same Bogota day are no-ops; a first open the
 * next Bogota day is a new Visite.
 *
 * The Entrepreneur visiting their OWN fiche is excluded (authenticated session
 * === the fiche's owner → no event). Anonymous Visiteurs and logged-in Users
 * both count; only the owner is excluded, and only on their own fiche. Called
 * fire-and-forget when the public detail page opens. Stores only an opaque
 * anonymous visitor id and a derived day bucket — no personal data.
 */
export const recordVisit = mutation({
  args: {
    commerceId: v.id("commerces"),
    visitorId: v.string(),
  },
  handler: async (ctx, args) => {
    const commerce = await ctx.db.get(args.commerceId);
    if (!commerce) return null;

    // Exclude the Entrepreneur on their own fiche. A Visiteur (no session) and
    // a logged-in User who is not the owner both fall through and count.
    const userId = await getAuthUserId(ctx);
    if (userId !== null && userId === commerce.ownerId) return null;

    const now = Date.now();
    const visitDay = bogotaDayKey(now);

    // Dedup: one Visite per (visitor, fiche, Bogota day). A concrete visitDay
    // only ever matches prior `visit` events, never `whatsapp_click` ones.
    const existing = await ctx.db
      .query("events")
      .withIndex("by_visit_dedup", (q) =>
        q
          .eq("visitorId", args.visitorId)
          .eq("commerceId", args.commerceId)
          .eq("visitDay", visitDay),
      )
      .first();
    if (existing) return null;

    await ctx.db.insert("events", {
      type: "visit",
      commerceId: args.commerceId,
      timestamp: now,
      visitorId: args.visitorId,
      visitDay,
    });
    return null;
  },
});
