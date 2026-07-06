import { ConvexError } from "convex/values";

/**
 * User-facing message for an error thrown by a Convex call.
 *
 * A `ConvexError` carries a message the backend already localized — return it.
 * Anything else (a network failure, or an auth provider rejecting credentials,
 * which Convex surfaces as an opaque non-`ConvexError`) is not safe to show
 * raw, so callers pass an explicit fallback instead of a generic
 * "Unknown error occurred".
 */
export function getConvexErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again.",
): string {
  return error instanceof ConvexError
    ? (error.data as { message: string }).message
    : fallback;
}
