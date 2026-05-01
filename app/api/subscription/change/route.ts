import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// Canonical amounts in cents for comparison (monthly-equivalent for ranking)
const PLAN_RANK: Record<string, number> = { starter: 1, founder: 2, empire: 3 };

function getPriceId(planId: string, billing: string): string | undefined {
  const map: Record<string, Record<string, string | undefined>> = {
    starter: {
      monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID?.trim(),
      annual:  process.env.STRIPE_STARTER_YEARLY_PRICE_ID?.trim(),
    },
    founder: {
      monthly: process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID?.trim(),
      annual:  process.env.STRIPE_FOUNDER_YEARLY_PRICE_ID?.trim(),
    },
    empire: {
      monthly: process.env.STRIPE_EMPIRE_MONTHLY_PRICE_ID?.trim(),
      annual:  process.env.STRIPE_EMPIRE_YEARLY_PRICE_ID?.trim(),
    },
  };
  return map[planId]?.[billing];
}

function detectCurrentPlan(priceId: string): { plan_id: string; billing: string } | null {
  const map: Record<string, { plan_id: string; billing: string }> = {
    [process.env.STRIPE_STARTER_MONTHLY_PRICE_ID?.trim() ?? "__a__"]: { plan_id: "starter", billing: "monthly" },
    [process.env.STRIPE_STARTER_YEARLY_PRICE_ID?.trim()  ?? "__b__"]: { plan_id: "starter", billing: "annual" },
    [process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID?.trim() ?? "__c__"]: { plan_id: "founder", billing: "monthly" },
    [process.env.STRIPE_FOUNDER_YEARLY_PRICE_ID?.trim()  ?? "__d__"]: { plan_id: "founder", billing: "annual" },
    [process.env.STRIPE_EMPIRE_MONTHLY_PRICE_ID?.trim()  ?? "__e__"]: { plan_id: "empire",  billing: "monthly" },
    [process.env.STRIPE_EMPIRE_YEARLY_PRICE_ID?.trim()   ?? "__f__"]: { plan_id: "empire",  billing: "annual" },
  };
  return map[priceId] ?? null;
}

async function stripeGet(path: string, key: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${key}`, "Stripe-Version": "2024-06-20" },
  });
  return res.json();
}

async function stripePost(path: string, params: URLSearchParams, key: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    body: params.toString(),
  });
  return res.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const planId: string = body?.planId;
    const billing: string = body?.billing === "annual" ? "annual" : "monthly";

    if (!planId || !PLAN_RANK[planId]) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, current_period_end")
      .eq("user_id", user.id)
      .single();

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ error: "No active subscription found." }, { status: 404 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: "Stripe not configured." }, { status: 500 });

    const newPriceId = getPriceId(planId, billing);
    if (!newPriceId) {
      return NextResponse.json({ error: `No price configured for ${planId}/${billing}.` }, { status: 500 });
    }

    // Fetch current Stripe subscription
    const stripeSub = await stripeGet(`subscriptions/${sub.stripe_subscription_id}`, secretKey);
    if (!stripeSub?.id) {
      return NextResponse.json({ error: "Could not fetch subscription from Stripe." }, { status: 500 });
    }

    const currentItemId: string = stripeSub.items?.data?.[0]?.id;
    const currentPriceId: string = stripeSub.items?.data?.[0]?.price?.id ?? "";
    const currentPeriodEnd: number = stripeSub.current_period_end ?? 0;

    // Detect current plan for upgrade/downgrade comparison
    const currentDetected = detectCurrentPlan(currentPriceId);
    const currentRank = currentDetected ? (PLAN_RANK[currentDetected.plan_id] ?? 0) : 0;
    const newRank = PLAN_RANK[planId] ?? 0;

    // Same plan + same billing = no-op
    if (currentPriceId === newPriceId) {
      return NextResponse.json({ error: "You're already on this plan." }, { status: 400 });
    }

    const isUpgrade = newRank > currentRank || (newRank === currentRank && billing === "annual" && currentDetected?.billing === "monthly");

    if (isUpgrade) {
      // Upgrade immediately with proration
      const params = new URLSearchParams({
        [`items[0][id]`]: currentItemId,
        [`items[0][price]`]: newPriceId,
        proration_behavior: "create_prorations",
        "payment_behavior": "default_incomplete",
      });
      const updated = await stripePost(`subscriptions/${sub.stripe_subscription_id}`, params, secretKey);
      if (updated?.error) {
        return NextResponse.json({ error: updated.error.message || "Failed to upgrade." }, { status: 400 });
      }

      const planNames: Record<string, string> = { starter: "Starter", founder: "Founder", empire: "Empire" };
      return NextResponse.json({
        success: true,
        effective: "now",
        message: `Upgraded to ${planNames[planId]}! A prorated charge will appear on your next invoice.`,
      });
    } else {
      // Downgrade — schedule at period end via subscription schedule
      // Step 1: create schedule from current subscription
      const scheduleParams = new URLSearchParams({ from_subscription: sub.stripe_subscription_id });
      const schedule = await stripePost("subscription_schedules", scheduleParams, secretKey);

      if (schedule?.error) {
        // Fallback: apply immediately without proration if schedule fails
        console.warn("[subscription/change] Schedule creation failed, applying immediately:", schedule.error);
        const params = new URLSearchParams({
          [`items[0][id]`]: currentItemId,
          [`items[0][price]`]: newPriceId,
          proration_behavior: "none",
        });
        await stripePost(`subscriptions/${sub.stripe_subscription_id}`, params, secretKey);
        const effectiveDate = new Date(currentPeriodEnd * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        const planNames: Record<string, string> = { starter: "Starter", founder: "Founder", empire: "Empire" };
        return NextResponse.json({
          success: true,
          effective: new Date(currentPeriodEnd * 1000).toISOString(),
          message: `Your plan will change to ${planNames[planId]} on ${effectiveDate}.`,
        });
      }

      // Step 2: update schedule with two phases (current → new at period end)
      const phaseParams = new URLSearchParams({
        "phases[0][items][0][price]": currentPriceId,
        "phases[0][items][0][quantity]": "1",
        "phases[0][end_date]": String(currentPeriodEnd),
        "phases[1][items][0][price]": newPriceId,
        "phases[1][items][0][quantity]": "1",
        "phases[1][iterations]": "1",
        end_behavior: "release",
      });

      const updatedSchedule = await stripePost(`subscription_schedules/${schedule.id}`, phaseParams, secretKey);
      if (updatedSchedule?.error) {
        console.error("[subscription/change] Schedule update failed:", updatedSchedule.error);
        return NextResponse.json({ error: updatedSchedule.error.message || "Failed to schedule downgrade." }, { status: 400 });
      }

      const effectiveDate = new Date(currentPeriodEnd * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const planNames: Record<string, string> = { starter: "Starter", founder: "Founder", empire: "Empire" };
      return NextResponse.json({
        success: true,
        effective: new Date(currentPeriodEnd * 1000).toISOString(),
        message: `Your plan will change to ${planNames[planId]} on ${effectiveDate}. You'll keep your current features until then.`,
      });
    }
  } catch (err: any) {
    console.error("[subscription/change] error:", err);
    return NextResponse.json({ error: err?.message || "Unexpected error." }, { status: 500 });
  }
}
