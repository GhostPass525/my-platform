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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm shadow-blue-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-slate-900">VentureOS</div>
          <div className="text-xs text-slate-500">Dashboard</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="/"
          className="px-3 py-1.5 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150"
        >
          Builder
        </a>
        <button
          onClick={signOut}
          className="px-3 py-1.5 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
