import { defineTable } from "convex/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * The two kinds of tracking Événement journaled per Commerce (see CONTEXT.md
 * and ADR-0001). `whatsapp_click` = a Contact WhatsApp, recorded here.
 * `visit` is journaled by a later slice — its shape is fixed now so the journal
 * has a single, stable schema.
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
};

export const events = defineTable(documentSchema)
  .index("by_commerce", ["commerceId"])
  .index("by_commerce_type", ["commerceId", "type"]);

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
