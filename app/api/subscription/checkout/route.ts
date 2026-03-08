import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const origin = req.headers.get("origin") || "http://localhost:3000";

  // Get or create Stripe customer
  const serviceSupabase = getServiceSupabase();
  const { data: existing } = await serviceSupabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  let customerId = existing?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    // Upsert so we have the customer ID ready for webhook
    await serviceSupabase.from("subscriptions").upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      status: "inactive",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  const priceId = process.env.VENTUREOS_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "VENTUREOS_PRICE_ID not configured" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: { userId: user.id },
    },
    success_url: `${origin}/?subscribed=1`,
    cancel_url: `${origin}/`,
    metadata: { userId: user.id, type: "platform_subscription" },
  });

  return NextResponse.json({ url: session.url });
}
