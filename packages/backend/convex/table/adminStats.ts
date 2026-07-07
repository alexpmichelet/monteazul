import { query } from "../_generated/server";
import { aggregateGlobalStats, evolutionSeries } from "../lib/stats";
import { requireAdmin } from "../rbac";
import { statsPeriodValidator } from "./events";

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
 * contacted the most). The period selector ("Esta semana" / "Este mes" / "Todo")
 * range-scopes the gap-filled evolution series only; totals, ranking and estado
 * breakdown span the whole journal.
 */
export const globalStats = query({
  args: {
    period: statsPeriodValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const commerces = await ctx.db.query("commerces").collect();
    const events = await ctx.db.query("events").collect();

    const mappedEvents = events.map((event) => ({
      type: event.type,
      timestamp: event.timestamp,
      commerceId: event.commerceId,
    }));

    // Totals / ranking / estado breakdown are all-time (the granularity passed
    // here only shapes a series we discard); the displayed series is the
    // gap-filled, range-scoped one.
    const base = aggregateGlobalStats(
      commerces.map((commerce) => ({
        commerceId: commerce._id,
        name: commerce.name,
        estado: commerce.estado,
      })),
      mappedEvents,
      "month",
    );

    return {
      ...base,
      series: evolutionSeries(
        mappedEvents.map((e) => ({ type: e.type, timestamp: e.timestamp })),
        args.period,
        Date.now(),
      ),
    };
  },
});
