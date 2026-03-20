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

type Props = {
  brandName: string;
  totalRevenue: number;
  userId: string;
  onStepClick: (mentorMessage: string) => void;
};

export default function FirstSaleWidget({ brandName, totalRevenue, userId, onStepClick }: Props) {
  const [checked, setChecked] = useState<boolean[]>(Array(STEPS.length).fill(false));

  const storageKey = `first_sale_checklist_${userId}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === STEPS.length) {
          setChecked(parsed);
        }
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const toggle = (i: number) => {
    const next = checked.map((v, idx) => (idx === i ? !v : v));
    setChecked(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const completedCount = checked.filter(Boolean).length;
  const progress = (completedCount / STEPS.length) * 100;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        border: "1px solid #E8E8E4",
        padding: "24px 24px 20px",
        marginBottom: 28,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "#888", margin: "0 0 8px" }}>
          Your first sale checklist
        </p>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#1A1A1A", lineHeight: 1, marginBottom: 4 }}>
          ${totalRevenue.toFixed(2)}
        </div>
        <p style={{ fontSize: 13, color: "#AAA", margin: 0 }}>
          Revenue — your first sale is one step away
        </p>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: "#EEEDE9",
          borderRadius: 2,
          marginBottom: 20,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "#2563EB",
            borderRadius: 2,
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {STEPS.map((step, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              height: 52,
              padding: "0 4px",
              borderBottom: i < STEPS.length - 1 ? "1px solid #F0EFE9" : "none",
              transition: "background 0.12s",
              borderRadius: 6,
              cursor: "default",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFAF8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {/* Checkbox */}
            <button
              onClick={() => toggle(i)}
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: checked[i] ? "none" : "1.5px solid #CBD5E1",
                background: checked[i] ? "#2563EB" : "transparent",
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
                fontSize: 14,
                fontWeight: 400,
                color: checked[i] ? "#9CA3AF" : "#374151",
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
                  background: "none",
                  border: "none",
                  color: "#2563EB",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: "0 4px",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                {step.cta} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
