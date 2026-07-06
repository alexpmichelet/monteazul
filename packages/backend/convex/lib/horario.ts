/**
 * Horario — a Commerce's structured activity hours (see the backend CONTEXT.md
 * glossary). Either weekly time ranges (`plages`) or a special "Disponible"
 * mode (con cita previa / sobre pedido). Pure module: no Convex imports, so it
 * runs identically in the backend and in the web client that paints the
 * real-time Abierto/Cerrado/Disponible badge.
 *
 * The type mirrors the Claude Design prototype. The reference timezone for the
 * open/closed computation is **America/Bogota** (UTC-5, no DST).
 */

export type Horario =
  | { mode: "plages"; days: string; from: number; to: number } // minutes-of-day
  | { mode: "disponible"; label: string }; // "con cita previa", "sobre pedido"

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

/**
 * Computes the current Abierto/Cerrado/Disponible state and Spanish texts for a
 * Horario, at `now` (defaults to the current instant), in America/Bogota.
 *
 * `plages`: abierto when `from <= now < to` (open minute inclusive, close minute
 * exclusive) — the exact boundary rule of the prototype.
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

  const minutes = bogotaMinutesOfDay(now);
  const isOpen = minutes >= horario.from && minutes < horario.to;

  return isOpen
    ? {
        state: "abierto",
        short: "Abierto",
        text: `Abierto ahora · cierra a las ${formatMinutes(horario.to)}`,
      }
    : {
        state: "cerrado",
        short: "Cerrado",
        text: `Cerrado · abre a las ${formatMinutes(horario.from)}`,
      };
}
