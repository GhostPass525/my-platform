import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

type CartItem = {
  name: string;
  price: number; // dollars (e.g. 49.99)
  quantity: number;
};

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const { cart, publishId } = (await req.json()) as {
      cart: CartItem[];
      publishId?: string;
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

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.map(
      (item) => ({
        quantity: Math.floor(item.quantity),
        price_data: {
          currency: "usd",
          unit_amount: Math.round(item.price * 100), // cents
          product_data: {
            name: (item.name || "Item").slice(0, 250),
          },
        },
      })
    );

    // Look up the store owner so we can attribute this order in the webhook
    let ownerId = "";
    if (publishId) {
      const stored = await redis.get<string>(`site-owner:${publishId}`);
      ownerId = stored ?? "";
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      customer_email: undefined, // Stripe will collect email at checkout
      success_url: `${origin}/checkout/success?pid=${encodeURIComponent(
        publishId || ""
      )}`,
      cancel_url: `${origin}/checkout/cancel?pid=${encodeURIComponent(
        publishId || ""
      )}`,
      metadata: {
        publishId: publishId || "",
        userId: ownerId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
