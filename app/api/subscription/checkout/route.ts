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
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not logged in. Please sign in first." }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set in environment." }, { status: 500 });
    }

    const priceId = process.env.VENTUREOS_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: "VENTUREOS_PRICE_ID is not set in Vercel environment variables." }, { status: 500 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set in environment." }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = req.headers.get("origin") || "https://my-platform-omega.vercel.app";

    // Get or create Stripe customer
    const serviceSupabase = getServiceSupabase();
    const { data: existing, error: dbError } = await serviceSupabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    // If table doesn't exist, dbError.code will be "42P01"
    if (dbError && dbError.code !== "PGRST116") {
      // PGRST116 = row not found (fine), anything else is a real error
      console.error("Supabase error:", dbError);
      if (dbError.code === "42P01") {
        return NextResponse.json({ error: "Database table 'subscriptions' not found. Run the Supabase migration." }, { status: 500 });
      }
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    let customerId = existing?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await serviceSupabase.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: "inactive",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
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
  } catch (err: any) {
    console.error("Subscription checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
