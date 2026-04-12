import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export const dynamic = "force-dynamic";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // --- Store checkout (customer purchase) ---
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.type === "platform_subscription") {
      // Write subscription record immediately — don't rely solely on subscription events
      const userId = session.metadata?.userId;
      console.log("[webhook] platform_subscription checkout.session.completed", {
        sessionId: session.id,
        userId,
        customerId: session.customer,
        subscriptionId: session.subscription,
      });
      if (!userId) {
        console.error("[webhook] CRITICAL: platform_subscription checkout missing userId in metadata", { sessionId: session.id });
      } else {
        await handlePlatformSubscriptionCheckout(stripe, session, userId);
      }
    } else {
      // Store customer checkout
      const ok = await handleCheckoutComplete(stripe, session);
      if (!ok) {
        return NextResponse.json({ error: "Order processing failed" }, { status: 500 });
      }
    }
  }

  // --- Platform subscription lifecycle (handles upgrades, cancellations, renewals) ---
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    await handleSubscriptionChange(subscription);
  }

  return NextResponse.json({ received: true });
}

// ---------- Store order ----------

async function handleCheckoutComplete(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<boolean> {
  const supabase = getServiceClient();

  const publishId = session.metadata?.publishId || null;
  const userId = session.metadata?.userId || null;
  const checkoutDataKey = session.metadata?.checkoutDataKey || null;
  const primaryProductName = session.metadata?.primaryProductName || null;
  const primaryProductType = session.metadata?.primaryProductType || "physical";

  console.log("[webhook] checkout.session.completed", {
    sessionId: session.id,
    publishId,
    userId,
    checkoutDataKey,
    primaryProductName,
    amount_total: session.amount_total,
  });

  if (!userId) {
    console.error("[webhook] Missing userId in session metadata — order will be unlinked. session.id:", session.id);
  }

  const customerEmail =
    session.customer_details?.email ?? session.customer_email ?? "";
  const amount = (session.amount_total ?? 0) / 100;
  const currency = session.currency ?? "usd";

  // Retrieve customer data stored before checkout
  let customerData: Record<string, string> = {};
  if (checkoutDataKey) {
    try {
      const stored = await redis.get<Record<string, string>>(`checkout-data:${checkoutDataKey}`);
      if (stored) customerData = stored;
    } catch (err) {
      console.error("Failed to retrieve checkout data:", err);
    }
  }

  // Build shipping address object if present
  const shippingAddress =
    customerData.shippingLine1
      ? {
          line1: customerData.shippingLine1,
          line2: customerData.shippingLine2 || null,
          city: customerData.shippingCity || "",
          state: customerData.shippingState || "",
          zip: customerData.shippingZip || "",
          country: customerData.shippingCountry || "",
        }
      : null;

  const { error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId || null,
      site_id: publishId,
      customer_email: customerData.email || customerEmail,
      customer_name: customerData.fullName || null,
      customer_phone: customerData.phone || null,
      product_name: primaryProductName,
      product_type: primaryProductType,
      amount,
      currency,
      shipping_address: shippingAddress,
      preferred_datetime: customerData.preferredDateTime || null,
      customer_notes: customerData.notes || customerData.briefDescription || null,
      fulfillment_status: "unfulfilled",
      stripe_payment_intent_id: (session.payment_intent as string) || null,
      stripe_session_id: session.id,
      // Legacy columns kept for compatibility
      total: amount,
      status: "paid",
    });

  if (orderError) {
    console.error("[webhook] Failed to insert order:", orderError, { userId, publishId, amount });
    return false;
  }

  console.log("[webhook] Order inserted successfully for session:", session.id);

  // Clean up the temporary checkout data from Redis
  if (checkoutDataKey) {
    await redis.del(`checkout-data:${checkoutDataKey}`).catch(() => {});
  }

  return true;
}

// ---------- Platform subscription (from checkout.session.completed) ----------

async function handlePlatformSubscriptionCheckout(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  userId: string
) {
  const supabase = getServiceClient();
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!subscriptionId) {
    console.error("[webhook] handlePlatformSubscriptionCheckout: no subscription ID on session", { sessionId: session.id, userId });
    return;
  }

  // Retrieve the full subscription object from Stripe
  let stripeSub: Stripe.Subscription;
  try {
    stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
  } catch (err) {
    console.error("[webhook] Failed to retrieve subscription from Stripe", { subscriptionId, err });
    return;
  }

  console.log("[webhook] Retrieved subscription from Stripe", {
    subscriptionId: stripeSub.id,
    status: stripeSub.status,
    userId,
    customerId,
  });

  const trialEnd = stripeSub.trial_end
    ? new Date(stripeSub.trial_end * 1000).toISOString()
    : null;
  const rawPeriodEnd = (stripeSub as any).current_period_end as number | undefined;
  const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null;

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSub.id,
      status: stripeSub.status,
      trial_end: trialEnd,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[webhook] CRITICAL: Failed to upsert subscription from checkout", { error, userId, subscriptionId });
  } else {
    console.log("[webhook] Subscription upserted successfully from checkout", { userId, status: stripeSub.status });
  }
}

// ---------- Platform subscription lifecycle (upgrades, renewals, cancellations) ----------

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const supabase = getServiceClient();
  const userId = subscription.metadata?.userId;

  console.log("[webhook] handleSubscriptionChange", {
    subscriptionId: subscription.id,
    customer: subscription.customer,
    metadataUserId: userId,
    status: subscription.status,
  });

  let resolvedUserId = userId;

  if (!resolvedUserId) {
    // Fall back to looking up by Stripe customer ID (e.g. after plan change)
    const { data, error } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", subscription.customer as string)
      .single();
    if (error || !data?.user_id) {
      console.error("[webhook] handleSubscriptionChange: no userId in metadata and no customer match in subscriptions table", {
        customer: subscription.customer,
        lookupError: error,
      });
      return;
    }
    resolvedUserId = data.user_id;
    console.log("[webhook] handleSubscriptionChange: resolved userId by customer ID", { resolvedUserId });
  }

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  // current_period_end lives on the subscription items in Stripe SDK v17+
  const rawPeriodEnd = (subscription as any).current_period_end as number | undefined;
  const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null;

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: resolvedUserId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      trial_end: trialEnd,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[webhook] CRITICAL: Failed to upsert subscription", { error, resolvedUserId, subscriptionId: subscription.id });
  } else {
    console.log("[webhook] Subscription upserted successfully", { resolvedUserId, status: subscription.status });
  }
}
