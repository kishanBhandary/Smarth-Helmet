import { auth } from "./auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isPublicRoute = ["/login", "/register", "/"].includes(nextUrl.pathname);
  const isPublicApiRoute = nextUrl.pathname.startsWith("/api/auth") || nextUrl.pathname === "/api/esp32/telemetry";

  // Secure API routes: Only allow public API routes to pass unauthenticated
  if (isApiRoute) {
    if (!isPublicApiRoute && !isLoggedIn) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    return;
  }

  // Redirect to dashboard if logged in and trying to access login/register/root pages
  if (isPublicRoute) {
    if (isLoggedIn && nextUrl.pathname !== "/") {
      return Response.redirect(new URL("/dashboard", nextUrl));
    }
    return;
  }

  // Redirect to login if not logged in and trying to access private pages
  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  return;
});

export const config = {
  // Protect all routes except static resources, _next, etc.
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
