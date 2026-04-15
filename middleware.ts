import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const pathname = req.nextUrl.pathname;

  // Never redirect API routes — Stripe (and other webhooks) don't follow redirects
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Redirect non-www to www for all other routes
  if (host === "volcity.to") {
    const url = req.nextUrl.clone();
    url.host = "www.volcity.to";
    return NextResponse.redirect(url, { status: 308 }); // 308 = permanent
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     * API routes are excluded inside the middleware function above (not here),
     * so they still run through middleware but immediately call next().
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
