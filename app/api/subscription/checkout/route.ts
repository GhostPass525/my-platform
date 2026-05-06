import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function stripePost(path: string, params: URLSearchParams, secretKey: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    body: params.toString(),
  });
  return res.json();
}

async function stripeGet(path: string, secretKey: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": "2024-06-20",
    },
  });
  return res.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectId: string | null = body?.projectId ?? null;
    const planId: string = body?.planId ?? "starter";
    const billingPeriod: string = body?.billing === "annual" ? "annual" : "monthly";

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not logged in. Please sign in first." }, { status: 401 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set in environment." }, { status: 500 });
    }

    // Resolve price ID — plan + billing period specific, falls back to legacy VOLCITY_PRICE_ID
    const priceIdMap: Record<string, Record<string, string | undefined>> = {
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
    const priceId = priceIdMap[planId]?.[billingPeriod];
    if (!priceId) {
      return NextResponse.json({ error: `No price ID configured for ${planId}/${billingPeriod}. Set the corresponding STRIPE_PRICE_* env vars in Vercel.` }, { status: 500 });
    }

    const keyMode = secretKey.startsWith("sk_live") ? "LIVE" : secretKey.startsWith("sk_test") ? "TEST" : "UNKNOWN";
    console.log(`[subscription/checkout] key mode: ${keyMode}, price: ${priceId}`);

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── Step 1: Find or create Stripe customer, save to Supabase ──
    // Check if we already have a stripe_customer_id for this user
    const { data: existingSub } = await serviceSupabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let stripeCustomerId: string | null = existingSub?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      // Search Stripe for an existing customer by email first
      const searchResult = await stripeGet(
        `customers?email=${encodeURIComponent(user.email!)}&limit=1`,
        secretKey
      );
      if (searchResult?.data?.[0]?.id) {
        stripeCustomerId = searchResult.data[0].id;
        console.log("[subscription/checkout] Found existing Stripe customer", { stripeCustomerId, userId: user.id });
      } else {
        // Create a new Stripe customer
        const customerParams = new URLSearchParams({ email: user.email!, "metadata[userId]": user.id });
        const customer = await stripePost("customers", customerParams, secretKey);
        if (!customer?.id) {
          console.error("[subscription/checkout] Failed to create Stripe customer", { customer });
          return NextResponse.json({ error: "Failed to create billing account." }, { status: 500 });
        }
        stripeCustomerId = customer.id;
        console.log("[subscription/checkout] Created Stripe customer", { stripeCustomerId, userId: user.id });
      }

      // Save the link immediately — this is the critical write that makes everything else work
      const { error: upsertError } = await serviceSupabase
        .from("subscriptions")
        .upsert(
          { user_id: user.id, stripe_customer_id: stripeCustomerId, status: "incomplete", updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (upsertError) {
        console.error("[subscription/checkout] Failed to save stripe_customer_id", { upsertError, userId: user.id });
      } else {
        console.log("[subscription/checkout] Saved stripe_customer_id to subscriptions", { stripeCustomerId, userId: user.id });
      }
    }

    // ── Step 1b: Check if customer already has an active/trialing subscription ──
    // Skip creating a new checkout if one already exists — prevents duplicate charges.
    try {
      const existingSubsRes = await stripeGet(
        `subscriptions?customer=${stripeCustomerId}&status=all&limit=5`,
        secretKey
      );
      const activeSub = existingSubsRes?.data?.find(
        (s: { status: string }) => s.status === "active" || s.status === "trialing"
      );
      if (activeSub) {
        console.log("[subscription/checkout] Customer already has active/trialing subscription — syncing and returning", {
          stripeCustomerId,
          subId: activeSub.id,
          status: activeSub.status,
          userId: user.id,
        });
        // Ensure Supabase row reflects reality
        const trialEnd = activeSub.trial_end ? new Date(activeSub.trial_end * 1000).toISOString() : null;
        const rawPeriodEnd = activeSub.current_period_end as number | undefined;
        const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null;
        await serviceSupabase.from("subscriptions").upsert(
          {
            user_id: user.id,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: activeSub.id,
            status: activeSub.status,
            trial_end: trialEnd,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        // Send user straight to builder — already subscribed
        const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://volcity.to";
        const successUrl = `${origin}/builder?${projectId ? `project=${projectId}&` : ""}subscribed=1`;
        return NextResponse.json({ url: successUrl, alreadySubscribed: true });
      }
    } catch (checkErr: any) {
      console.warn("[subscription/checkout] Could not check existing subscriptions:", checkErr?.message);
    }

    // ── Step 2: Create checkout session using the known customer ID ──
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://volcity.to";

    const params = new URLSearchParams({
      mode: "subscription",
      customer: stripeCustomerId!,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "payment_method_types[0]": "card",
      "subscription_data[trial_period_days]": "7",
      "subscription_data[trial_settings][end_behavior][missing_payment_method]": "cancel",
      "subscription_data[metadata][userId]": user.id,
      payment_method_collection: "always",
      success_url: `${origin}/builder?${projectId ? `project=${projectId}&` : ""}subscribed=1&plan=${planId}&billing=${billingPeriod}`,
      cancel_url: `${origin}/builder${projectId ? `?project=${projectId}` : ""}`,
      "metadata[userId]": user.id,
      "metadata[type]": "platform_subscription",
      "metadata[planId]": planId,
      "metadata[billing]": billingPeriod,
      ...(projectId ? { "metadata[projectId]": projectId } : {}),
    });

    const session = await stripePost("checkout/sessions", params, secretKey);

    if (!session?.url) {
      const stripeError = session?.error?.message || "Failed to create Stripe checkout session.";
      console.error(`[subscription/checkout] Stripe error: ${stripeError}`);
      return NextResponse.json({ error: stripeError }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Subscription checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
