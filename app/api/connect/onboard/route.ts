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
  const body = new URLSearchParams(params);
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = getServiceSupabase();

    // Check if user already has a connected account
    const { data: existingConnect } = await serviceSupabase
      .from("stripe_connect")
      .select("connected_account_id")
      .eq("user_id", user.id)
      .single();

    let accountId = existingConnect?.connected_account_id ?? null;

    // Create a new Express account if none exists
    if (!accountId) {
      const account = await stripePost("accounts", {
        type: "express",
        "metadata[userId]": user.id,
      });
      accountId = account.id;

      const { error: upsertError } = await serviceSupabase
        .from("stripe_connect")
        .upsert(
          {
            user_id: user.id,
            connected_account_id: accountId,
            charges_enabled: false,
            payouts_enabled: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("Failed to save connected account:", upsertError);
        return NextResponse.json(
          { error: "Failed to save connected account" },
          { status: 500 }
        );
      }
    }

    // Generate an account onboarding link
    const origin = req.headers.get("origin") || "https://my-platform-omega.vercel.app";
    const accountLink = await stripePost("account_links", {
      account: accountId,
      refresh_url: `${origin}/dashboard/connect?refresh=1`,
      return_url: `${origin}/dashboard/connect?connected=1`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (e: any) {
    console.error("CONNECT ONBOARD ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to start onboarding" },
      { status: 500 }
    );
  }
}
