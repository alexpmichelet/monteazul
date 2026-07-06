"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

import { getVisitorId } from "@/lib/visitor-id";
import { notifyWhatsAppRedirect } from "./whatsapp-toast";

export type WhatsAppContactTarget = {
  commerceId: Id<"commerces">;
  name: string;
};

/**
 * Wires a Contact WhatsApp: shows the « Redirigiendo a WhatsApp de {nom}… »
 * toast and records a `whatsapp_click` Événement server-side — then the caller
 * performs the actual `wa.me` navigation.
 *
 * The recording is strictly fire-and-forget: neither a synchronous throw nor an
 * async rejection can block or abort the redirect. Contact prime sur la stat
 * (ADR-0001) — the visitor must always reach WhatsApp, even if tracking is down
 * or slow.
 */
export function useWhatsAppContact() {
  const recordClick = useMutation(api.table.events.recordWhatsAppClick);

  return useCallback(
    ({ commerceId, name }: WhatsAppContactTarget) => {
      notifyWhatsAppRedirect(name);
      void (async () => {
        try {
          await recordClick({ commerceId, visitorId: getVisitorId() });
        } catch {
          // Redirect happens regardless — the click is lost, not the contact.
        }
      })();
    },
    [recordClick],
  );
}
