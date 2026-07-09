import type { Id } from "@packages/backend/convex/_generated/dataModel";

/**
 * Client-side photo optimisation for the « Mi negocio » vitrine. The directory
 * is consumed on mobile, so before uploading we downscale to a sensible longest
 * edge and re-encode as JPEG — cutting multi-megabyte phone photos down to a
 * lightweight image. The backend still validates type and size (defence in
 * depth); this just keeps stored blobs small and fast to serve.
 */

/** Longest-edge cap of an optimised photo, in pixels (mobile-first). */
export const PHOTO_MAX_DIMENSION = 1600;

/** JPEG quality of the re-encoded photo (0–1). */
const OUTPUT_QUALITY = 0.82;

/**
 * Downscale + re-encode an image File to an optimised JPEG Blob. Falls back to
 * the original File when the browser cannot decode/encode it or when the result
 * would not be smaller. Never throws for a decodable image.
 */
export async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    // White matte so a transparent PNG does not turn black once flattened.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/jpeg", OUTPUT_QUALITY),
    );
    if (blob && blob.size < file.size) {
      return blob;
    }
    return file;
  } catch {
    return file;
  }
}

/** A blob stored in Convex, as the fiche-creation mutations expect it. */
export type UploadedPhoto = {
  storageId: Id<"_storage">;
  contentType: string;
};

/**
 * Compress + POST one picked image to a Convex upload URL. Shared by the forms
 * that create a fiche WITH photos (entrepreneur wizard, admin seeded account):
 * both pick files locally and only upload at submission. Throws a Spanish,
 * user-safe error when the upload fails.
 */
export async function uploadCompressedPhoto(
  getUploadUrl: () => Promise<string>,
  file: File,
): Promise<UploadedPhoto> {
  const blob = await compressImage(file);
  const contentType = blob.type || file.type;
  const uploadUrl = await getUploadUrl();
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!response.ok) {
    throw new Error(`No se pudo subir "${file.name}".`);
  }
  const { storageId } = (await response.json()) as {
    storageId: Id<"_storage">;
  };
  return { storageId, contentType };
}
