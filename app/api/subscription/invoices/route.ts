import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ invoices: [] });

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!sub?.stripe_customer_id || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ invoices: [] });
    }

    const res = await fetch(
      `https://api.stripe.com/v1/invoices?customer=${sub.stripe_customer_id}&limit=10&status=paid`,
      {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          "Stripe-Version": "2024-06-20",
        },
      }
    );

    if (!res.ok) return NextResponse.json({ invoices: [] });

    const data = await res.json();
    const invoices = (data?.data ?? []).map((inv: any) => ({
      id: inv.id,
      number: inv.number,
      amount: (inv.amount_paid ?? 0) / 100,
      currency: inv.currency ?? "usd",
      status: inv.status,
      date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      pdf_url: inv.invoice_pdf ?? null,
      hosted_url: inv.hosted_invoice_url ?? null,
    }));

    return NextResponse.json({ invoices });
  } catch (err: any) {
    console.error("[subscription/invoices] error:", err);
    return NextResponse.json({ invoices: [] });
  }
}
