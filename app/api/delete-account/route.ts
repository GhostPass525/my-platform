import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Cancel Stripe subscription before deleting records
    try {
      const { data: sub } = await serviceClient
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sub?.stripe_subscription_id) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      }
    } catch (stripeErr) {
      console.error("[delete-account] Stripe cancel failed:", stripeErr);
    }

    // 2. Delete projects (cascades to sites, mentor_messages, etc.)
    const { error: projectsError } = await serviceClient
      .from("projects")
      .delete()
      .eq("user_id", user.id);
    if (projectsError) console.error("[delete-account] Projects delete failed:", projectsError);

    // 3. Delete Stripe Connect reference
    const { error: connectError } = await serviceClient
      .from("stripe_connect")
      .delete()
      .eq("user_id", user.id);
    if (connectError) console.error("[delete-account] Connect delete failed:", connectError);

    // 4. Delete subscription records
    const { error: subError } = await serviceClient
      .from("subscriptions")
      .delete()
      .eq("user_id", user.id);
    if (subError) console.error("[delete-account] Subscription delete failed:", subError);

    // 5. Delete auth user (cascades to profile)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("[delete-account] Auth delete failed:", deleteError);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[delete-account] Unexpected error:", err);
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
