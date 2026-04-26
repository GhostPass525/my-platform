import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DashboardClient from "./dashboard-client";
import StartBuildingCard from "@/components/dashboard/StartBuildingCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: projects }, { data: orders }, { data: siteRow }, { data: profile }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
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
      supabase
        .from("profiles")
        .select("first_name, name, full_name")
        .eq("id", user.id)
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

  // Derive display name: first_name > name > full_name (first word) > email username > fallback
  const p = profile as { first_name?: string; name?: string; full_name?: string } | null;
  const rawName = p?.first_name?.trim() || p?.name?.trim() || p?.full_name?.trim() || "";
  const firstName = rawName
    ? rawName.split(" ")[0]
    : (user.email ? user.email.split("@")[0].replace(/[._-]/g, " ").split(" ")[0] : "") || "there";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  return (
    <>
      {(projects ?? []).length === 0 && (
        <div className="mb-8 px-4 pt-8">
          <StartBuildingCard />
        </div>
      )}
      <DashboardClient
      initialProjects={projects ?? []}
      userId={user.id}
      initialOrdersCount={orderList.length}
      initialRevenue={totalRevenue}
      initialMonthRevenue={monthRevenue}
      firstName={displayName}
      brandName={brandName}
      niche={niche}
    />
    </>
  );
}
