import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import OrdersClient from "./orders-client";

export const dynamic = "force-dynamic";

export type Order = {
  id: string;
  site_id: string | null;
  user_id: string | null;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  product_name: string | null;
  product_type: string | null;
  product_variants: Record<string, string> | null;
  amount: number | null;
  currency: string | null;
  shipping_address: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
  } | null;
  preferred_datetime: string | null;
  customer_notes: string | null;
  fulfillment_status: string;
  fulfillment_notes: string | null;
  fulfillment_type: string | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  // Legacy
  total?: number | null;
  status?: string | null;
};

export default async function OrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: orders } = await supabase
    .from("orders")
    .select(
      `id, site_id, user_id, created_at,
       customer_name, customer_email, customer_phone,
       product_name, product_type, product_variants,
       amount, currency, shipping_address,
       preferred_datetime, customer_notes,
       fulfillment_status, fulfillment_notes, fulfillment_type,
       tracking_number, tracking_carrier,
       stripe_payment_intent_id, stripe_session_id,
       total, status`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const list: Order[] = (orders ?? []) as Order[];

  const totalRevenue = list.reduce((s, o) => s + Number(o.amount ?? o.total ?? 0), 0);
  const totalOrders = list.length;
  const unfulfilledCount = list.filter((o) => o.fulfillment_status === "unfulfilled").length;
  const inProgressCount = list.filter((o) => o.fulfillment_status === "in_progress").length;

  return (
    <OrdersClient
      initialOrders={list}
      stats={{ totalRevenue, totalOrders, unfulfilledCount, inProgressCount }}
    />
  );
}
