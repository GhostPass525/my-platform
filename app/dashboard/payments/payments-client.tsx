"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from "@stripe/react-connect-js";

type Phase = "pre" | "onboarding" | "success";

const CARD: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #e7e5e4",
  padding: "32px 36px",
};

// ── Educational "pre" screen ─────────────────────────────────────────────────
function PreScreen({
  onStart,
  starting,
  exitedEarly,
}: {
  onStart: () => void;
  starting: boolean;
  exitedEarly: boolean;
}) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      {exitedEarly && (
        <div style={{ marginBottom: 20, padding: "12px 16px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, fontSize: 13, color: "#92400E" }}>
          No worries — your progress was saved. Pick up where you left off anytime.
        </div>
      )}

      <div style={CARD}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #4f46e5, #0f172a)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Let&apos;s get you paid
          </h1>
          <p style={{ fontSize: 15, color: "#666", margin: 0, lineHeight: 1.6 }}>
            Activate Volcity Payments to accept credit cards from your customers — no coding, no contracts.
          </p>
        </div>

        {/* What you'll need */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 14 }}>
            What you&apos;ll need
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "🪪", label: "Government ID", sub: "Driver's license or passport" },
              { icon: "🏦", label: "Bank account", sub: "For receiving your payouts" },
              { icon: "📋", label: "Basic business info", sub: "Name, address, business type" },
              { icon: "⏱️", label: "About 5 minutes", sub: "Set up once, then you're done" },
            ].map(({ icon, label, sub }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 10, background: "#FAFAF8", border: "1px solid #F0EFED" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{label}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          disabled={starting}
          style={{
            width: "100%",
            padding: "14px 24px",
            borderRadius: 12,
            border: "none",
            background: starting ? "#c7d2fe" : "linear-gradient(135deg, #4f46e5, #3730a3)",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor: starting ? "not-allowed" : "pointer",
            letterSpacing: "-0.01em",
            transition: "opacity 0.15s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {starting ? (
            <>
              <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
              Setting up…
            </>
          ) : (
            "Get Started — 5 minutes"
          )}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "#AAA", marginTop: 12, marginBottom: 0 }}>
          Volcity takes a 5% platform fee — you keep the rest.
        </p>
      </div>

      {/* Reassurances */}
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { icon: "🔒", text: "Bank-level security — Powered by Stripe (trusted by Shopify, Amazon, Lyft)" },
          { icon: "💰", text: "Get paid every 2 business days directly to your bank account" },
          { icon: "📊", text: "Track all your sales and payouts in your Volcity dashboard" },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#fff", border: "1px solid #F0EFED" }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
            <span style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{text}</span>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#CCC", marginTop: 20 }}>
        Volcity Payments is powered by Stripe, Inc.
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ onDashboard }: { onDashboard: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/s/my-store").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ ...CARD, textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
          Volcity Payments is active!
        </h1>
        <p style={{ fontSize: 15, color: "#666", margin: "0 0 28px", lineHeight: 1.6 }}>
          You can now accept credit cards from your customers. Your first payout arrives 2 business days after your first sale.
        </p>

        {/* Checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, textAlign: "left" }}>
          {[
            { done: true, label: "Volcity Payments active" },
            { done: false, label: "Share your store link" },
            { done: false, label: "Make your first sale" },
          ].map(({ done, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: done ? "#F0FDF4" : "#FAFAF8", border: `1px solid ${done ? "#BBF7D0" : "#F0EFED"}` }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${done ? "#16a34a" : "#D1D5DB"}`, background: done ? "#16a34a" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {done && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                )}
              </div>
              <span style={{ fontSize: 14, fontWeight: done ? 600 : 400, color: done ? "#166534" : "#555" }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={onDashboard}
            style={{ width: "100%", padding: "13px 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #4f46e5, #3730a3)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.01em" }}
          >
            Go to Payments Dashboard
          </button>
          <button
            onClick={copyLink}
            style={{ width: "100%", padding: "13px 24px", borderRadius: 12, border: "1px solid #e7e5e4", background: "#FAFAF8", color: "#1A1A1A", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            {copied ? "✓ Link Copied!" : "Share Store Link"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PaymentsClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("pre");
  const [starting, setStarting] = useState(false);
  const [exitedEarly, setExitedEarly] = useState(false);
  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/stripe/account-session", { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create account session");
    return data.client_secret as string;
  }, []);

  const handleGetStarted = useCallback(async () => {
    setStarting(true);
    try {
      const instance = loadConnectAndInitialize({
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
        fetchClientSecret,
        appearance: {
          overlays: "dialog",
          variables: {
            colorPrimary: "#4f46e5",
            buttonPrimaryColorBackground: "#4f46e5",
            fontFamily: "inherit",
            borderRadius: "8px",
          },
        },
      });
      setConnectInstance(instance);
      setPhase("onboarding");
    } catch (e) {
      console.error("[payments] failed to init Connect:", e);
    } finally {
      setStarting(false);
    }
  }, [fetchClientSecret]);

  const handleExit = useCallback(async () => {
    // Check if onboarding completed
    try {
      const res = await fetch("/api/connect/status");
      const data = await res.json();
      if (data.charges_enabled) {
        setPhase("success");
      } else {
        setExitedEarly(true);
        setPhase("pre");
      }
    } catch {
      setExitedEarly(true);
      setPhase("pre");
    }
  }, []);

  if (phase === "success") {
    return <SuccessScreen onDashboard={() => router.push("/dashboard/connect")} />;
  }

  if (phase === "onboarding" && connectInstance) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => { setExitedEarly(true); setPhase("pre"); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: "4px 8px", borderRadius: 6, fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", margin: 0, letterSpacing: "-0.01em" }}>
              Volcity Payments Setup
            </h1>
            <p style={{ fontSize: 13, color: "#888", margin: "2px 0 0" }}>Secured by Stripe</p>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e7e5e4", overflow: "hidden", minHeight: 500 }}>
          <ConnectComponentsProvider connectInstance={connectInstance}>
            <ConnectAccountOnboarding onExit={handleExit} />
          </ConnectComponentsProvider>
        </div>
      </div>
    );
  }

  return (
    <PreScreen
      onStart={handleGetStarted}
      starting={starting}
      exitedEarly={exitedEarly}
    />
  );
}
