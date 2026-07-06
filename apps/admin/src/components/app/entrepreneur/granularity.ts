/**
 * Period granularity for the Estadísticas page — mirrors the backend
 * `statsGranularityValidator` (day / week / month). Kept in a tiny module so
 * both the view and the evolution chart share one source of truth and one set
 * of Spanish labels.
 */

export type StatsGranularity = "day" | "week" | "month";

/** The period selector options, in display order, with their Spanish labels. */
export const PERIOD_OPTIONS: { value: StatsGranularity; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
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
 * in Spanish. `day`/`week` keys are "YYYY-MM-DD" (the week's Monday); `month`
 * keys are "YYYY-MM". Falls back to the raw key on any unexpected shape.
 */
export function formatBucketLabel(
  bucket: string,
  granularity: StatsGranularity,
): string {
  try {
    if (granularity === "month") {
      const date = new Date(`${bucket}-01T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return bucket;
      return MONTH_FORMAT.format(date);
    }
    const date = new Date(`${bucket}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return bucket;
    const label = DAY_FORMAT.format(date);
    return granularity === "week" ? `Sem. ${label}` : label;
  } catch {
    return bucket;
  }
}
