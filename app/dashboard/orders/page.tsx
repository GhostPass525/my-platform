import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import OrdersClient from "./orders-client";

export const dynamic = "force-dynamic";

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  site_id: string | null;
  customer_email: string;
  total: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
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
      `id, site_id, customer_email, total, status, created_at,
       order_items ( id, product_name, quantity, price )`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const list: Order[] = (orders ?? []) as Order[];

  const totalRevenue = list.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = list.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <OrdersClient
      orders={list}
      stats={{ totalRevenue, totalOrders, avgOrderValue }}
    />
  );
}
