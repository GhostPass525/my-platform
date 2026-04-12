import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/subscription/sync
 *
 * Called after Stripe checkout redirects back with ?subscribed=1.
 * Looks up the user's subscription directly from Stripe (bypasses webhook timing),
 * writes it to Supabase, and returns the active status.
 *
 * This fixes the race condition where the webhook hasn't fired yet when the
 * user lands back in the builder and tries to publish.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ active: false, error: "Not authenticated" }, { status: 401 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ active: false, error: "Stripe not configured" }, { status: 500 });
    }

    const stripe = new Stripe(secretKey);

    console.log("[subscription/sync] Syncing subscription for user", { userId: user.id, email: user.email });

    // Search Stripe for a customer matching this user's email
    const customers = await stripe.customers.list({ email: user.email!, limit: 5 });

    if (customers.data.length === 0) {
      console.log("[subscription/sync] No Stripe customer found for email", { email: user.email });
      return NextResponse.json({ active: false, status: "no_customer" });
    }

    // Check each customer for an active/trialing subscription
    let activeSub: Stripe.Subscription | null = null;
    let activeCustomerId: string | null = null;

    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 5,
      });

      const found = subs.data.find(
        (s) => s.status === "active" || s.status === "trialing"
      );

      if (found) {
        activeSub = found;
        activeCustomerId = customer.id;
        break;
      }
    }

    if (!activeSub || !activeCustomerId) {
      console.log("[subscription/sync] No active/trialing subscription found", { email: user.email });
      return NextResponse.json({ active: false, status: "no_active_subscription" });
    }

    console.log("[subscription/sync] Found active subscription", {
      subscriptionId: activeSub.id,
      status: activeSub.status,
      customerId: activeCustomerId,
      userId: user.id,
    });

    // Write to Supabase using service role (bypasses RLS)
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const trialEnd = activeSub.trial_end
      ? new Date(activeSub.trial_end * 1000).toISOString()
      : null;
    const rawPeriodEnd = (activeSub as any).current_period_end as number | undefined;
    const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null;

    const { error } = await serviceSupabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        stripe_customer_id: activeCustomerId,
        stripe_subscription_id: activeSub.id,
        status: activeSub.status,
        trial_end: trialEnd,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("[subscription/sync] Failed to upsert subscription", { error, userId: user.id });
      return NextResponse.json({ active: false, error: "DB write failed" }, { status: 500 });
    }

    console.log("[subscription/sync] Subscription synced successfully", { userId: user.id, status: activeSub.status });

    return NextResponse.json({
      active: true,
      status: activeSub.status,
      trial_end: trialEnd,
      current_period_end: periodEnd,
    });
  } catch (err: any) {
    console.error("[subscription/sync] Unexpected error", err);
    return NextResponse.json({ active: false, error: err?.message }, { status: 500 });
  }
}
