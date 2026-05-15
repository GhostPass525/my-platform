import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function stripePost(path: string, params: Record<string, string>) {
  const secretKey = process.env.STRIPE_SECRET_KEY!.trim();
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Stripe error: ${res.status}`);
  return data;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const serviceSupabase = getServiceSupabase();

    // Get or create Express account
    const { data: connectData } = await serviceSupabase
      .from("stripe_connect")
      .select("connected_account_id")
      .eq("user_id", user.id)
      .single();

    let accountId = connectData?.connected_account_id ?? null;

    if (!accountId) {
      const createParams: Record<string, string> = {
        type: "express",
        "capabilities[card_payments][requested]": "true",
        "capabilities[transfers][requested]": "true",
        "metadata[volcity_user_id]": user.id,
      };
      if (user.email) createParams.email = user.email;

      const account = await stripePost("accounts", createParams);
      accountId = account.id;

      await serviceSupabase.from("stripe_connect").upsert(
        {
          user_id: user.id,
          connected_account_id: accountId,
          account_type: "express",
          charges_enabled: false,
          payouts_enabled: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      console.log("[account-session] created Express account:", accountId);
    }

    // Create account session for embedded components
    const session = await stripePost("account_sessions", {
      account: accountId,
      "components[account_onboarding][enabled]": "true",
      "components[payments][enabled]": "true",
      "components[payouts][enabled]": "true",
    });

    return NextResponse.json({ client_secret: session.client_secret });
  } catch (e: unknown) {
    const err = e as Error;
    console.error("[account-session] error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to create account session" }, { status: 500 });
  }
}
