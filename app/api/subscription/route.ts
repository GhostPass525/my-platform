import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ active: false, status: "unauthenticated" });
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("status, trial_end, current_period_end, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.log("[subscription/check] Supabase query error", { userId: user.id, error });
    }

    if (!data) {
      console.log("[subscription/check] No subscription row found for user", { userId: user.id });
      return NextResponse.json({ active: false, status: "none" });
    }

    const active = data.status === "active" || data.status === "trialing";
    console.log("[subscription/check] Found subscription", { userId: user.id, status: data.status, active });
    return NextResponse.json({
      active,
      status: data.status,
      trial_end: data.trial_end,
      current_period_end: data.current_period_end,
      stripe_customer_id: data.stripe_customer_id,
    });
  } catch (err: any) {
    console.error("Subscription check error:", err);
    return NextResponse.json({ active: false, status: "error", error: err?.message }, { status: 500 });
  }
}
