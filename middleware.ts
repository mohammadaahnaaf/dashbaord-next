import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const userRole = request.cookies.get("userRole")?.value;
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicPaths = ["/", "/track"];

  // Allow public paths (exact match or paths starting with public path + /)
  if (
    publicPaths.some((path) => {
      if (pathname === path) return true;
      if (pathname.startsWith(path + "/")) return true;
      return false;
    })
  ) {
    return NextResponse.next();
  }

  // Allow API routes (they handle their own authentication)
  if (pathname.startsWith("/api/")) {
    // Optionally, you can add role-based checks for specific API endpoints here
    // For now, API routes are allowed through
    return NextResponse.next();
  }

  // Check if user is authenticated for protected routes
  if (!userRole) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Role-based access control
  const moderatorRestrictedPaths = ["/settings", "/batches/create"];

  if (
    userRole === "moderator" &&
    moderatorRestrictedPaths.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.redirect(new URL("/orders", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
