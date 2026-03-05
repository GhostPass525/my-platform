import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

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

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.map(
      (item) => ({
        quantity: Math.max(1, item.quantity || 1),
        price_data: {
          currency: "usd",
          unit_amount: Math.round((item.price || 0) * 100), // cents
          product_data: {
            name: item.name || "Item",
          },
        },
      })
    );

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${origin}/checkout/success?pid=${encodeURIComponent(
        publishId || ""
      )}`,
      cancel_url: `${origin}/checkout/cancel?pid=${encodeURIComponent(
        publishId || ""
      )}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Checkout failed" },
      { status: 500 }
    );
  }
}