import { describe, expect, test } from "vitest";
import {
  aggregateEvents,
  aggregateGlobalStats,
  bogotaBucketKey,
  evolutionSeries,
  type GlobalAggregatableEvent,
} from "./stats";

/**
 * The statistics aggregation module (ADR-0001): totals and day/week/month time
 * series computed AT READ from the Événement journal — never from stored
 * counters. All bucketing is anchored to America/Bogota (UTC-5, no DST), the
 * product's reference timezone, so a Visite at 23h50 in Bogota lands on the
 * right day even though it is already the next UTC day.
 */

// Reference instants (ms epoch), with their known America/Bogota wall clock.
// 2026-07-05 is a Sunday, 2026-07-06 a Monday in Bogota.
const JUL6_11H = Date.UTC(2026, 6, 6, 16, 0); //     2026-07-06 11:00 Bogota (Mon)
const JUL5_2330 = Date.UTC(2026, 6, 6, 4, 30); //    2026-07-05 23:30 Bogota (Sun)
const JUL6_0000 = Date.UTC(2026, 6, 6, 5, 0); //     2026-07-06 00:00 Bogota (Mon)
const JUL5_2350 = Date.UTC(2026, 6, 6, 4, 50); //    2026-07-05 23:50 Bogota (Sun)
const JUL6_0010 = Date.UTC(2026, 6, 6, 5, 10); //    2026-07-06 00:10 Bogota (Mon)
const JUL31_2330 = Date.UTC(2026, 7, 1, 4, 30); //   2026-07-31 23:30 Bogota (Fri)
const AUG1_0000 = Date.UTC(2026, 7, 1, 5, 0); //     2026-08-01 00:00 Bogota (Sat)
const JUN15_11H = Date.UTC(2026, 5, 15, 16, 0); //   2026-06-15 11:00 Bogota

describe("bogotaBucketKey", () => {
  test("day bucket is the America/Bogota calendar day (YYYY-MM-DD)", () => {
    expect(bogotaBucketKey(JUL6_11H, "day")).toBe("2026-07-06");
  });

  test("day rolls at Bogota midnight, not UTC midnight (borne de période)", () => {
    // Both instants share the SAME UTC day (2026-07-06) yet straddle Bogota
    // midnight, so only a Bogota clock splits them.
    expect(bogotaBucketKey(JUL5_2330, "day")).toBe("2026-07-05");
    expect(bogotaBucketKey(JUL6_0000, "day")).toBe("2026-07-06");
  });

  test("month bucket is the Bogota year-month (YYYY-MM), rolling at Bogota midnight", () => {
    expect(bogotaBucketKey(JUL31_2330, "month")).toBe("2026-07");
    expect(bogotaBucketKey(AUG1_0000, "month")).toBe("2026-08");
  });

  test("week bucket is the Monday of the Bogota week (YYYY-MM-DD), rolling Sun→Mon", () => {
    // Sunday 2026-07-05 belongs to the week that started Monday 2026-06-29;
    // Monday 2026-07-06 opens the next week.
    expect(bogotaBucketKey(JUL5_2330, "week")).toBe("2026-06-29");
    expect(bogotaBucketKey(JUL6_0000, "week")).toBe("2026-07-06");
  });
});

describe("aggregateEvents", () => {
  test("totals count Visites and Contactos por WhatsApp separately", () => {
    const { totals } = aggregateEvents(
      [
        { type: "visit", timestamp: JUL6_11H },
        { type: "visit", timestamp: JUL6_11H },
        { type: "whatsapp_click", timestamp: JUL6_11H },
        { type: "whatsapp_click", timestamp: JUL6_11H },
        { type: "whatsapp_click", timestamp: JUL6_11H },
      ],
      "day",
    );
    expect(totals).toEqual({ visits: 2, whatsappContacts: 3, instagramClicks: 0 });
  });

  test("no events → zero totals and an empty series", () => {
    expect(aggregateEvents([], "day")).toEqual({
      totals: { visits: 0, whatsappContacts: 0, instagramClicks: 0 },
      series: [],
    });
  });

  test("day series splits a 23h50 vs 00h10 Bogota pair into the right two days", () => {
    const { series } = aggregateEvents(
      [
        { type: "visit", timestamp: JUL5_2350 },
        { type: "visit", timestamp: JUL6_0010 },
      ],
      "day",
    );
    expect(series).toEqual([
      { bucket: "2026-07-05", visits: 1, whatsappContacts: 0, instagramClicks: 0 },
      { bucket: "2026-07-06", visits: 1, whatsappContacts: 0, instagramClicks: 0 },
    ]);
  });

  test("day series is keyed by Bogota day and sorted ascending", () => {
    const { series } = aggregateEvents(
      [
        { type: "visit", timestamp: JUL6_0000 },
        { type: "whatsapp_click", timestamp: JUL6_0000 },
        { type: "visit", timestamp: JUL5_2330 },
      ],
      "day",
    );
    expect(series).toEqual([
      { bucket: "2026-07-05", visits: 1, whatsappContacts: 0, instagramClicks: 0 },
      { bucket: "2026-07-06", visits: 1, whatsappContacts: 1, instagramClicks: 0 },
    ]);
  });

  test("week series groups by the Monday of the Bogota week", () => {
    const { series } = aggregateEvents(
      [
        { type: "visit", timestamp: JUL5_2330 }, // week of 2026-06-29
        { type: "visit", timestamp: JUL6_0000 }, // week of 2026-07-06
        { type: "whatsapp_click", timestamp: JUL6_11H }, // week of 2026-07-06
      ],
      "week",
    );
    expect(series).toEqual([
      { bucket: "2026-06-29", visits: 1, whatsappContacts: 0, instagramClicks: 0 },
      { bucket: "2026-07-06", visits: 1, whatsappContacts: 1, instagramClicks: 0 },
    ]);
  });

  test("month series groups by the Bogota year-month across a month boundary", () => {
    const { series } = aggregateEvents(
      [
        { type: "visit", timestamp: JUL31_2330 }, // still July in Bogota
        { type: "whatsapp_click", timestamp: AUG1_0000 }, // August in Bogota
      ],
      "month",
    );
    expect(series).toEqual([
      { bucket: "2026-07", visits: 1, whatsappContacts: 0, instagramClicks: 0 },
      { bucket: "2026-08", visits: 0, whatsappContacts: 1, instagramClicks: 0 },
    ]);
  });
});

/**
 * The gap-filled evolution series backing the Estadísticas period selector.
 * `nowMs` is injected so these assertions are deterministic (the query passes
 * `Date.now()`). "Esta semana"/"Este mes" are daily ranges ending today; "Todo"
 * is monthly from the earliest event. Every bucket in range is emitted, zeros
 * included — that is what makes the chart draw a real curve.
 */
describe("evolutionSeries", () => {
  test("week: 7 gap-filled daily buckets ending today, zeros included", () => {
    const series = evolutionSeries(
      [
        { type: "visit", timestamp: JUL5_2330 }, // 2026-07-05
        { type: "visit", timestamp: JUL6_11H }, // 2026-07-06
        { type: "whatsapp_click", timestamp: JUL6_11H }, // 2026-07-06
      ],
      "week",
      JUL6_11H, // now = 2026-07-06 11:00 Bogota
    );
    expect(series).toEqual([
      { bucket: "2026-06-30", visits: 0, whatsappContacts: 0, instagramClicks: 0 },
      { bucket: "2026-07-01", visits: 0, whatsappContacts: 0, instagramClicks: 0 },
      { bucket: "2026-07-02", visits: 0, whatsappContacts: 0, instagramClicks: 0 },
      { bucket: "2026-07-03", visits: 0, whatsappContacts: 0, instagramClicks: 0 },
      { bucket: "2026-07-04", visits: 0, whatsappContacts: 0, instagramClicks: 0 },
      { bucket: "2026-07-05", visits: 1, whatsappContacts: 0, instagramClicks: 0 },
      { bucket: "2026-07-06", visits: 1, whatsappContacts: 1, instagramClicks: 0 },
    ]);
  });

  test("week: no events → 7 zero buckets (still a full range, not empty)", () => {
    const series = evolutionSeries([], "week", JUL6_11H);
    expect(series).toHaveLength(7);
    expect(series.every((p) => p.visits === 0 && p.whatsappContacts === 0)).toBe(
      true,
    );
    expect(series[0].bucket).toBe("2026-06-30");
    expect(series[6].bucket).toBe("2026-07-06");
  });

  test("month: 30 gap-filled daily buckets ending today", () => {
    const series = evolutionSeries(
      [{ type: "visit", timestamp: JUL6_11H }],
      "month",
      JUL6_11H,
    );
    expect(series).toHaveLength(30);
    expect(series[0].bucket).toBe("2026-06-07");
    expect(series[29].bucket).toBe("2026-07-06");
    expect(series[29]).toEqual({
      bucket: "2026-07-06",
      visits: 1,
      whatsappContacts: 0,
      instagramClicks: 0,
    });
  });

  test("all: monthly buckets from the earliest event to now, gap-filled", () => {
    const series = evolutionSeries(
      [
        { type: "visit", timestamp: JUN15_11H }, // 2026-06
        { type: "whatsapp_click", timestamp: JUL6_11H }, // 2026-07
      ],
      "all",
      JUL6_11H,
    );
    expect(series).toEqual([
      { bucket: "2026-06", visits: 1, whatsappContacts: 0, instagramClicks: 0 },
      { bucket: "2026-07", visits: 0, whatsappContacts: 1, instagramClicks: 0 },
    ]);
  });

  test("all: a single-month journal falls back to DAILY buckets so the curve can be traced (Ronda 5)", () => {
    const series = evolutionSeries(
      [
        { type: "visit", timestamp: JUL5_2330 }, // 2026-07-05
        { type: "whatsapp_click", timestamp: JUL6_11H }, // 2026-07-06
      ],
      "all",
      JUL6_11H,
    );
    // One month of data would be ONE monthly point — no line. Daily instead,
    // spanning at least the last 7 days (gap-filled), always ≥ 2 points.
    expect(series.length).toBeGreaterThanOrEqual(2);
    expect(series[0].bucket).toBe("2026-06-30");
    expect(series[series.length - 1]).toEqual({
      bucket: "2026-07-06",
      visits: 0,
      whatsappContacts: 1,
      instagramClicks: 0,
    });
    expect(series).toContainEqual({
      bucket: "2026-07-05",
      visits: 1,
      whatsappContacts: 0,
      instagramClicks: 0,
    });
  });

  test("all: no events → 7 daily zero buckets (a flat traced line, not a lone point)", () => {
    const series = evolutionSeries([], "all", JUL6_11H);
    expect(series).toHaveLength(7);
    expect(
      series.every(
        (p) =>
          p.visits === 0 && p.whatsappContacts === 0 && p.instagramClicks === 0,
      ),
    ).toBe(true);
    expect(series[0].bucket).toBe("2026-06-30");
    expect(series[6].bucket).toBe("2026-07-06");
  });
});

/**
 * The Super admin's site-wide aggregation (story #15). Built on the SAME
 * `aggregateEvents` module as the per-commerce Estadísticas (#14), so the global
 * totals are provably the sum of the per-commerce totals, and the evolution
 * series is the sum of the per-commerce series (aggregating all Événements at
 * once IS that per-bucket sum). Adds two admin-only views the entrepreneur page
 * has no need for: the count of Commerces per Estado and the WhatsApp-contacts
 * leaderboard (the monetisation pitch).
 */
describe("aggregateGlobalStats", () => {
  const A = "commerce_a";
  const B = "commerce_b";
  const C = "commerce_c";

  const commerces = [
    { commerceId: A, name: "Aromas", estado: "publicado" as const },
    { commerceId: B, name: "Bazar", estado: "publicado" as const },
    { commerceId: C, name: "Cafetería", estado: "suspendido" as const },
  ];

  function visit(commerceId: string): GlobalAggregatableEvent {
    return { type: "visit", commerceId, timestamp: JUL6_11H };
  }
  function contact(commerceId: string): GlobalAggregatableEvent {
    return { type: "whatsapp_click", commerceId, timestamp: JUL6_11H };
  }

  test("empty input → zero totals, empty series and leaderboard, all-zero estado breakdown", () => {
    const stats = aggregateGlobalStats([], [], "day");
    expect(stats.totals).toEqual({ visits: 0, whatsappContacts: 0, instagramClicks: 0 });
    expect(stats.series).toEqual([]);
    expect(stats.ranking).toEqual([]);
    expect(stats.estadoBreakdown).toEqual([
      { estado: "pendiente", count: 0 },
      { estado: "publicado", count: 0 },
      { estado: "suspendido", count: 0 },
    ]);
  });

  test("site-wide totals count every Commerce's Visites and Contactos por WhatsApp", () => {
    const stats = aggregateGlobalStats(
      commerces,
      [visit(A), visit(A), contact(A), visit(B), contact(B), contact(B)],
      "day",
    );
    expect(stats.totals).toEqual({ visits: 3, whatsappContacts: 3, instagramClicks: 0 });
  });

  test("global totals equal the sum of the per-commerce aggregations (consistency with #14)", () => {
    const events = [
      visit(A),
      contact(A),
      contact(A),
      visit(B),
      visit(B),
      contact(C),
    ];
    const global = aggregateGlobalStats(commerces, events, "day");

    // Re-derive per-commerce with the very module the entrepreneur page uses.
    const sum = { visits: 0, whatsappContacts: 0, instagramClicks: 0 };
    for (const c of commerces) {
      const perCommerce = aggregateEvents(
        events
          .filter((e) => e.commerceId === c.commerceId)
          .map((e) => ({ type: e.type, timestamp: e.timestamp })),
        "day",
      );
      sum.visits += perCommerce.totals.visits;
      sum.whatsappContacts += perCommerce.totals.whatsappContacts;
      sum.instagramClicks += perCommerce.totals.instagramClicks;
    }
    expect(global.totals).toEqual(sum);
  });

  test("ranking orders Commerces by WhatsApp contacts desc, keeping zero-contact fiches last", () => {
    const stats = aggregateGlobalStats(
      commerces,
      [
        contact(B),
        contact(B),
        contact(B), // Bazar: 3
        contact(A), // Aromas: 1
        // Cafetería: 0
      ],
      "day",
    );
    expect(stats.ranking).toEqual([
      { commerceId: B, name: "Bazar", whatsappContacts: 3, instagramClicks: 0 },
      { commerceId: A, name: "Aromas", whatsappContacts: 1, instagramClicks: 0 },
      { commerceId: C, name: "Cafetería", whatsappContacts: 0, instagramClicks: 0 },
    ]);
  });

  test("ranking breaks ties by name (ascending), deterministically", () => {
    const stats = aggregateGlobalStats(
      commerces,
      [contact(A), contact(B), contact(C)], // all tied at 1
      "day",
    );
    expect(stats.ranking.map((r) => r.name)).toEqual([
      "Aromas",
      "Bazar",
      "Cafetería",
    ]);
  });

  test("estado breakdown counts Commerces per Estado exactly, in the canonical order", () => {
    const stats = aggregateGlobalStats(
      [
        { commerceId: "1", name: "Uno", estado: "pendiente" },
        { commerceId: "2", name: "Dos", estado: "publicado" },
        { commerceId: "3", name: "Tres", estado: "publicado" },
        { commerceId: "4", name: "Cuatro", estado: "suspendido" },
        { commerceId: "5", name: "Cinco", estado: "publicado" },
      ],
      [],
      "day",
    );
    expect(stats.estadoBreakdown).toEqual([
      { estado: "pendiente", count: 1 },
      { estado: "publicado", count: 3 },
      { estado: "suspendido", count: 1 },
    ]);
  });

  test("global series is the per-bucket sum across Commerces, sorted ascending", () => {
    const stats = aggregateGlobalStats(
      commerces,
      [
        { type: "visit", commerceId: A, timestamp: JUL5_2330 }, // 2026-07-05
        { type: "visit", commerceId: B, timestamp: JUL6_0000 }, // 2026-07-06
        { type: "whatsapp_click", commerceId: A, timestamp: JUL6_11H }, // 2026-07-06
      ],
      "day",
    );
    expect(stats.series).toEqual([
      { bucket: "2026-07-05", visits: 1, whatsappContacts: 0, instagramClicks: 0 },
      { bucket: "2026-07-06", visits: 1, whatsappContacts: 1, instagramClicks: 0 },
    ]);
  });
});
