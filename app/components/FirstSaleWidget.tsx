"use client";

import { useState, useEffect } from "react";

type Step = {
  label: string;
  cta: string;
  mentorOpener: (brandName: string) => string;
};

const STEPS: Step[] = [
  {
    label: "Share your store link with 5 people you know",
    cta: "Write the message",
    mentorOpener: (b) =>
      `Want me to write a short, personal message you can copy and send to 5 people about ${b || "your store"}? I'll keep it real — not salesy.`,
  },
  {
    label: "Create a launch discount code (10–20% off)",
    cta: "Get advice",
    mentorOpener: (b) =>
      `I can help you think through your launch discount strategy for ${b || "your store"}. Should you go 10% or 20%? Let's figure out what makes sense for your margin.`,
  },
  {
    label: "Post on one social platform",
    cta: "Write the post",
    mentorOpener: (b) =>
      `Let me write your first social media post for ${b || "your store"} right now. Tell me which platform (Instagram, TikTok, LinkedIn, etc.) and I'll make it feel authentic.`,
  },
  {
    label: "Message your email list (or first 10 contacts)",
    cta: "Draft the email",
    mentorOpener: (b) =>
      `A personal email to your first 10 contacts can be more powerful than any ad. Want me to write one for ${b || "your store"} that feels genuine — not like a newsletter blast?`,
  },
  {
    label: "Ask a friend to make a test purchase",
    cta: "How to ask",
    mentorOpener: (b) =>
      `A test purchase on ${b || "your store"} is worth doing before you go wide. I'll tell you exactly what to ask your friend to check — and how to ask without being awkward.`,
  },
];

const STORAGE_KEY = "first_sale_checklist";

type Props = {
  brandName: string;
  totalRevenue: number;
  onStepClick: (mentorMessage: string) => void;
};

export default function FirstSaleWidget({ brandName, totalRevenue, onStepClick }: Props) {
  const [checked, setChecked] = useState<boolean[]>(Array(STEPS.length).fill(false));

  // Load checked state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === STEPS.length) {
          setChecked(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const toggle = (i: number) => {
    const next = checked.map((v, idx) => (idx === i ? !v : v));
    setChecked(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const completedCount = checked.filter(Boolean).length;
  const progress = (completedCount / STEPS.length) * 100;

  return (
    <div
      className="card animate-fadeIn"
      style={{
        marginBottom: 28,
        overflow: "hidden",
      }}
    >
      {/* Top accent */}
      <div
        style={{
          height: 3,
          background: "linear-gradient(90deg, #2563eb, #7c3aed)",
        }}
      />

      <div style={{ padding: "20px 22px" }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#2563eb",
                  animation: "livePulse 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#2563eb",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Get Your First Sale
              </span>
            </div>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.02em",
                margin: 0,
                lineHeight: 1,
              }}
            >
              $0.00
            </h2>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
              Revenue — your first sale is one step away
            </p>
          </div>

          {/* Progress ring */}
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: `conic-gradient(#2563eb ${progress * 3.6}deg, #f1f5f9 0deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 6,
                  borderRadius: "50%",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: completedCount === STEPS.length ? "#2563eb" : "#64748b",
                  }}
                >
                  {completedCount}/{STEPS.length}
                </span>
              </div>
            </div>
            <p style={{ fontSize: 10, color: "#94a3b8", margin: "4px 0 0" }}>steps done</p>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 4,
            background: "#f1f5f9",
            borderRadius: 99,
            marginBottom: 18,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #2563eb, #7c3aed)",
              borderRadius: 99,
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {/* Checklist label */}
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#64748b",
            marginBottom: 12,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Here&apos;s how to get your first sale:
        </p>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STEPS.map((step, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 11,
                background: checked[i] ? "#f0fdf4" : "#f8fafc",
                border: `1px solid ${checked[i] ? "#bbf7d0" : "#e2e8f0"}`,
                transition: "all 0.15s",
              }}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggle(i)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: checked[i] ? "none" : "2px solid #cbd5e1",
                  background: checked[i] ? "#22c55e" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s",
                  padding: 0,
                  outline: "none",
                }}
              >
                {checked[i] && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <polyline
                      points="2,6 5,9 10,3"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>

              {/* Label */}
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: checked[i] ? "#64748b" : "#334155",
                  textDecoration: checked[i] ? "line-through" : "none",
                  lineHeight: 1.4,
                }}
              >
                {step.label}
              </span>

              {/* CTA */}
              {!checked[i] && (
                <button
                  onClick={() => onStepClick(step.mentorOpener(brandName))}
                  style={{
                    flexShrink: 0,
                    padding: "4px 10px",
                    borderRadius: 7,
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                    color: "#2563eb",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#dbeafe";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#eff6ff";
                  }}
                >
                  {step.cta} →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
