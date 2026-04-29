import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import SignupForm from "./signup-form";

export default async function SignupPage() {
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
          Create your account
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 28px" }}>
          Free to start. No credit card required.
        </p>
        <Suspense fallback={null}>
          <SignupForm />
        </Suspense>
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
        By signing up you agree to our Terms and Privacy Policy.
      </p>
    </main>
  );
}
