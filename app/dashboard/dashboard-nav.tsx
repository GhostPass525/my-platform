"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const NAV_LINKS = [
  { href: "/dashboard",           label: "Home" },
  { href: "/dashboard/orders",    label: "Orders" },
  { href: "/dashboard/connect",   label: "Connect" },
  { href: "/dashboard/insights",  label: "Insights" },
  { href: "/dashboard/marketing", label: "Marketing" },
];


function AccountAvatar({ firstName, email }: { firstName?: string; email: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const initial = (firstName?.[0] || email?.[0] || "?").toUpperCase();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "linear-gradient(135deg, #4f46e5, #0f172a)",
          color: "#fff", fontWeight: 700, fontSize: 13,
          border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
          transition: "opacity 0.15s",
          opacity: open ? 0.85 : 1,
        }}
      >
        {initial}
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 216, background: "#fff",
            borderRadius: 12, border: "1px solid #e7e5e4",
            boxShadow: "0 8px 24px rgba(12,10,9,0.10), 0 2px 6px rgba(12,10,9,0.06)",
            zIndex: 50, overflow: "hidden",
            animation: "slideUp 0.15s ease-out both",
          }}>
            {/* Header */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #f5f5f4" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0c0a09", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {firstName || "Account"}
              </div>
              <div style={{ fontSize: 12, color: "#a8a29e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                {email}
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: "4px 0" }}>
              <a
                href="/dashboard/account"
                onClick={() => setOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", fontSize: 13, color: "#57534e", textDecoration: "none", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fafaf9")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "#a8a29e" }}>
                  <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
                </svg>
                Account settings
              </a>
              <a
                href="/dashboard/account"
                onClick={() => setOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", fontSize: 13, color: "#57534e", textDecoration: "none", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fafaf9")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "#a8a29e" }}>
                  <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                Billing
              </a>
            </div>

            <div style={{ borderTop: "1px solid #f5f5f4", padding: "4px 0" }}>
              <button
                onClick={signOut}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", fontSize: 13, color: "#dc2626",
                  background: "none", border: "none", cursor: "pointer", textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fff5f5")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardNav({
  firstName,
  email,
}: {
  firstName?: string;
  email: string;
  stageIndex?: number;
}) {
  const pathname = usePathname();

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(250,250,249,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e7e5e4" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 16 }}>

        {/* Brand */}
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, textDecoration: "none" }}>
          <div style={{ height: 28, width: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #4f46e5, #0f172a)", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#0c0a09", letterSpacing: "-0.03em" }}>Volcity</span>
        </a>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }} className="hidden md:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <a
                key={href}
                href={href}
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  padding: "5px 14px",
                  borderRadius: 999,
                  transition: "all 0.15s ease-out",
                  background: active ? "#0f172a" : "transparent",
                  color: active ? "#ffffff" : "#78716c",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#f5f5f4"; e.currentTarget.style.color = "#0c0a09"; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#78716c"; } }}
              >
                {label}
              </a>
            );
          })}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Account avatar */}
        <AccountAvatar firstName={firstName} email={email} />
      </div>
    </header>
  );
}
