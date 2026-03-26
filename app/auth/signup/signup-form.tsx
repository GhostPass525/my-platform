"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function SignupForm() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1A", marginBottom: 8, letterSpacing: "-0.3px" }}>Welcome to VentureOS</h2>
        <p style={{ fontSize: 15, color: "#6B7280", marginBottom: 28 }}>Your AI mentor is ready to help you build.</p>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            height: 44, padding: "0 28px", borderRadius: 8, border: "none",
            background: "#2563EB", color: "#fff", fontSize: 15, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Start building
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Email address</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Password</label>
        <input
          type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 6 characters" style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>Confirm password</label>
        <input
          type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••" style={inputStyle}
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
        type="submit" disabled={loading}
        style={{
          height: 44, width: "100%", borderRadius: 8, border: "none",
          background: loading ? "#93C5FD" : "#2563EB", color: "#fff",
          fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "background 0.15s", marginTop: 4,
        }}
      >
        {loading && <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
        {loading ? "Creating account…" : "Create account"}
      </button>

      <p style={{ textAlign: "center", fontSize: 14, color: "#6B7280", margin: 0 }}>
        Already have an account?{" "}
        <a href="/auth/login" style={{ color: "#2563EB", fontWeight: 500, textDecoration: "none" }}>Sign in</a>
      </p>
    </form>
  );
}
