import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function stripeGet(path: string) {
  const secretKey = process.env.STRIPE_SECRET_KEY!.trim();
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": "2024-06-20",
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe error: ${res.status}`);
  }
  return data;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = getServiceSupabase();

    const { data: connectData } = await serviceSupabase
      .from("stripe_connect")
      .select("connected_account_id, charges_enabled, payouts_enabled, activated_at")
      .eq("user_id", user.id)
      .single();

    if (!connectData?.connected_account_id) {
      const blockedCount = await redis.get<number>(`blocked-checkout:${user.id}`).catch(() => 0);
      return NextResponse.json({
        connected: false,
        connected_account_id: null,
        charges_enabled: false,
        payouts_enabled: false,
        blocked_checkout_count: blockedCount ?? 0,
      });
    }

    let charges_enabled = connectData.charges_enabled ?? false;
    let payouts_enabled = connectData.payouts_enabled ?? false;

    try {
      const account = await stripeGet(`accounts/${connectData.connected_account_id}`);
      charges_enabled = account.charges_enabled ?? false;
      payouts_enabled = account.payouts_enabled ?? false;

      // Stamp activated_at the first time charges become enabled
      const justActivated = charges_enabled && !connectData.charges_enabled;
      const updatePayload: Record<string, unknown> = {
        charges_enabled,
        payouts_enabled,
        updated_at: new Date().toISOString(),
      };
      if (justActivated && !connectData.activated_at) {
        updatePayload.activated_at = new Date().toISOString();
        console.log("[connect/status] account activated for user:", user.id);
      }

      await serviceSupabase
        .from("stripe_connect")
        .update(updatePayload)
        .eq("user_id", user.id);
    } catch (stripeErr) {
      console.warn("[connect/status] Stripe account lookup failed (may not be set up yet):", (stripeErr as Error)?.message);
    }

    return NextResponse.json({
      connected: true,
      connected_account_id: connectData.connected_account_id,
      charges_enabled,
      payouts_enabled,
    });
  } catch (e: any) {
    console.error("CONNECT STATUS ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to get connect status" },
      { status: 500 }
    );
  }
}
