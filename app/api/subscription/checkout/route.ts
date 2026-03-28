import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectId: string | null = body?.projectId ?? null;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not logged in. Please sign in first." }, { status: 401 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set in environment." }, { status: 500 });
    }

    const priceId = process.env.VOLCITY_PRICE_ID?.trim();
    if (!priceId) {
      return NextResponse.json({ error: "VOLCITY_PRICE_ID is not set in Vercel environment variables." }, { status: 500 });
    }

    // Diagnostic: log key prefix (safe — only first 20 chars, never the full key)
    const keyPrefix = secretKey.slice(0, 20);
    const keyMode = secretKey.startsWith("sk_live") ? "LIVE" : secretKey.startsWith("sk_test") ? "TEST" : "UNKNOWN";
    console.log(`[subscription/checkout] STRIPE key mode: ${keyMode}, prefix: ${keyPrefix}...`);
    console.log(`[subscription/checkout] price ID: ${priceId}`);
    console.log(`[subscription/checkout] price ID mode hint: ${priceId.includes("_test_") ? "TEST price" : "LIVE price (no _test_ in ID)"}`);

    if (keyMode === "TEST" && !priceId.includes("_test_")) {
      console.error("[subscription/checkout] MODE MISMATCH: using TEST key but price looks like a LIVE price");
    }
    if (keyMode === "LIVE" && priceId.includes("_test_")) {
      console.error("[subscription/checkout] MODE MISMATCH: using LIVE key but price looks like a TEST price");
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://volcity.to";

    // Create Stripe checkout session via direct REST API call (avoids SDK connection issues)
    const params = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "payment_method_types[0]": "card",
      "subscription_data[trial_period_days]": "7",
      "subscription_data[trial_settings][end_behavior][missing_payment_method]": "cancel",
      "subscription_data[metadata][userId]": user.id,
      payment_method_collection: "always",
      success_url: `${origin}/builder?${projectId ? `project=${projectId}&` : ""}subscribed=1`,
      cancel_url: `${origin}/`,
      "metadata[userId]": user.id,
      "metadata[type]": "platform_subscription",
    });

    if (user.email) {
      params.set("customer_email", user.email);
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2024-06-20",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok || !session.url) {
      const stripeError = session.error?.message || "Failed to create Stripe checkout session.";
      console.error(`[subscription/checkout] Stripe error: ${stripeError} (key mode: ${keyMode}, price: ${priceId})`);
      return NextResponse.json(
        { error: `${stripeError} [key: ${keyMode}, price: ${priceId}]` },
        { status: 500 }
      );
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
