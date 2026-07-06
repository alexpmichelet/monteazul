/**
 * Human-readable summary of a Commerce's structured Horario, shared by every
 * back-office surface that renders a fiche (the Entrepreneur's « Mi negocio »
 * and the Super admin's approval queue / management screens). Mirrors the domain
 * model in `packages/backend/CONTEXT.md`: weekly ranges (« plages ») or the
 * special « Disponible » mode.
 */

export type HorarioValue =
  | { mode: "plages"; days: string; from: number; to: number }
  | { mode: "disponible"; label: string };

/** Minutes-of-day → `H:MM`. */
function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** One-line Spanish summary of a Horario, or « Sin definir » when absent. */
export function horarioSummary(
  horario: HorarioValue | undefined | null,
): string {
  if (!horario) return "Sin definir";
  if (horario.mode === "disponible") {
    return `Disponible · ${horario.label}`;
  }
  return `${horario.days} · ${formatMinutes(horario.from)}–${formatMinutes(
    horario.to,
  )}`;
}
