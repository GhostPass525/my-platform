import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import PaymentsClient from "./payments-client";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <Suspense fallback={<div style={{ color: "#AAA", padding: 48, textAlign: "center" }}>Loading…</div>}>
      <PaymentsClient />
    </Suspense>
  );
}
