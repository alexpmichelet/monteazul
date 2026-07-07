/**
 * Human-readable summary of a Commerce's structured Horario, shared by every
 * back-office surface that renders a fiche (the Entrepreneur's « Mi negocio »
 * and the Super admin's approval queue / management screens). Mirrors the domain
 * model in `packages/backend/convex/lib/horario`: a weekly per-day schedule
 * (« semanal ») or the special « Disponible » mode.
 */

export type ServiceWindow = { dayOfWeek: number; from: number; to: number };

export type HorarioValue =
  | { mode: "semanal"; windows: ServiceWindow[] }
  | { mode: "disponible"; label: string };

/** Minutes-of-day → `H:MM`. */
function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** Abbreviated Spanish day names, indexed by `dayOfWeek` (0 = Sunday). */
const DAY_ABBR = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

/**
 * One-line Spanish summary of a Horario, or « Sin definir » when absent. A
 * `semanal` schedule groups consecutive days that share the same windows
 * ("Lun–Vie 8:00–17:00 · Sáb 9:00–13:00"); a day with no window is skipped.
 */
export function horarioSummary(
  horario: HorarioValue | undefined | null,
): string {
  if (!horario) return "Sin definir";
  if (horario.mode === "disponible") {
    return `Disponible · ${horario.label}`;
  }

  const windows = horario.windows;
  if (windows.length === 0) return "Cerrado";

  // Hours string per day (Monday-first), or null when the day is closed.
  const dayHours = MONDAY_FIRST.map((dow) => {
    const dayWindows = windows
      .filter((w) => w.dayOfWeek === dow)
      .sort((a, b) => a.from - b.from);
    return dayWindows.length > 0
      ? dayWindows
          .map((w) => `${formatMinutes(w.from)}–${formatMinutes(w.to)}`)
          .join("/")
      : null;
  });

  // Group consecutive open days that share the exact same hours.
  const groups: { start: number; end: number; hours: string }[] = [];
  for (let i = 0; i < MONDAY_FIRST.length; i += 1) {
    const hours = dayHours[i];
    if (hours === null) continue;
    const last = groups[groups.length - 1];
    if (last && last.hours === hours && last.end === i - 1) {
      last.end = i;
    } else {
      groups.push({ start: i, end: i, hours });
    }
  }

  return groups
    .map((g) => {
      const startDay = DAY_ABBR[MONDAY_FIRST[g.start]];
      const days =
        g.start === g.end
          ? startDay
          : `${startDay}–${DAY_ABBR[MONDAY_FIRST[g.end]]}`;
      return `${days} ${g.hours}`;
    })
    .join(" · ");
}
