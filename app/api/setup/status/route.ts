import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [{ data: stripe }, { data: printful }] = await Promise.all([
      db.from("stripe_connect")
        .select("connected_account_id, charges_enabled")
        .eq("user_id", user.id)
        .maybeSingle(),
      db.from("printful_connections")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      stripe: {
        connected: !!stripe?.connected_account_id,
        onboarded: !!stripe?.charges_enabled,
        accountId: stripe?.connected_account_id ?? null,
      },
      printful: {
        connected: !!printful,
      },
    });
  } catch (e: any) {
    console.error("[setup/status] error:", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
