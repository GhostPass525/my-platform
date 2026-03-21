import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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
      // Subscription checkout — status will come from subscription events
    } else {
      // Store customer checkout
      const ok = await handleCheckoutComplete(stripe, session);
      if (!ok) {
        return NextResponse.json({ error: "Order processing failed" }, { status: 500 });
      }
    }
  }

  // --- Platform subscription lifecycle ---
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
  const customerEmail =
    session.customer_details?.email ?? session.customer_email ?? "";
  const total = (session.amount_total ?? 0) / 100;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId || null,
      site_id: publishId,
      customer_email: customerEmail,
      total,
      status: "paid",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Failed to insert order:", orderError);
    return false;
  }

  let lineItems: Stripe.LineItem[] = [];
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY!.trim();
    const liRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Stripe-Version": "2024-06-20",
        },
      }
    );
    const liData = await liRes.json();
    lineItems = liData?.data ?? [];
  } catch (err) {
    console.error("Failed to list line items:", err);
    return false;
  }

  if (lineItems.length > 0) {
    const items = lineItems.map((item) => ({
      order_id: order.id,
      product_id: item.price?.id ?? null,
      product_name: item.description ?? "Item",
      quantity: item.quantity ?? 1,
      price: (item.price?.unit_amount ?? 0) / 100,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(items);
    if (itemsError) {
      console.error("Failed to insert order_items:", itemsError);
      return false;
    }
  }

  return true;
}

// ---------- Platform subscription ----------

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const supabase = getServiceClient();
  const userId = subscription.metadata?.userId;

  if (!userId) {
    // Try to find user by customer ID
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", subscription.customer as string)
      .single();
    if (!data?.user_id) {
      console.error("No userId in subscription metadata and no customer match");
      return;
    }
  }

  const resolvedUserId =
    userId ||
    (await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", subscription.customer as string)
      .single()
      .then((r) => r.data?.user_id));

  if (!resolvedUserId) return;

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  // current_period_end lives on the subscription items in Stripe SDK v17+
  const rawPeriodEnd = (subscription as any).current_period_end as number | undefined;
  const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null;

  await supabase.from("subscriptions").upsert(
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
}
