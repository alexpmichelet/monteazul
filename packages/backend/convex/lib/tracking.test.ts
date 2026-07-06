import { describe, expect, test } from "vitest";
import { bogotaDayKey } from "./tracking";

/**
 * The Visite dedup window is the calendar day in America/Bogota (UTC-5, no
 * DST) — the product's reference timezone (ADR-0001). These tests pin the day
 * boundary to Bogota midnight, NOT UTC midnight.
 */
describe("bogotaDayKey", () => {
  test("returns the America/Bogota calendar day as YYYY-MM-DD", () => {
    // 2026-07-06 12:00 UTC = 07:00 in Bogota → same calendar day.
    expect(bogotaDayKey(Date.UTC(2026, 6, 6, 12, 0))).toBe("2026-07-06");
  });

  test("rolls the day at Bogota midnight (UTC-5), not at UTC midnight", () => {
    // 04:30 UTC is still 23:30 of the previous day in Bogota.
    expect(bogotaDayKey(Date.UTC(2026, 6, 6, 4, 30))).toBe("2026-07-05");
    // 05:00 UTC is exactly Bogota midnight → the new day starts.
    expect(bogotaDayKey(Date.UTC(2026, 6, 6, 5, 0))).toBe("2026-07-06");
  });

  test("two instants within the same Bogota day share the same key", () => {
    const morning = bogotaDayKey(Date.UTC(2026, 6, 6, 14, 0)); // 09:00 Bogota
    const evening = bogotaDayKey(Date.UTC(2026, 6, 7, 3, 0)); // 22:00 Bogota (still July 6)
    expect(morning).toBe("2026-07-06");
    expect(evening).toBe("2026-07-06");
    expect(morning).toBe(evening);
  });
});
