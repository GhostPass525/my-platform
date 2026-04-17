import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: projects }, { data: orders }, { data: siteRow }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, total, customer_email, created_at, order_items(product_name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("sites")
        .select("site_json")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(),
    ]);

  const orderList = orders ?? [];
  const totalRevenue = orderList.reduce((s, o) => s + Number(o.total), 0);
  const now = new Date();
  const monthRevenue = orderList
    .filter((o) => {
      const d = new Date(o.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, o) => s + Number(o.total), 0);
  const siteJson = siteRow?.site_json as Record<string, unknown> | null;
  const brandName =
    (siteJson?.brandName as string | undefined) || (projects?.[0]?.name ?? "");
  const niche = [siteJson?.audience, siteJson?.firstProductOrService]
    .filter(Boolean)
    .join(", ") || undefined;

  return (
    <DashboardClient
      initialProjects={projects ?? []}
      userId={user.id}
      initialOrdersCount={orderList.length}
      initialRevenue={totalRevenue}
      initialMonthRevenue={monthRevenue}
      userEmail={user.email ?? ""}
      brandName={brandName}
      niche={niche}
    />
  );
}
