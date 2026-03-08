import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ active: false, status: "unauthenticated" });
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("status, trial_end, current_period_end")
    .eq("user_id", user.id)
    .single();

  if (!data) {
    return NextResponse.json({ active: false, status: "none" });
  }

  const active = data.status === "active" || data.status === "trialing";
  return NextResponse.json({ active, status: data.status });
}
