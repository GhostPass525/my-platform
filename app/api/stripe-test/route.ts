import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
  try {
    const balance = await stripe.balance.retrieve();
    return NextResponse.json({ ok: true, currency: balance.available?.[0]?.currency || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Stripe error" }, { status: 500 });
  }
}
