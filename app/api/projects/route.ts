import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getStoreLimit, type Tier } from "@/lib/featureGates";

export const dynamic = "force-dynamic";

// Detect plan tier from Stripe price ID
function detectTier(priceId: string): Tier {
  const map: Record<string, Tier> = {
    [process.env.STRIPE_STARTER_MONTHLY_PRICE_ID?.trim() ?? "__a__"]: "starter",
    [process.env.STRIPE_STARTER_YEARLY_PRICE_ID?.trim()  ?? "__b__"]: "starter",
    [process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID?.trim() ?? "__c__"]: "founder",
    [process.env.STRIPE_FOUNDER_YEARLY_PRICE_ID?.trim()  ?? "__d__"]: "founder",
    [process.env.STRIPE_EMPIRE_MONTHLY_PRICE_ID?.trim()  ?? "__e__"]: "empire",
    [process.env.STRIPE_EMPIRE_YEARLY_PRICE_ID?.trim()   ?? "__f__"]: "empire",
  };
  return map[priceId] ?? "legacy";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, created_at, updated_at, status")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, site } = body as { name: string; site?: unknown };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // ── Store limit enforcement ──────────────────────────────────────────────
  try {
    const [{ count: projectCount }, { data: subRow }] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("subscriptions").select("stripe_subscription_id, status").eq("user_id", user.id).single(),
    ]);

    if (subRow?.status === "active" || subRow?.status === "trialing") {
      let tier: Tier = "starter";

      if (subRow.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
        try {
          const res = await fetch(
            `https://api.stripe.com/v1/subscriptions/${subRow.stripe_subscription_id}`,
            { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Stripe-Version": "2024-06-20" } }
          );
          if (res.ok) {
            const s = await res.json();
            const priceId: string = s?.items?.data?.[0]?.price?.id ?? "";
            if (priceId) tier = detectTier(priceId);
          }
        } catch { /* fail open */ }
      }

      const limit = getStoreLimit(tier);
      if (limit !== Infinity && (projectCount ?? 0) >= limit) {
        const nextTier = tier === "starter" ? "Founder" : "Empire";
        return NextResponse.json(
          {
            error: `You've reached your ${tier === "starter" ? "1-store" : "3-store"} plan limit. Upgrade to ${nextTier} to create more stores.`,
            limitReached: true,
            tier,
            limit,
          },
          { status: 403 }
        );
      }
    }
  } catch { /* fail open — don't block project creation on unexpected errors */ }

  // Create project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({ user_id: user.id, name: name.trim() })
    .select("id, name")
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: projectError?.message ?? "Failed to create project" },
      { status: 500 }
    );
  }

  // Optionally save initial site JSON
  if (site) {
    await supabase.from("sites").insert({
      project_id: project.id,
      user_id: user.id,
      site_json: site,
    });
  }

  return NextResponse.json({ id: project.id, name: project.name });
}
