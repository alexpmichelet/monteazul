import { query } from "../_generated/server";
import { aggregateGlobalStats } from "../lib/stats";
import { requireAdmin } from "../rbac";
import { statsGranularityValidator } from "./events";

/**
 * Site-wide statistics for the Super admin (story #15) — the back-office
 * dashboard reserved to the `admin` role. Reuses the #14 aggregation module
 * (`aggregateGlobalStats` over `aggregateEvents`), so the global totals are the
 * sum of the per-commerce Estadísticas each Entrepreneur sees, and the evolution
 * series is their per-bucket sum. Every metric is an aggregation computed AT READ
 * from the Événement journal — NEVER a stored counter (ADR-0001).
 *
 * Adds two admin-only views: the count of Commerces per Estado, and the
 * WhatsApp-contacts leaderboard (the monetisation pitch — which fiches get
 * contacted the most). The period selector (day/week/month) re-buckets the
 * evolution series only; totals and ranking span the whole journal.
 */
export const globalStats = query({
  args: {
    granularity: statsGranularityValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const commerces = await ctx.db.query("commerces").collect();
    const events = await ctx.db.query("events").collect();

    return aggregateGlobalStats(
      commerces.map((commerce) => ({
        commerceId: commerce._id,
        name: commerce.name,
        estado: commerce.estado,
      })),
      events.map((event) => ({
        type: event.type,
        timestamp: event.timestamp,
        commerceId: event.commerceId,
      })),
      args.granularity,
    );
  },
});
