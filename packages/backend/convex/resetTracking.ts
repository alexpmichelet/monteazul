import { internalMutation } from "./_generated/server";

/**
 * Launch-day cleanup (Ronda 10): wipe the WHOLE tracking journal — every
 * Événement of every fiche (visits, Contactos por WhatsApp, Clics a
 * Instagram). Metrics are aggregations computed AT READ from this journal
 * (ADR-0001, never stored counters), so an empty journal IS zeroed counters
 * everywhere: per-fiche Estadísticas, admin dashboard totals, ranking and
 * evolution charts. Fiches, accounts and Favoris are untouched.
 *
 * CLI-only (internalMutation — unreachable from the apps). Run it right at
 * the official launch, not before (later test sessions would re-accumulate):
 *
 *   npx convex run resetTracking:resetTracking '{}' --prod
 *
 * Returns the number of deleted Événements.
 */
export const resetTracking = internalMutation({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
    }
    return { deleted: events.length };
  },
});
