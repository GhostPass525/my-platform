"use client";

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
  return (
    <div style={{ padding: "12px 16px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "nowrap", gap: 0 }}>
        {STAGES.map((stage, i) => {
          const completed = i < activeIndex;
          const active = i === activeIndex;
          const upcoming = i > activeIndex;

          return (
            <div key={stage.id} style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? 1 : undefined, minWidth: 0 }}>
              {/* Stage label */}
              <div
                title={upcoming ? "Complete current stage to unlock" : stage.description}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  flexShrink: 0,
                  cursor: "default",
                }}
              >
                {completed && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                    <polyline
                      points="2,6 5,9 10,3"
                      stroke="#22c55e"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: active ? 600 : 400,
                    color: completed
                      ? "#86efac"
                      : active
                      ? accent
                      : "#94a3b8",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {stage.label}
                </span>
              </div>

              {/* Arrow separator */}
              {i < STAGES.length - 1 && (
                <span
                  style={{
                    fontSize: 10,
                    color: i < activeIndex ? "#86efac" : "#d1d5db",
                    margin: "0 3px",
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
