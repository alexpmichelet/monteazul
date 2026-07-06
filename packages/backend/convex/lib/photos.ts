/**
 * Photo validation constants, shared by the backend photo mutations and the
 * back-office upload UI (« Mi negocio »). The directory is mobile-first: the
 * client compresses/resizes before upload, and the server refuses anything that
 * is not an image or exceeds the stored-blob size cap (defence in depth).
 */

/** Maximum accepted size of a stored photo blob, in megabytes. */
export const MAX_PHOTO_MB = 5;

/** Maximum accepted size of a stored photo blob, in bytes. */
export const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;

/**
 * True when a content type denotes an image (`image/*`). The back-office reads
 * it from `File.type`; the backend prefers the authoritative type recorded by
 * Convex storage and falls back to the client-declared one.
 */
export function isAllowedImageType(
  contentType: string | null | undefined,
): boolean {
  return typeof contentType === "string" && contentType.startsWith("image/");
}
