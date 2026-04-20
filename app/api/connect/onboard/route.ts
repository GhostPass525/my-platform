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
    const err = new Error(data?.error?.message || `Stripe error: ${res.status}`) as any;
    err.stripeCode = data?.error?.code;
    err.stripeType = data?.error?.type;
    err.stripeParam = data?.error?.param;
    throw err;
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
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://volcity.to";
    const refreshUrl = `${origin}/dashboard/connect?refresh=1`;
    const returnUrl = `${origin}/dashboard/connect?connected=1`;

    // Check if user already has a connected account
    const { data: existingConnect } = await serviceSupabase
      .from("stripe_connect")
      .select("connected_account_id")
      .eq("user_id", user.id)
      .single();

    let accountId = existingConnect?.connected_account_id ?? null;

    // If we have an existing account ID, try to generate an onboarding link.
    // If Stripe rejects it (stale/test-mode ID), fall through to create a fresh one.
    if (accountId) {
      try {
        const accountLink = await stripePost("account_links", {
          account: accountId,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: "account_onboarding",
        });
        console.log("[connect/onboard] resumed onboarding for existing account:", accountId);
        return NextResponse.json({ url: accountLink.url });
      } catch (linkErr: any) {
        // Stale or wrong-mode account — wipe it and create a new one below
        console.warn(
          `[connect/onboard] existing account ${accountId} rejected (code=${linkErr.stripeCode}, type=${linkErr.stripeType}): ${linkErr.message} — will create fresh account`
        );
        await serviceSupabase
          .from("stripe_connect")
          .delete()
          .eq("user_id", user.id);
        accountId = null;
      }
    }

    // Create a new Express account
    const createParams: Record<string, string> = {
      type: "express",
      "capabilities[card_payments][requested]": "true",
      "capabilities[transfers][requested]": "true",
      "metadata[userId]": user.id,
    };
    if (user.email) {
      createParams.email = user.email;
    }

    let account: any;
    try {
      account = await stripePost("accounts", createParams);
    } catch (createErr: any) {
      console.error(
        `[connect/onboard] accounts.create failed — code=${createErr.stripeCode} type=${createErr.stripeType} param=${createErr.stripeParam}: ${createErr.message}`
      );
      // Return the Stripe message directly so the client can show it
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }

    accountId = account.id;
    console.log("[connect/onboard] created new Stripe Express account:", accountId);

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
      console.error("[connect/onboard] DB upsert failed:", upsertError);
      return NextResponse.json({ error: "Failed to save account" }, { status: 500 });
    }

    // Generate onboarding link for the new account
    const accountLink = await stripePost("account_links", {
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (e: any) {
    console.error(
      `CONNECT ONBOARD ERROR: code=${e?.stripeCode} type=${e?.stripeType}: ${e?.message}`,
      e
    );
    return NextResponse.json(
      { error: e?.message || "Failed to start onboarding" },
      { status: 500 }
    );
  }
}
