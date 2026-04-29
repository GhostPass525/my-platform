import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * POST /api/subscription/repair?secret=REPAIR_SECRET
 *
 * Repairs a broken subscription row by looking up the real subscription
 * from Stripe and updating the Supabase row by stripe_customer_id.
 *
 * Body: { stripeCustomerId: "cus_xxx" }
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    if (!secret || secret !== process.env.REPAIR_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const stripeCustomerId: string | undefined = body?.stripeCustomerId;
    if (!stripeCustomerId) {
      return NextResponse.json({ error: "stripeCustomerId required" }, { status: 400 });
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check the existing row first
    const { data: existingRow, error: rowError } = await supabase
      .from("subscriptions")
      .select("user_id, stripe_customer_id, status, stripe_subscription_id")
      .eq("stripe_customer_id", stripeCustomerId)
      .single();

    console.log("[repair] Existing row:", existingRow, "rowError:", rowError);

    if (!existingRow) {
      return NextResponse.json({ error: "No row found for this customer ID", rowError }, { status: 404 });
    }

    // Look up the Stripe subscription
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    let stripeStatus = "active";
    let stripeSubId: string | null = null;
    let trialEnd: string | null = null;
    let periodEnd: string | null = null;

    try {
      const subs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 10,
      });
      console.log("[repair] Stripe subs found:", subs.data.map(s => ({ id: s.id, status: s.status })));

      const best = subs.data.find(s => s.status === "active" || s.status === "trialing") ?? subs.data[0];
      if (best) {
        stripeStatus = best.status;
        stripeSubId = best.id;
        trialEnd = best.trial_end ? new Date(best.trial_end * 1000).toISOString() : null;
        const rawPeriodEnd = (best as any).current_period_end as number | undefined;
        periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null;
      }
    } catch (stripeErr: any) {
      console.error("[repair] Stripe lookup failed, will update with status=active as fallback:", stripeErr?.message);
    }

    // Update the row
    const { data: updated, error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: stripeStatus,
        ...(stripeSubId ? { stripe_subscription_id: stripeSubId } : {}),
        ...(trialEnd !== undefined ? { trial_end: trialEnd } : {}),
        ...(periodEnd !== undefined ? { current_period_end: periodEnd } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", stripeCustomerId)
      .select();

    if (updateError) {
      console.error("[repair] Failed to update row:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log("[repair] Row updated successfully:", { stripeCustomerId, stripeStatus, stripeSubId, rowsUpdated: updated?.length });

    return NextResponse.json({
      success: true,
      stripeCustomerId,
      previousStatus: existingRow.status,
      newStatus: stripeStatus,
      stripeSubscriptionId: stripeSubId,
      rowsUpdated: updated?.length ?? 0,
      row: updated?.[0] ?? null,
    });
  } catch (err: any) {
    console.error("[repair] Unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
