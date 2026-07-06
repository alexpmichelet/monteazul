/**
 * Statistics aggregation module for the Événement journal (ADR-0001). Pure
 * module — no Convex imports — so the totals and day/week/month series can be
 * unit-tested directly against event fixtures.
 *
 * Every metric is an aggregation computed AT READ from the journal; the product
 * NEVER stores incremented counters (a counter loses the history that makes the
 * week/month series possible, ADR-0001).
 *
 * All bucketing is anchored to America/Bogota (UTC-5, no DST) — the product's
 * reference timezone (the same one the Visite dedup and the Horario badge use).
 * Because Bogota has no daylight saving, a fixed −5h offset reproduces its wall
 * clock exactly, which lets the week/month math stay simple and deterministic.
 */

import { ESTADOS, type Estado } from "./commerce";
import { bogotaDayKey } from "./tracking";

/** Bucketing granularity backing the Estadísticas period selector. */
export type StatsGranularity = "day" | "week" | "month";

/** The only fields the aggregation reads from an Événement. */
export type AggregatableEvent = {
  type: "visit" | "whatsapp_click";
  timestamp: number;
};

/** One point of the evolution series: a bucket and its two metric counts. */
export type StatsBucket = {
  /** Bucket key in America/Bogota (see `bogotaBucketKey`). */
  bucket: string;
  /** Visites in the bucket. */
  visits: number;
  /** Contactos por WhatsApp in the bucket. */
  whatsappContacts: number;
};

/** Totals + evolution series returned to the Estadísticas page. */
export type CommerceStats = {
  totals: { visits: number; whatsappContacts: number };
  series: StatsBucket[];
};

const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * A `Date` whose UTC calendar fields read as the America/Bogota wall clock of
 * the given instant. Valid because Bogota is a fixed UTC−5 with no DST.
 */
function bogotaWallClock(timestampMs: number): Date {
  return new Date(timestampMs - BOGOTA_OFFSET_MS);
}

/**
 * Bucket key of an instant for a granularity, in America/Bogota:
 * - `day`   → "YYYY-MM-DD" (the Bogota calendar day),
 * - `week`  → "YYYY-MM-DD" of the **Monday** starting the Bogota week,
 * - `month` → "YYYY-MM" (the Bogota year-month).
 *
 * Keys sort lexicographically in chronological order, and roll exactly at
 * Bogota midnight — so a Visite at 23h50 Bogota lands on the right day even
 * though it is already the next UTC day (ADR-0001).
 */
export function bogotaBucketKey(
  timestampMs: number,
  granularity: StatsGranularity,
): string {
  if (granularity === "day") {
    // Reuse the exact same day definition as the Visite dedup window.
    return bogotaDayKey(timestampMs);
  }

  const wall = bogotaWallClock(timestampMs);
  if (granularity === "month") {
    return `${wall.getUTCFullYear()}-${pad2(wall.getUTCMonth() + 1)}`;
  }

  // week: back up to the Monday of the Bogota week (Mon=0 … Sun=6).
  const daysSinceMonday = (wall.getUTCDay() + 6) % 7;
  const monday = new Date(wall.getTime() - daysSinceMonday * DAY_MS);
  return `${monday.getUTCFullYear()}-${pad2(monday.getUTCMonth() + 1)}-${pad2(
    monday.getUTCDate(),
  )}`;
}

/**
 * Aggregate a Commerce's Événements into totals and a chronological evolution
 * series bucketed by `granularity` in America/Bogota. Empty input yields zero
 * totals and an empty series. The series is sorted ascending by bucket key.
 */
export function aggregateEvents(
  events: AggregatableEvent[],
  granularity: StatsGranularity,
): CommerceStats {
  const totals = { visits: 0, whatsappContacts: 0 };
  const buckets = new Map<string, StatsBucket>();

  for (const event of events) {
    const key = bogotaBucketKey(event.timestamp, granularity);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { bucket: key, visits: 0, whatsappContacts: 0 };
      buckets.set(key, bucket);
    }
    if (event.type === "visit") {
      totals.visits += 1;
      bucket.visits += 1;
    } else {
      totals.whatsappContacts += 1;
      bucket.whatsappContacts += 1;
    }
  }

  const series = [...buckets.values()].sort((a, b) =>
    a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0,
  );

  return { totals, series };
}

// ===========================================================================
// Site-wide aggregation for the Super admin dashboard (story #15).
//
// Built on the SAME `aggregateEvents` primitive as the per-commerce
// Estadísticas (#14): the global totals and evolution series are the aggregation
// over EVERY Commerce's Événements, which is by construction the sum of the
// per-commerce totals and the per-bucket sum of the per-commerce series. Two
// admin-only views are added on top — the count of Commerces per Estado and the
// WhatsApp-contacts leaderboard (the monetisation pitch).
//
// Like the entrepreneur page, the period selector (day/week/month) only
// re-buckets the evolution series; the totals and the ranking are over the whole
// tracked journal (a leaderboard is a scalar per Commerce, not a series).
// ===========================================================================

/** The fields the global aggregation reads from a Commerce. */
export type CommerceForStats = {
  commerceId: string;
  name: string;
  estado: Estado;
};

/** An Événement tagged with the Commerce it belongs to. */
export type GlobalAggregatableEvent = AggregatableEvent & {
  commerceId: string;
};

/** One Commerce's line of the WhatsApp-contacts leaderboard. */
export type CommerceContactRank = {
  commerceId: string;
  name: string;
  whatsappContacts: number;
};

/** Count of Commerces in a given Estado. */
export type EstadoCount = {
  estado: Estado;
  count: number;
};

/** Everything the Super admin dashboard renders, aggregated AT READ. */
export type GlobalStats = {
  totals: { visits: number; whatsappContacts: number };
  series: StatsBucket[];
  estadoBreakdown: EstadoCount[];
  ranking: CommerceContactRank[];
};

/**
 * Aggregate the whole product's Événements + Commerces into the Super admin
 * dashboard's numbers, bucketed by `granularity` in America/Bogota:
 *
 * - `totals` / `series` — the site-wide aggregation over every Événement (the
 *   sum of the per-commerce Estadísticas of #14, by construction);
 * - `estadoBreakdown` — the count of Commerces per Estado, in the canonical
 *   Estado order, including the zero-count ones;
 * - `ranking` — every Commerce ranked by its WhatsApp contacts (descending),
 *   ties broken by name then id so the order is deterministic; zero-contact
 *   fiches are kept, last.
 */
export function aggregateGlobalStats(
  commerces: CommerceForStats[],
  events: GlobalAggregatableEvent[],
  granularity: StatsGranularity,
): GlobalStats {
  // Totals + evolution series over every Commerce at once. Aggregating all
  // Événements together yields the same numbers as summing the per-commerce
  // aggregations bucket by bucket — that IS the consistency guarantee.
  const global = aggregateEvents(events, granularity);

  // Per-commerce WhatsApp-contact tallies for the leaderboard.
  const contactsByCommerce = new Map<string, number>();
  for (const commerce of commerces) {
    contactsByCommerce.set(commerce.commerceId, 0);
  }
  for (const event of events) {
    if (event.type !== "whatsapp_click") continue;
    const current = contactsByCommerce.get(event.commerceId);
    // Only rank Commerces we know about (orphan Événements of a removed fiche
    // still count in the site-wide totals, but cannot be ranked).
    if (current === undefined) continue;
    contactsByCommerce.set(event.commerceId, current + 1);
  }

  const ranking: CommerceContactRank[] = commerces
    .map((commerce) => ({
      commerceId: commerce.commerceId,
      name: commerce.name,
      whatsappContacts: contactsByCommerce.get(commerce.commerceId) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.whatsappContacts - a.whatsappContacts ||
        (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) ||
        (a.commerceId < b.commerceId ? -1 : a.commerceId > b.commerceId ? 1 : 0),
    );

  const estadoBreakdown: EstadoCount[] = ESTADOS.map((estado) => ({
    estado,
    count: commerces.filter((commerce) => commerce.estado === estado).length,
  }));

  return {
    totals: global.totals,
    series: global.series,
    estadoBreakdown,
    ranking,
  };
}
