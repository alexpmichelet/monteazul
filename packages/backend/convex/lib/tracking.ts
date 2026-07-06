/**
 * Tracking helpers for the Événement journal (ADR-0001). Pure module — no
 * Convex imports — so the Visite dedup window can be unit-tested directly and
 * runs identically in the backend and, if ever needed, in the web client.
 *
 * A Visite is one unique visitor per fiche per **day**, the day computed in
 * America/Bogota (UTC-5, no DST) — the product's reference timezone, the same
 * one the Horario badge uses.
 */

const REFERENCE_TIMEZONE = "America/Bogota";

/**
 * Calendar-day key ("YYYY-MM-DD") of an instant, in America/Bogota. Two
 * Événements share a key iff they fall on the same Bogota day — which is
 * exactly the Visite dedup window: same visitor + same fiche + same key = one
 * Visite. Deriving the key from `formatToParts` (not string slicing) keeps it
 * locale-independent.
 */
export function bogotaDayKey(timestampMs: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REFERENCE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestampMs));
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}
