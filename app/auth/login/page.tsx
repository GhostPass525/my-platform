import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F5F4F0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, textDecoration: "none" }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 17, color: "#1A1A1A", letterSpacing: "-0.3px" }}>Volcity</span>
      </a>

      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 40,
          width: "100%",
          maxWidth: 420,
          border: "1px solid #E8E8E4",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1A1A1A", margin: "0 0 4px", letterSpacing: "-0.3px" }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 28px" }}>
          Sign in to your Volcity account
        </p>
        <Suspense fallback={<div style={{ height: 160, borderRadius: 10, background: "#F3F4F6" }} />}>
          <LoginForm />
        </Suspense>
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
        By signing in you agree to our Terms of Service and Privacy Policy.
      </p>
    </main>
  );
}
