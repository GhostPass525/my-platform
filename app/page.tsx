import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif", color: "#1A1A1A" }}>
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(245,244,240,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #EBEBEB",
          padding: "0 32px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#1A1A1A", letterSpacing: "-0.3px" }}>Volcity</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="/auth/login"
            style={{ fontSize: 14, fontWeight: 500, color: "#6B7280", textDecoration: "none" }}
          >
            Sign in
          </a>
          <a
            href="/auth/signup"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: "#2563EB",
              padding: "8px 18px",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Get started free
          </a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section
        style={{
          background: "#F5F4F0",
          padding: "96px 24px 80px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#2563EB",
              marginBottom: 20,
            }}
          >
            AI-Powered Business Builder
          </div>

          <h1
            style={{
              fontSize: "clamp(36px, 5vw, 52px)",
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-1.5px",
              color: "#1A1A1A",
              margin: "0 0 20px",
            }}
          >
            Build your online business.
            <br />
            No code. No confusion.
          </h1>

          <p
            style={{
              fontSize: 18,
              color: "#6B7280",
              lineHeight: 1.6,
              maxWidth: 500,
              margin: "0 auto 36px",
            }}
          >
            Volcity is your AI mentor, store builder, and launch platform in one place.
          </p>

          <a
            href="/auth/signup"
            style={{
              display: "inline-block",
              background: "#2563EB",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              padding: "14px 32px",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Create your free account
          </a>

          <div style={{ marginTop: 12, fontSize: 13, color: "#9CA3AF" }}>
            Free to start · No credit card required
          </div>

          {/* Browser mockup */}
          <div
            style={{
              marginTop: 52,
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid #E2E8F0",
              boxShadow: "0 24px 80px rgba(0,0,0,0.12)",
              background: "#fff",
            }}
          >
            {/* Browser chrome */}
            <div
              style={{
                background: "#F3F4F6",
                padding: "10px 16px",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E" }} />
              <div
                style={{
                  flex: 1,
                  marginLeft: 12,
                  height: 22,
                  background: "#fff",
                  borderRadius: 6,
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 10,
                  fontSize: 11,
                  color: "#9CA3AF",
                }}
              >
                ventureos.app/builder
              </div>
            </div>
            {/* App mockup */}
            <div style={{ height: 340, background: "#F7F6F3", display: "flex" }}>
              {/* Left panel */}
              <div style={{ width: "25%", borderRight: "1px solid #EBEBEB", background: "#F7F6F3", padding: 16 }}>
                <div style={{ width: "60%", height: 8, background: "#E5E7EB", borderRadius: 4, marginBottom: 12 }} />
                {[80, 65, 90, 70].map((w, i) => (
                  <div key={i} style={{ width: `${w}%`, height: 6, background: "#E5E7EB", borderRadius: 3, marginBottom: 8 }} />
                ))}
                <div style={{ marginTop: 20, width: "80%", height: 28, background: "#DBEAFE", borderRadius: 6 }} />
              </div>
              {/* Center preview */}
              <div style={{ flex: 1, background: "#fff", position: "relative" }}>
                <div style={{ background: "#1E293B", height: "42%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                  <div style={{ width: "50%", height: 10, background: "rgba(255,255,255,0.7)", borderRadius: 4 }} />
                  <div style={{ width: "35%", height: 7, background: "rgba(255,255,255,0.4)", borderRadius: 3 }} />
                  <div style={{ width: 72, height: 22, background: "#2563EB", borderRadius: 5, marginTop: 4 }} />
                </div>
                <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{ background: "#F9FAFB", borderRadius: 8, border: "1px solid #E5E7EB", padding: 8 }}>
                      <div style={{ height: 48, background: "#E5E7EB", borderRadius: 5, marginBottom: 6 }} />
                      <div style={{ height: 6, background: "#D1D5DB", borderRadius: 3, width: "70%", marginBottom: 4 }} />
                      <div style={{ height: 5, background: "#E5E7EB", borderRadius: 3, width: "45%" }} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Right panel */}
              <div style={{ width: "22%", borderLeft: "1px solid #EBEBEB", background: "#F7F6F3", padding: 12 }}>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                  {["Quick", "Design", "Pages"].map((t) => (
                    <div key={t} style={{ padding: "3px 8px", borderRadius: 4, background: t === "Quick" ? "#DBEAFE" : "#E5E7EB", fontSize: 9, color: t === "Quick" ? "#2563EB" : "#6B7280" }}>{t}</div>
                  ))}
                </div>
                {[100, 85, 90, 75, 88].map((w, i) => (
                  <div key={i} style={{ height: 28, background: "#fff", borderRadius: 6, border: "1px solid #E5E7EB", marginBottom: 6 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────── */}
      <section style={{ background: "#F9F9F7", padding: "80px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 12 }}>
            How it works
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.5px", color: "#1A1A1A", marginBottom: 48 }}>
            From idea to live store in minutes
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
                title: "Describe your idea",
                desc: "Tell your AI mentor what you want to sell. It builds your store from your words.",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                ),
                title: "Customize your store",
                desc: "Drag, drop, and design. Make it yours without touching a line of code.",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                  </svg>
                ),
                title: "Launch and sell",
                desc: "Publish with one click and start accepting payments immediately.",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: 28,
                  border: "1px solid #EBEBEB",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "#EFF6FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  {icon}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A", marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Volcity ─────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "64px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF", marginBottom: 12 }}>
            Built for first-time entrepreneurs
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.4px", color: "#1A1A1A", marginBottom: 36 }}>
            Everything you need to start selling
          </h2>
          <div style={{ textAlign: "left", display: "inline-block" }}>
            {[
              "No coding required — ever",
              "Your store live in under an hour",
              "AI mentor available 24/7",
              "Real Stripe payments from day one",
              "7-day free trial — no commitment needed",
            ].map((feat) => (
              <div key={feat} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#EFF6FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span style={{ fontSize: 15, color: "#374151", lineHeight: 1.5 }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section style={{ background: "#F5F4F0", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.8px", color: "#1A1A1A", marginBottom: 12 }}>
            Ready to build something?
          </h2>
          <p style={{ fontSize: 16, color: "#6B7280", marginBottom: 32 }}>
            Start building your store today. Free to start.
          </p>
          <a
            href="/auth/signup"
            style={{
              display: "inline-block",
              background: "#2563EB",
              color: "#fff",
              fontSize: 17,
              fontWeight: 600,
              padding: "16px 36px",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Get started free
          </a>
          <div style={{ marginTop: 12, fontSize: 13, color: "#9CA3AF" }}>No credit card required</div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid #EBEBEB",
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span style={{ fontSize: 13, color: "#6B7280" }}>© {new Date().getFullYear()} Volcity</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Contact", href: "#" },
          ].map(({ label, href }) => (
            <a key={label} href={href} style={{ fontSize: 13, color: "#9CA3AF", textDecoration: "none" }}>
              {label}
            </a>
          ))}
        </div>
      </footer>
    </main>
  );
}
