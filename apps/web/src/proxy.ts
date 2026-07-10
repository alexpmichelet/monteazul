import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isAuthRoute = createRouteMatcher([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/otp",
]);
// No middleware-protected routes: every signed-in page (e.g. /guardados)
// renders its own friendly signed-out state instead of a hard redirect.

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  // An already-signed-in visitor has nothing to do on the auth screens —
  // send them to the directory.
  if (isAuthRoute(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/");
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};