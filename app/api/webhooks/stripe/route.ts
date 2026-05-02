import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: SupabaseClient<any> | null = null;
function getSupabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _adminClient;
}

export async function POST(req: Request) {
  // Must use raw body for Stripe signature verification — do NOT parse as JSON first
  // Must return 200 for all events (including unhandled ones) so Stripe stops retrying
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
    console.error("[webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
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
        // Store customer checkout — log failure but still return 200 (order data is in Stripe)
        const ok = await handleCheckoutComplete(stripe, session);
        if (!ok) {
          console.error("[webhook] Order insert failed for session:", session.id, "— returning 200 to prevent Stripe retry");
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
      // Full payload log — confirms metadata.userId and status are present
      console.log("[webhook] subscription event received", {
        type: event.type,
        subscriptionId: subscription.id,
        status: subscription.status,
        customer: subscription.customer,
        metadata: subscription.metadata,
        trial_end: subscription.trial_end,
        current_period_end: (subscription as any).current_period_end,
      });
      await handleSubscriptionChange(subscription);
    }
  } catch (err: any) {
    // Log the error but always return 200 — Stripe will not retry and the event is in the dashboard
    console.error("[webhook] Unhandled error processing event", { type: event.type, eventId: event.id, err: err.message });
  }

  return NextResponse.json({ received: true });
}

// ---------- Store order ----------

async function handleCheckoutComplete(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<boolean> {

  const publishId = session.metadata?.publishId || null;
  const projectId = session.metadata?.projectId || null;
  // Use publishId as site_id if available; fall back to projectId for store checkouts
  const siteIdForOrder = publishId || projectId || null;
  const userId = session.metadata?.userId || null;
  const checkoutDataKey = session.metadata?.checkoutDataKey || null;
  const primaryProductName = session.metadata?.primaryProductName || null;
  const primaryProductType = session.metadata?.primaryProductType || "physical";

  console.log("[webhook] checkout.session.completed", {
    sessionId: session.id,
    publishId,
    projectId,
    siteIdForOrder,
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

  const { error: orderError } = await getSupabaseAdmin()
    .from("orders")
    .insert({
      user_id: userId || null,
      site_id: siteIdForOrder,
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

  // Auto-fulfill with Printful if the store owner has a connected Printful account
  if (userId && shippingAddress) {
    try {
      const { data: printfulConnection } = await getSupabaseAdmin()
        .from("printful_connections")
        .select("access_token")
        .eq("user_id", userId)
        .maybeSingle();

      if (printfulConnection) {
        // Resolve the Printful sync variant ID to use for fulfillment.
        // Prefer an explicit variant ID in metadata; fall back to looking up
        // the first variant of the sync product if only the product ID is known.
        let syncVariantId: string | null = session.metadata?.printful_variant_id || null;

        if (!syncVariantId) {
          const syncProductId = session.metadata?.printful_sync_product_id || null;
          if (syncProductId) {
            const variantRes = await fetch(`https://api.printful.com/sync/products/${syncProductId}`, {
              headers: { Authorization: `Bearer ${printfulConnection.access_token}` },
            });
            if (variantRes.ok) {
              const variantData = await variantRes.json().catch(() => null);
              const firstVariant = variantData?.result?.sync_variants?.[0];
              if (firstVariant?.id) {
                syncVariantId = String(firstVariant.id);
                console.log("[webhook] Resolved Printful sync_variant_id:", syncVariantId, "from sync_product_id:", syncProductId);
              } else {
                console.warn("[webhook] Printful sync product has no variants, skipping auto-fulfill. product_id:", syncProductId);
              }
            } else {
              console.warn("[webhook] Could not fetch Printful sync product variants for id:", syncProductId);
            }
          }
        }

        if (syncVariantId) {
          const fulfillRes = await fetch("https://api.printful.com/orders", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${printfulConnection.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              recipient: {
                name: customerData.fullName || customerEmail,
                address1: shippingAddress.line1,
                address2: shippingAddress.line2 || undefined,
                city: shippingAddress.city,
                state_code: shippingAddress.state,
                zip: shippingAddress.zip,
                country_code: shippingAddress.country,
                email: customerData.email || customerEmail,
                phone: customerData.phone || undefined,
              },
              items: [
                {
                  sync_variant_id: syncVariantId,
                  quantity: 1,
                },
              ],
            }),
          });

          if (fulfillRes.ok) {
            await getSupabaseAdmin()
              .from("orders")
              .update({ fulfillment_status: "fulfilled", fulfillment_notes: "Auto-fulfilled via Printful" })
              .eq("stripe_session_id", session.id);
            console.log("[webhook] Printful order created for session:", session.id);
          } else {
            const errData = await fulfillRes.json().catch(() => ({}));
            console.error("[webhook] Printful order creation failed:", errData);
          }
        } else {
          console.log("[webhook] Printful connected but no sync variant ID could be resolved — skipping auto-fulfill");
        }
      }
    } catch (fulfillErr) {
      // Log but don't fail — order is already saved
      console.error("[webhook] Printful fulfillment error (non-fatal):", fulfillErr);
    }
  }

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

  const { error } = await getSupabaseAdmin().from("subscriptions").upsert(
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

  // Write tier + billing period to profiles
  const tier = session.metadata?.planId ?? (stripeSub.metadata as any)?.planId ?? "starter";
  const billingPeriod = session.metadata?.billing ?? (stripeSub.metadata as any)?.billing ?? "monthly";
  const { error: profileError } = await getSupabaseAdmin()
    .from("profiles")
    .update({ tier, billing_period: billingPeriod })
    .eq("id", userId);
  if (profileError) {
    console.error("[webhook] Failed to update profile tier", { profileError, userId, tier });
  } else {
    console.log("[webhook] Profile tier updated", { userId, tier, billingPeriod });
  }
}

// ---------- Platform subscription lifecycle (upgrades, renewals, cancellations) ----------

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  console.log("[webhook] handleSubscriptionChange", {
    subscriptionId: subscription.id,
    customer: customerId,
    metadataUserId: subscription.metadata?.userId,
    status: subscription.status,
  });

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;
  const rawPeriodEnd = (subscription as any).current_period_end as number | undefined;
  const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null;

  const payload = {
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    trial_end: trialEnd,
    current_period_end: periodEnd,
    updated_at: new Date().toISOString(),
  };

  // ── Primary: update the existing row by stripe_customer_id ──────────────
  // This handles the normal flow: checkout creates an 'incomplete' row with the
  // customer ID, and the webhook fills in the subscription ID and real status.
  const { data: existing, error: lookupError } = await getSupabaseAdmin()
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (existing?.user_id) {
    const { error } = await getSupabaseAdmin()
      .from("subscriptions")
      .update(payload)
      .eq("stripe_customer_id", customerId);

    if (error) {
      console.error("[webhook] CRITICAL: Failed to update subscription by customer ID", { error, customerId, subscriptionId: subscription.id });
    } else {
      console.log("[webhook] Subscription updated by customer ID", { customerId, userId: existing.user_id, status: subscription.status });
    }
    return;
  }

  // ── Fallback: upsert by user_id from metadata (no pre-existing row) ─────
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("[webhook] No existing row for customer and no userId in metadata — cannot link subscription", {
      customerId,
      subscriptionId: subscription.id,
      lookupError,
    });
    return;
  }

  console.log("[webhook] No row for customer — falling back to upsert by userId from metadata", { userId, customerId });

  const { error } = await getSupabaseAdmin().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      ...payload,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[webhook] CRITICAL: Failed to upsert subscription by userId", { error, userId, subscriptionId: subscription.id });
  } else {
    console.log("[webhook] Subscription upserted by userId from metadata", { userId, status: subscription.status });
  }
}
