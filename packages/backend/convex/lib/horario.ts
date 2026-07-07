/**
 * Horario — a Commerce's structured activity hours (see the backend CONTEXT.md
 * glossary). Either a WEEKLY schedule (`semanal`) of per-day time windows — a
 * day can have zero, one or several windows (e.g. a split lunch/dinner service)
 * — or a special "Disponible" mode (con cita previa / sobre pedido). Pure
 * module: no Convex imports, so it runs identically in the backend and in the
 * web client that paints the real-time Abierto/Cerrado/Disponible badge.
 *
 * The reference timezone for the open/closed computation is **America/Bogota**
 * (UTC-5, no DST).
 */

/** One open window on a given weekday. `dayOfWeek`: 0 = Sunday … 6 = Saturday
 *  (JS `Date.getDay()` convention). `from`/`to`: minutes-of-day in [0, 1440],
 *  `from < to` (no cross-midnight window). */
export type ServiceWindow = {
  dayOfWeek: number;
  from: number;
  to: number;
};

export type HorarioSemanal = { mode: "semanal"; windows: ServiceWindow[] };
export type HorarioDisponible = { mode: "disponible"; label: string };
export type Horario = HorarioSemanal | HorarioDisponible;

/** Real-time opening state of a Commerce, matching the design-system badge. */
export type CommerceStatusState = "abierto" | "cerrado" | "disponible";

export type CommerceStatusResult = {
  state: CommerceStatusState;
  /** Short badge label: "Abierto" | "Cerrado" | "Disponible". */
  short: string;
  /** Full Spanish status line, e.g. "Abierto ahora · cierra a las 16:00". */
  text: string;
};

const REFERENCE_TIMEZONE = "America/Bogota";

/** Spanish weekday names indexed by `dayOfWeek` (0 = Sunday … 6 = Saturday). */
export const WEEKDAY_LABELS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** Display order for the weekly schedule: Monday first (es-CO convention). */
export const WEEKDAY_ORDER_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;

const BOGOTA_WEEKDAY = new Intl.DateTimeFormat("en-US", {
  timeZone: REFERENCE_TIMEZONE,
  weekday: "short",
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Formats a minutes-of-day value as `H:MM` (hour not zero-padded), like the prototype. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${String(mins).padStart(2, "0")}`;
}

/** Minutes elapsed since midnight in the America/Bogota reference timezone. */
export function bogotaMinutesOfDay(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REFERENCE_TIMEZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/** Weekday (0 = Sunday … 6 = Saturday) of an instant in America/Bogota. */
export function bogotaDayOfWeek(now: Date): number {
  return WEEKDAY_INDEX[BOGOTA_WEEKDAY.format(now)] ?? 0;
}

/**
 * The next opening after `nowMinutes` on `todayDow`, as a `{ dayOffset, from }`
 * (0 = later today, 1 = tomorrow, …), or `null` when the schedule is empty.
 * Scans up to 7 days forward and wraps around the week.
 */
function nextOpening(
  windows: ServiceWindow[],
  todayDow: number,
  nowMinutes: number,
): { dayOffset: number; from: number } | null {
  for (let offset = 0; offset <= 6; offset += 1) {
    const day = (todayDow + offset) % 7;
    const froms = windows
      .filter((w) => w.dayOfWeek === day && (offset > 0 || w.from > nowMinutes))
      .map((w) => w.from)
      .sort((a, b) => a - b);
    if (froms.length > 0) return { dayOffset: offset, from: froms[0] };
  }
  return null;
}

/**
 * Computes the current Abierto/Cerrado/Disponible state and Spanish texts for a
 * Horario, at `now` (defaults to the current instant), in America/Bogota.
 *
 * `semanal`: abierto when the current Bogota weekday has a window with
 * `from <= now < to` (open minute inclusive, close minute exclusive). Otherwise
 * cerrado, with the next opening ("abre a las …", "abre mañana a las …" or
 * "abre el <día> a las …"). An empty schedule is simply "Cerrado".
 */
export function commerceStatus(
  horario: Horario,
  now: Date = new Date(),
): CommerceStatusResult {
  if (horario.mode === "disponible") {
    return {
      state: "disponible",
      short: "Disponible",
      text: `Disponible · ${horario.label}`,
    };
  }

  const windows = horario.windows;
  if (windows.length === 0) {
    return { state: "cerrado", short: "Cerrado", text: "Cerrado" };
  }

  const dow = bogotaDayOfWeek(now);
  const minutes = bogotaMinutesOfDay(now);

  const openNow = windows.find(
    (w) => w.dayOfWeek === dow && w.from <= minutes && minutes < w.to,
  );
  if (openNow) {
    return {
      state: "abierto",
      short: "Abierto",
      text: `Abierto ahora · cierra a las ${formatMinutes(openNow.to)}`,
    };
  }

  const next = nextOpening(windows, dow, minutes);
  if (!next) {
    return { state: "cerrado", short: "Cerrado", text: "Cerrado" };
  }

  const at = `a las ${formatMinutes(next.from)}`;
  let when: string;
  if (next.dayOffset === 0) when = at;
  else if (next.dayOffset === 1) when = `mañana ${at}`;
  else {
    const day = WEEKDAY_LABELS_ES[(dow + next.dayOffset) % 7].toLowerCase();
    when = `el ${day} ${at}`;
  }
  return { state: "cerrado", short: "Cerrado", text: `Cerrado · abre ${when}` };
}

/** One row of the weekly schedule for the detail « Horario » card. */
export type ScheduleRow = { day: string; hours: string };

/**
 * The 7 weekly rows (Monday first) for the detail « Horario » card. Each day
 * joins its windows ("8:00 – 12:00 · 14:00 – 18:00"), or reads "Cerrado" when
 * the day has none.
 */
export function weeklyScheduleRows(windows: ServiceWindow[]): ScheduleRow[] {
  return WEEKDAY_ORDER_MONDAY_FIRST.map((dow) => {
    const dayWindows = windows
      .filter((w) => w.dayOfWeek === dow)
      .sort((a, b) => a.from - b.from);
    const hours =
      dayWindows.length > 0
        ? dayWindows
            .map((w) => `${formatMinutes(w.from)} – ${formatMinutes(w.to)}`)
            .join(" · ")
        : "Cerrado";
    return { day: WEEKDAY_LABELS_ES[dow], hours };
  });
}
