"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { getVisitorId } from "@/lib/visitor-id";

/**
 * Records a Visite for an opened fiche: fires the `recordVisit` mutation once,
 * with the opaque anonymous visitor id, as soon as the Commerce id is known.
 *
 * Best-effort like the Contact WhatsApp recording — a synchronous throw or an
 * async rejection is swallowed so tracking never affects what the Visiteur
 * sees. The server deduplicates to one Visite per (visitor, fiche, Bogota day)
 * and excludes the Entrepreneur on their own fiche (ADR-0001), so re-renders or
 * repeat opens are harmless; the ref just avoids redundant calls per mount.
 *
 * Pass `null`/`undefined` while the fiche is loading or not found — no Visite is
 * recorded until a real Commerce id is available.
 */
export function useRecordVisit(
  commerceId: Id<"commerces"> | null | undefined,
): void {
  const recordVisit = useMutation(api.table.events.recordVisit);
  const recordedFor = useRef<Id<"commerces"> | null>(null);

  useEffect(() => {
    if (!commerceId || recordedFor.current === commerceId) return;
    recordedFor.current = commerceId;
    void (async () => {
      try {
        await recordVisit({ commerceId, visitorId: getVisitorId() });
      } catch {
        // Visite tracking is best-effort — never surfaced to the Visiteur.
      }
    })();
  }, [commerceId, recordVisit]);
}
