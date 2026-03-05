"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function DashboardNav() {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-blue-600" />
        <div className="leading-tight">
          <div className="font-semibold text-slate-900">VentureOS</div>
          <div className="text-xs text-slate-500">Dashboard</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="/"
          className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 hover:opacity-80 transition"
        >
          Builder
        </a>
        <button
          onClick={signOut}
          className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 hover:opacity-80 transition"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
