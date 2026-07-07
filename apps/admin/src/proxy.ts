import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

// Convex Auth wraps the app so the session cookie is available in SSR and route
// handlers. Route protection and post-login navigation live in the client
// guards (both AdminGuard and EntrepreneurGuard send an anonymous caller to the
// single Spanish login, /acceso) and the auth forms. The middleware itself
// stays a pass-through so it never fights those redirects — a previous version
// bounced authenticated users to a non-existent "/dashboard" route (404).
export default convexAuthNextjsMiddleware();

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
