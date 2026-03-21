import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not logged in. Please sign in first." }, { status: 401 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set in environment." }, { status: 500 });
    }

    const priceId = process.env.VENTUREOS_PRICE_ID?.trim();
    if (!priceId) {
      return NextResponse.json({ error: "VENTUREOS_PRICE_ID is not set in Vercel environment variables." }, { status: 500 });
    }

    const origin = req.headers.get("origin") || "https://my-platform-omega.vercel.app";

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
      success_url: `${origin}/?subscribed=1`,
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
      return NextResponse.json(
        { error: session.error?.message || "Failed to create Stripe checkout session." },
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
