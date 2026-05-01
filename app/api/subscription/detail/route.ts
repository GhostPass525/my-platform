import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function detectPlan(priceId: string): { plan_id: string; billing_period: string } | null {
  const map: Record<string, { plan_id: string; billing_period: string }> = {
    [process.env.STRIPE_STARTER_MONTHLY_PRICE_ID?.trim() ?? "__none__"]: { plan_id: "starter", billing_period: "monthly" },
    [process.env.STRIPE_STARTER_YEARLY_PRICE_ID?.trim()  ?? "__none1__"]: { plan_id: "starter", billing_period: "annual" },
    [process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID?.trim() ?? "__none2__"]: { plan_id: "founder", billing_period: "monthly" },
    [process.env.STRIPE_FOUNDER_YEARLY_PRICE_ID?.trim()  ?? "__none3__"]: { plan_id: "founder", billing_period: "annual" },
    [process.env.STRIPE_EMPIRE_MONTHLY_PRICE_ID?.trim()  ?? "__none4__"]: { plan_id: "empire", billing_period: "monthly" },
    [process.env.STRIPE_EMPIRE_YEARLY_PRICE_ID?.trim()   ?? "__none5__"]: { plan_id: "empire", billing_period: "annual" },
  };
  return map[priceId] ?? null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ active: false, status: "unauthenticated" });

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, trial_end, current_period_end, stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .single();

    if (!sub) return NextResponse.json({ active: false, status: "none" });

    const active = sub.status === "active" || sub.status === "trialing";
    let plan_id: string | null = null;
    let billing_period: string | null = null;
    let amount: number | null = null;
    let cancel_at_period_end = false;
    let is_legacy = false;

    if (sub.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const res = await fetch(
          `https://api.stripe.com/v1/subscriptions/${sub.stripe_subscription_id}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
              "Stripe-Version": "2024-06-20",
            },
          }
        );
        if (res.ok) {
          const stripeSub = await res.json();
          const priceId: string = stripeSub?.items?.data?.[0]?.price?.id ?? "";
          const unitAmount: number = stripeSub?.items?.data?.[0]?.price?.unit_amount ?? 0;
          const interval: string = stripeSub?.items?.data?.[0]?.price?.recurring?.interval ?? "month";
          cancel_at_period_end = stripeSub?.cancel_at_period_end ?? false;

          if (priceId) {
            const detected = detectPlan(priceId);
            if (detected) {
              plan_id = detected.plan_id;
              billing_period = detected.billing_period;
            } else {
              is_legacy = true;
              plan_id = "legacy";
              billing_period = interval === "year" ? "annual" : "monthly";
            }
          }
          amount = unitAmount ? unitAmount / 100 : null;
        }
      } catch (e) {
        console.warn("[subscription/detail] Stripe fetch failed:", e);
      }
    }

    return NextResponse.json({
      active,
      status: sub.status,
      plan_id,
      billing_period,
      amount,
      is_legacy,
      cancel_at_period_end,
      trial_end: sub.trial_end,
      current_period_end: sub.current_period_end,
      stripe_customer_id: sub.stripe_customer_id,
      stripe_subscription_id: sub.stripe_subscription_id,
    });
  } catch (err: any) {
    console.error("[subscription/detail] error:", err);
    return NextResponse.json({ active: false, status: "error" }, { status: 500 });
  }
}
