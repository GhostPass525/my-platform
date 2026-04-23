import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCachedMentorContext } from "@/lib/mentor/contextCache";
import { buildGreeting } from "@/lib/mentor/systemPrompt";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { greeting: "Hi — tell me what you want to build." },
        { status: 200 }
      );
    }

    const ctx = await getCachedMentorContext(user.id);
    const greeting = buildGreeting(ctx);

    return NextResponse.json({ greeting });
  } catch (err) {
    console.error("[mentor/greeting] error:", err);
    // Graceful fallback — never let a context error break the dashboard
    return NextResponse.json({
      greeting: "What are you working on today? I'm here to help.",
    });
  }
}
