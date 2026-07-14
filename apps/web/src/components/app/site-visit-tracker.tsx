"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { bogotaDayKey } from "@packages/backend/convex/lib/tracking";

import { getVisitorId } from "@/lib/visitor-id";

/** localStorage guard: the Bogota day already reported by this device. */
const STORAGE_KEY = "monteazul-site-visit-day";

/**
 * Records one Ingreso a la plataforma per device per Bogota day (Ronda 11).
 * Mounted once in the root layout, so ANY entry page counts (home, a shared
 * fiche link, /guardados…). A localStorage day guard keeps repeat opens from
 * even reaching the server; the server dedups authoritatively anyway (same
 * Bogota-day rule), so a cleared storage or incognito window can at worst
 * send a no-op. Strictly fire-and-forget and anonymous (opaque visitor id) —
 * a tracking failure must never affect the page.
 */
export function SiteVisitTracker() {
  const recordSiteVisit = useMutation(api.table.siteVisits.recordSiteVisit);

  React.useEffect(() => {
    const today = bogotaDayKey(Date.now());
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === today) return;
    } catch {
      // Storage unavailable (privacy mode): fall through, the server dedups.
    }
    void (async () => {
      try {
        await recordSiteVisit({ visitorId: getVisitorId() });
        window.localStorage.setItem(STORAGE_KEY, today);
      } catch {
        // Lost beacon — never surface tracking errors to the visitor.
      }
    })();
  }, [recordSiteVisit]);

  return null;
}
