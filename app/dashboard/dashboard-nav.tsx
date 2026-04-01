"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const NAV_LINKS = [
  { href: "/dashboard",            label: "Projects" },
  { href: "/dashboard/orders",     label: "Orders" },
  { href: "/dashboard/connect",    label: "Connect" },
  { href: "/dashboard/insights",   label: "Insights" },
  { href: "/dashboard/marketing",  label: "Marketing" },
  { href: "/dashboard/brand",      label: "Brand Kit" },
  { href: "/builder",              label: "Builder" },
  { href: "/dashboard/account",    label: "Account" },
];

export default function DashboardNav() {
  const router   = useRouter();
  const pathname = usePathname();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">

        {/* Brand */}
        <a href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200/60 transition-transform duration-150 group-hover:scale-105">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="font-semibold text-sm text-slate-900 tracking-tight">Volcity</span>
        </a>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <a
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                  active
                    ? "bg-slate-900 text-white font-medium"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {label}
              </a>
            );
          })}
        </nav>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex-shrink-0 text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
