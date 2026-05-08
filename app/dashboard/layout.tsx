import DashboardNav from "./dashboard-nav";
import { createClient } from "@/utils/supabase/server";
import { computeStageIndex } from "@/lib/journey";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let firstName: string | undefined;
  let stageIndex = 0;

  if (user?.id) {
    const [{ data: profile }, { count: projectCount }, { data: siteRow }, { count: ordersCount }] = await Promise.all([
      supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("sites").select("published_at").eq("user_id", user.id).not("published_at", "is", null).limit(1).maybeSingle(),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    firstName = (profile as { first_name?: string } | null)?.first_name?.trim() || undefined;
    stageIndex = computeStageIndex(
      (projectCount ?? 0) > 0,
      !!siteRow,
      ordersCount ?? 0
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#fafaf9" }}>
      <DashboardNav firstName={firstName} email={user?.email ?? ""} stageIndex={stageIndex} />
      <main className="px-6 py-10">{children}</main>
    </div>
  );
}
