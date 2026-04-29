import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip ALL middleware logic for API routes — webhooks (POST) must never be redirected
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const host = request.headers.get("host") ?? "";

  // Redirect non-www → www for non-API routes only
  if (host === "volcity.to") {
    const url = request.nextUrl.clone();
    url.host = "www.volcity.to";
    return NextResponse.redirect(url, { status: 308 });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() refreshes the session token if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Returning users on /start — redirect to dashboard if they already have a project
  if (user && pathname.startsWith("/start")) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    if (projects && projects.length > 0) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Protect /dashboard — redirect unauthenticated users to login
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Exclude static files, images, and ALL /api/ routes from middleware
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
