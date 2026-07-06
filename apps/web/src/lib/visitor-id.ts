/**
 * Opaque anonymous visitor id, persisted in localStorage. It carries NO
 * personal data — it only lets the tracking journal (ADR-0001) attribute
 * Événements to a device: dedup Visites by anonymous id, and tag each Contact
 * WhatsApp. Call it only in the browser (click handlers); it returns "" during
 * SSR so it never touches `window` on the server.
 */

export const VISITOR_ID_STORAGE_KEY = "mz-visitor-id";

function generateVisitorId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  return `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * Returns the visitor's opaque token, creating and persisting one on first use.
 * If localStorage is unavailable (private mode, disabled), it still returns a
 * fresh token so Contact WhatsApp recording keeps working — just without
 * cross-visit persistence.
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (existing) return existing;
    const id = generateVisitorId();
    window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, id);
    return id;
  } catch {
    return generateVisitorId();
  }
}
