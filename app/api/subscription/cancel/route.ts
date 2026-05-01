import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, current_period_end")
      .eq("user_id", user.id)
      .single();

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ error: "No active subscription found." }, { status: 404 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: "Stripe not configured." }, { status: 500 });

    const params = new URLSearchParams({ cancel_at_period_end: "true" });
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${sub.stripe_subscription_id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2024-06-20",
      },
      body: params.toString(),
    });

    const result = await res.json();
    if (result?.error) {
      return NextResponse.json({ error: result.error.message || "Failed to cancel." }, { status: 400 });
    }

    const periodEnd = result.current_period_end
      ? new Date(result.current_period_end * 1000).toISOString()
      : sub.current_period_end;

    return NextResponse.json({ success: true, cancel_at: periodEnd });
  } catch (err: any) {
    console.error("[subscription/cancel] error:", err);
    return NextResponse.json({ error: err?.message || "Unexpected error." }, { status: 500 });
  }
}
