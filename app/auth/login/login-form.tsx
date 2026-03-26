"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #E0E0E0",
  fontSize: 15,
  color: "#1A1A1A",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    const next = searchParams.get("next") ?? "/dashboard";
    router.push(next);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Email address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Password</label>
          <a href="#" style={{ fontSize: 12, color: "#2563EB", textDecoration: "none" }}>Forgot password?</a>
        </div>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      {error && (
        <div style={{ fontSize: 13, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px" }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          height: 44,
          width: "100%",
          borderRadius: 8,
          border: "none",
          background: loading ? "#93C5FD" : "#2563EB",
          color: "#fff",
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "background 0.15s",
          marginTop: 4,
        }}
      >
        {loading && <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <p style={{ textAlign: "center", fontSize: 14, color: "#6B7280", margin: 0 }}>
        Don&apos;t have an account?{" "}
        <a href="/auth/signup" style={{ color: "#2563EB", fontWeight: 500, textDecoration: "none" }}>
          Create one free
        </a>
      </p>
    </form>
  );
}
