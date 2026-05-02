export const maxDuration = 30;
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type CartItem = {
  id: string;
  name: string;
  price: number; // cents
  image?: string | null;
  qty: number;
};

export async function POST(req: Request) {
  try {
    const { projectId, items, returnUrl } = (await req.json()) as {
      projectId: string;
      items: CartItem[];
      returnUrl?: string;
    };

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    for (const item of items) {
      if (typeof item.price !== "number" || item.price <= 0) {
        return NextResponse.json({ error: "Invalid item price (must be positive integer cents)" }, { status: 400 });
      }
      if (typeof item.qty !== "number" || item.qty < 1 || item.qty > 999) {
        return NextResponse.json({ error: "Invalid item quantity" }, { status: 400 });
      }
    }

    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Look up owner from projects table
    const { data: project } = await db
      .from("projects")
      .select("user_id")
      .eq("id", projectId)
      .single();

    const ownerId = project?.user_id ?? "";

    // Look up their Stripe Connect account
    let connectedAccountId: string | null = null;
    if (ownerId) {
      const { data: connectData } = await db
        .from("stripe_connect")
        .select("connected_account_id, charges_enabled")
        .eq("user_id", ownerId)
        .single();
      if (!connectData?.connected_account_id) {
        return NextResponse.json(
          { error: "This store is not yet set up to accept payments. The seller needs to complete Stripe onboarding." },
          { status: 400 }
        );
      }
      if (!connectData.charges_enabled) {
        return NextResponse.json(
          { error: "The seller's payment setup is incomplete. Please try again later." },
          { status: 400 }
        );
      }
      connectedAccountId = connectData.connected_account_id;
    }

    const origin = returnUrl
      ? new URL(returnUrl).origin
      : req.headers.get("origin") || "https://volcity.to";
    const base = returnUrl || origin;

    const successUrl = base.includes("?")
      ? base + "&checkout=success"
      : base + "?checkout=success";
    const cancelUrl = base.includes("?")
      ? base + "&checkout=cancelled"
      : base + "?checkout=cancelled";

    const totalCents = items.reduce((s, i) => s + Math.round(i.price) * i.qty, 0);
    const appFeeCents = connectedAccountId
      ? Math.max(1, Math.round(totalCents * 0.01))
      : 0;

    // Build Stripe form-encoded body
    const params: Record<string, string> = {
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      "metadata[projectId]": projectId,
      "metadata[userId]": ownerId,
      "metadata[primaryProductName]": items[0]?.name || "",
      "metadata[primaryProductType]": "physical",
    };

    items.forEach((item, i) => {
      params[`line_items[${i}][quantity]`] = String(item.qty);
      params[`line_items[${i}][price_data][currency]`] = "usd";
      params[`line_items[${i}][price_data][unit_amount]`] = String(Math.round(item.price));
      params[`line_items[${i}][price_data][product_data][name]`] = (item.name || "Item").slice(0, 250);
      if (item.image) {
        params[`line_items[${i}][price_data][product_data][images][0]`] = item.image.slice(0, 500);
      }
    });

    if (connectedAccountId) {
      params["payment_intent_data[application_fee_amount]"] = String(appFeeCents);
      params["payment_intent_data[transfer_data][destination]"] = connectedAccountId;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY!.trim()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    };

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers,
      body: new URLSearchParams(params).toString(),
    });

    const session = await res.json();
    if (!res.ok) {
      const stripeErr = session?.error;
      // "No such destination" means the saved Connect account doesn't exist in
      // the current Stripe key mode (e.g. test acct used with live key).
      // Mark the row invalid so the seller is prompted to re-onboard.
      const isInvalidDest =
        stripeErr?.code === "account_invalid" ||
        stripeErr?.message?.includes("No such destination") ||
        stripeErr?.message?.includes("No such account");
      if (isInvalidDest && connectedAccountId && ownerId) {
        console.error("[checkout/store] Stripe account invalid, marking for re-onboard:", connectedAccountId);
        await db
          .from("stripe_connect")
          .update({ charges_enabled: false, payouts_enabled: false })
          .eq("user_id", ownerId);
        return NextResponse.json(
          { error: "The seller's payment setup needs to be reconnected. Please try again later." },
          { status: 400 }
        );
      }
      throw new Error(stripeErr?.message || `Stripe error: ${res.status}`);
    }

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    console.error("[checkout/store] error:", e);
    return NextResponse.json(
      { error: (e as Error)?.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
