import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `id, site_id, customer_email, total, status, created_at,
         order_items ( id, product_name, quantity, price )`
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[orders] Query failed:", error);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    const list = orders ?? [];
    const totalRevenue = list.reduce((s, o) => s + Number(o.total), 0);
    const totalOrders = list.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return NextResponse.json({
      orders: list,
      stats: { totalRevenue, totalOrders, avgOrderValue },
    });
  } catch (err) {
    console.error("[orders] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
