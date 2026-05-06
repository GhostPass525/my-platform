import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

type CartItem = {
  name: string;
  price: number; // dollars (e.g. 49.99)
  quantity: number;
  product_type?: string;
};

type CustomerData = {
  fullName?: string;
  email?: string;
  phone?: string;
  shippingLine1?: string;
  shippingLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry?: string;
  preferredDateTime?: string;
  notes?: string;
  briefDescription?: string;
};

async function stripePost(params: Record<string, string | number | Record<string, unknown>>, connectedAccountId?: string | null) {
  const secretKey = process.env.STRIPE_SECRET_KEY!.trim();

  // Flatten nested objects into Stripe's form-encoded format
  function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key;
      if (value !== null && value !== undefined && typeof value === "object" && !Array.isArray(value)) {
        Object.assign(result, flatten(value as Record<string, unknown>, fullKey));
      } else if (value !== null && value !== undefined) {
        result[fullKey] = String(value);
      }
    }
    return result;
  }

  const flat = flatten(params as Record<string, unknown>);
  const body = new URLSearchParams(flat);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
    "Stripe-Version": "2024-06-20",
  };
  if (connectedAccountId) {
    headers["Stripe-Account"] = connectedAccountId;
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers,
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe error: ${res.status}`);
  }
  return data;
}

export async function POST(req: Request) {
  try {
    const { cart, publishId, customerData } = (await req.json()) as {
      cart: CartItem[];
      publishId?: string;
      customerData?: CustomerData;
    };

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Validate each item
    for (const item of cart) {
      if (typeof item.price !== "number" || item.price <= 0) {
        return NextResponse.json({ error: "Invalid item price" }, { status: 400 });
      }
      if (typeof item.quantity !== "number" || item.quantity < 1 || item.quantity > 999) {
        return NextResponse.json({ error: "Invalid item quantity" }, { status: 400 });
      }
    }

    // Look up the store owner and site data
    let ownerId = "";
    let printfulSyncProductId: string | null = null;
    if (publishId) {
      const [storedOwner, storedSite] = await Promise.all([
        redis.get<string>(`site-owner:${publishId}`),
        redis.get<{ products?: Array<{ name: string; printful_sync_id?: number | string }> }>(`site:${publishId}`),
      ]);
      ownerId = storedOwner ?? "";
      // Find the Printful sync product ID for the first physical cart item
      if (storedSite?.products) {
        const firstPhysical = cart.find((i) => !i.product_type || i.product_type === "physical");
        if (firstPhysical) {
          const match = storedSite.products.find((p) => p.name === firstPhysical.name && p.printful_sync_id);
          if (match?.printful_sync_id) {
            printfulSyncProductId = String(match.printful_sync_id);
          }
        }
      }
    }

    // Look up the owner's connected Stripe account
    let connectedAccountId: string | null = null;
    if (ownerId) {
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: connectData } = await serviceSupabase
        .from("stripe_connect")
        .select("connected_account_id, charges_enabled")
        .eq("user_id", ownerId)
        .single();
      if (connectData?.charges_enabled && connectData?.connected_account_id) {
        connectedAccountId = connectData.connected_account_id;
      } else {
        // Store owner hasn't completed Stripe Connect — block checkout and track the attempt
        await redis.incr(`blocked-checkout:${ownerId}`).catch(() => {});
        return NextResponse.json(
          { error: "Payments are being set up. Check back soon!" },
          { status: 402 }
        );
      }
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const totalCents = cart.reduce(
      (sum, item) => sum + Math.round(item.price * 100) * Math.floor(item.quantity),
      0
    );
    const appFeeCents = connectedAccountId
      ? Math.max(1, Math.round(totalCents * 0.05))
      : 0;

    // Build line_items as Stripe form-encoded array
    const lineItemParams: Record<string, string> = {};
    cart.forEach((item, i) => {
      lineItemParams[`line_items[${i}][quantity]`] = String(Math.floor(item.quantity));
      lineItemParams[`line_items[${i}][price_data][currency]`] = "usd";
      lineItemParams[`line_items[${i}][price_data][unit_amount]`] = String(Math.round(item.price * 100));
      lineItemParams[`line_items[${i}][price_data][product_data][name]`] = (item.name || "Item").slice(0, 250);
    });

    // Store customer data in Redis so the webhook can retrieve it
    let checkoutDataKey = "";
    if (customerData && Object.keys(customerData).length > 0) {
      checkoutDataKey = crypto.randomUUID().replace(/-/g, "");
      await redis.set(`checkout-data:${checkoutDataKey}`, customerData, { ex: 3600 });
    }

    const sessionParams: Record<string, string> = {
      mode: "payment",
      success_url: publishId
        ? `${origin}/s/${publishId}?checkout=success&amount=${(totalCents / 100).toFixed(2)}`
        : `${origin}/checkout/success`,
      cancel_url: publishId
        ? `${origin}/s/${publishId}?checkout=cancelled`
        : `${origin}/checkout/cancel`,
      "metadata[publishId]": publishId || "",
      "metadata[userId]": ownerId,
      "metadata[checkoutDataKey]": checkoutDataKey,
      "metadata[primaryProductName]": cart[0]?.name || "",
      "metadata[primaryProductType]": cart[0]?.product_type || "physical",
      ...(printfulSyncProductId ? { "metadata[printful_sync_product_id]": printfulSyncProductId } : {}),
      ...lineItemParams,
    };

    if (connectedAccountId) {
      sessionParams["payment_intent_data[application_fee_amount]"] = String(appFeeCents);
      sessionParams["payment_intent_data[transfer_data][destination]"] = connectedAccountId;
    }

    const secretKey = process.env.STRIPE_SECRET_KEY!.trim();
    const body = new URLSearchParams(sessionParams);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2024-06-20",
      },
      body: body.toString(),
    });

    const session = await res.json();
    if (!res.ok) {
      throw new Error(session?.error?.message || `Stripe error: ${res.status}`);
    }

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("CHECKOUT ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
