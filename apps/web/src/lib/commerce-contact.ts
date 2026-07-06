/**
 * Pure formatting helpers for a Commerce's contact channels, shared by the
 * public detail screen (and reusable by the cards). Kept free of React and
 * Convex so they can be unit-tested in isolation.
 *
 * The WhatsApp number is stored as exactly 10 digits without the country code
 * (see the backend CONTEXT.md glossary / spec §4). Colombia's country code is
 * `57`.
 */

const COLOMBIA_CODE = "57";

/**
 * Prefilled Spanish message opened with the WhatsApp chat (spec §4). Matches
 * the Claude Design prototype wording.
 */
export const WHATSAPP_PREFILL = "Hola, te escribo desde el directorio de Monteazul";

/**
 * Formats a 10-digit WhatsApp number as « +57 XXX XXX XXXX » for display, like
 * the prototype's `phoneOf`. Defensive: an unexpected length is still prefixed
 * and grouped rather than throwing on imperfect data.
 */
export function formatColombianPhone(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, "");
  const groups = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6),
  ].filter((group) => group.length > 0);
  return `+57 ${groups.join(" ")}`;
}

/**
 * `wa.me` click-to-chat link with the prefilled message: country code 57 + the
 * 10-digit number + the URL-encoded Spanish greeting. The list cards and the
 * detail CTA record a Contact WhatsApp (see `useWhatsAppContact`) then send the
 * visitor here — the redirect always happens, even if tracking fails.
 */
export function whatsAppLink(
  whatsapp: string,
  message: string = WHATSAPP_PREFILL,
): string {
  return `https://wa.me/${COLOMBIA_CODE}${whatsapp}?text=${encodeURIComponent(message)}`;
}

/**
 * Normalises the stored Instagram value (a bare handle, an `@handle`, or a full
 * profile URL) into a display handle (`@handle`) and a canonical profile URL,
 * mirroring the prototype's `"@" + ig` / `instagram.com/ + ig` derivation.
 */
export function instagramLink(value: string): { handle: string; href: string } {
  const trimmed = value.trim();
  const fromUrl = trimmed.match(/instagram\.com\/([^/?#]+)/i);
  const raw = (fromUrl ? fromUrl[1] : trimmed).replace(/^@/, "").replace(/\/$/, "");
  return { handle: `@${raw}`, href: `https://instagram.com/${raw}` };
}
