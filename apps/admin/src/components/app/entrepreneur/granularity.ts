/**
 * Period (range) for the Estadísticas evolution chart — mirrors the backend
 * `statsPeriodValidator` (week / month / all). Kept in a tiny module so both the
 * entrepreneur view, the admin global view and the chart share one source of
 * truth and one set of Spanish labels.
 *
 * The selector is a RANGE, not a bucket size: the backend returns a gap-filled
 * series (one point per bucket across the range, zeros included) so the chart
 * always draws a real curve. "Esta semana"/"Este mes" are daily ranges; "Todo"
 * is monthly.
 */

export type StatsPeriod = "week" | "month" | "all";

/** The period selector options, in display order, with their Spanish labels. */
export const PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "all", label: "Todo" },
];

const DAY_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const MONTH_FORMAT = new Intl.DateTimeFormat("es-CO", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Human label for a bucket key (as produced by the backend `bogotaBucketKey`),
 * in Spanish. The format follows the KEY SHAPE, not the period: "YYYY-MM" is a
 * month, "YYYY-MM-DD" a day — because "Todo" falls back to daily buckets when
 * the journal spans a single month (so the curve can be traced). Falls back to
 * the raw key on any unexpected shape.
 */
export function formatBucketLabel(bucket: string, _period: StatsPeriod): string {
  try {
    if (/^\d{4}-\d{2}$/.test(bucket)) {
      const date = new Date(`${bucket}-01T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return bucket;
      return MONTH_FORMAT.format(date);
    }
    const date = new Date(`${bucket}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return bucket;
    return DAY_FORMAT.format(date);
  } catch {
    return bucket;
  }
}
