"use client";

import { useState } from "react";

export type StageId = "idea" | "setup" | "launch" | "sale" | "growing";

const STAGES: { id: StageId; label: string; description: string; next: string }[] = [
  {
    id: "idea",
    label: "Idea",
    description: "You have a concept worth building.",
    next: "Build your store and add products.",
  },
  {
    id: "setup",
    label: "Setup",
    description: "Your store is built with products ready.",
    next: "Publish to get your live URL.",
  },
  {
    id: "launch",
    label: "Launch",
    description: "Your store is live on the internet.",
    next: "Share your link and land your first sale.",
  },
  {
    id: "sale",
    label: "First Sale",
    description: "You've made your first real sale.",
    next: "Build consistency and grow your audience.",
  },
  {
    id: "growing",
    label: "Growing",
    description: "Consistent sales are coming in.",
    next: "Scale your marketing and expand your catalog.",
  },
];

export function computeStageIndex(
  hasSite: boolean,
  hasProducts: boolean,
  hasPublished: boolean,
  ordersCount: number
): number {
  if (ordersCount >= 3) return 4;
  if (ordersCount >= 1) return 3;
  if (hasPublished) return 2;
  if (hasSite && hasProducts) return 1;
  return 0;
}

type Props = {
  activeIndex: number;
  accent?: string;
};

export default function StageTracker({ activeIndex, accent = "#2563eb" }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const toggle = (i: number) => setSelected((prev) => (prev === i ? null : i));

  return (
    <div style={{ padding: "10px 14px 0" }}>
      {/* Stepper row */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {STAGES.map((stage, i) => {
          const completed = i < activeIndex;
          const active = i === activeIndex;
          const isSelected = selected === i;

          return (
            <div
              key={stage.id}
              style={{
                display: "flex",
                alignItems: "center",
                flex: i < STAGES.length - 1 ? 1 : undefined,
              }}
            >
              {/* Circle */}
              <button
                title={stage.label}
                onClick={() => toggle(i)}
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.18s",
                  background: completed
                    ? "#22c55e"
                    : active
                    ? accent
                    : "transparent",
                  border: completed
                    ? "none"
                    : active
                    ? `2px solid ${accent}`
                    : "1.5px solid #cbd5e1",
                  boxShadow:
                    active
                      ? `0 0 0 3px ${accent}20`
                      : isSelected
                      ? `0 0 0 3px rgba(0,0,0,0.08)`
                      : "none",
                  outline: "none",
                  padding: 0,
                }}
              >
                {completed && (
                  <svg width="7" height="7" viewBox="0 0 12 12" fill="none">
                    <polyline
                      points="2,6 5,9 10,3"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>

              {/* Connector */}
              {i < STAGES.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 1.5,
                    transition: "background 0.3s",
                    background:
                      i < activeIndex - 1
                        ? "#22c55e"
                        : i === activeIndex - 1
                        ? `linear-gradient(90deg, #22c55e 50%, ${accent}44)`
                        : i === activeIndex
                        ? `linear-gradient(90deg, ${accent}44, #e2e8f0)`
                        : "#e2e8f0",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current stage label row */}
      <div
        style={{
          marginTop: 6,
          marginBottom: selected !== null ? 0 : 10,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 10, color: "#94a3b8" }}>Stage:</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: accent }}>
          {STAGES[activeIndex]?.label}
        </span>
        {activeIndex < STAGES.length - 1 && (
          <span style={{ fontSize: 10, color: "#94a3b8" }}>
            → {STAGES[activeIndex + 1]?.label}
          </span>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "#94a3b8",
            cursor: "pointer",
          }}
          onClick={() => toggle(activeIndex)}
        >
          {selected !== null ? "▲" : "▾"}
        </span>
      </div>

      {/* Expandable info card */}
      {selected !== null && (
        <div
          style={{
            margin: "6px 0 10px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "10px 12px",
            animation: "slideUp 0.15s ease-out both",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 5,
            }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background:
                  selected < activeIndex
                    ? "#22c55e"
                    : selected === activeIndex
                    ? accent
                    : "#e2e8f0",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color:
                  selected < activeIndex
                    ? "#16a34a"
                    : selected === activeIndex
                    ? accent
                    : "#94a3b8",
              }}
            >
              {STAGES[selected].label}
              {selected < activeIndex && " ✓"}
            </span>
          </div>
          <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 6px", lineHeight: 1.55 }}>
            {STAGES[selected].description}
          </p>
          {selected < STAGES.length - 1 && (
            <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.55 }}>
              <span style={{ color: accent, fontWeight: 600 }}>
                {selected < activeIndex ? "Completed → " : "Next → "}
              </span>
              {selected < activeIndex
                ? STAGES[selected + 1].label
                : STAGES[selected].next}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
