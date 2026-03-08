import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback error:", error.message);
      return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
    }
  } else {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
