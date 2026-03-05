import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
  try {
    // Simple API call to verify auth
    const balance = await stripe.balance.retrieve();
    return NextResponse.json({ ok: true, currency: balance.available?.[0]?.currency || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Stripe error" }, { status: 500 });
  }
}