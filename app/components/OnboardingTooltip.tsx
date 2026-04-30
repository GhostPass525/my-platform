"use client";

import { useCallback, useEffect, useState } from "react";

export type ArrowDir = "up" | "down" | "left" | "right" | "none";

type Props = {
  storageKey: string;
  message: string;
  dismissLabel?: string;
  autoCloseMs?: number | null; // null = no auto-close
  style?: React.CSSProperties;
  arrowDir?: ArrowDir;
  onDismiss?: () => void;
};

export default function OnboardingTooltip({
  storageKey,
  message,
  dismissLabel = "Got it",
  autoCloseMs = 10000,
  style,
  arrowDir = "up",
  onDismiss,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setVisible(true);
    } catch {}
  }, [storageKey]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
    onDismiss?.();
  }, [storageKey, onDismiss]);

  useEffect(() => {
    if (!visible || autoCloseMs == null) return;
    const t = setTimeout(dismiss, autoCloseMs);
    return () => clearTimeout(t);
  }, [visible, autoCloseMs, dismiss]);

  if (!visible) return null;

  const arrowMap: Record<ArrowDir, React.CSSProperties | null> = {
    up: {
      position: "absolute",
      top: -7,
      left: 18,
      width: 0,
      height: 0,
      borderLeft: "7px solid transparent",
      borderRight: "7px solid transparent",
      borderBottom: "7px solid #0f172a",
    },
    down: {
      position: "absolute",
      bottom: -7,
      left: 18,
      width: 0,
      height: 0,
      borderLeft: "7px solid transparent",
      borderRight: "7px solid transparent",
      borderTop: "7px solid #0f172a",
    },
    left: {
      position: "absolute",
      top: 14,
      left: -7,
      width: 0,
      height: 0,
      borderTop: "7px solid transparent",
      borderBottom: "7px solid transparent",
      borderRight: "7px solid #0f172a",
    },
    right: {
      position: "absolute",
      top: 14,
      right: -7,
      width: 0,
      height: 0,
      borderTop: "7px solid transparent",
      borderBottom: "7px solid transparent",
      borderLeft: "7px solid #0f172a",
    },
    none: null,
  };

  const arrowStyle = arrowMap[arrowDir];

  return (
    <>
      <style>{`
        @keyframes onbFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        role="tooltip"
        style={{
          position: "absolute",
          zIndex: 9999,
          background: "#0f172a",
          color: "#fff",
          borderRadius: 10,
          padding: "12px 14px 10px",
          fontSize: 13,
          lineHeight: 1.55,
          boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
          maxWidth: 270,
          width: "max-content",
          animation: "onbFadeIn 0.22s ease-out both",
          ...style,
        }}
      >
        {arrowStyle && <div style={arrowStyle} />}

        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <p style={{ margin: 0, flex: 1 }}>{message}</p>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              padding: "0 0 0 2px",
              flexShrink: 0,
              fontSize: 18,
              lineHeight: 1,
              fontWeight: 300,
            }}
          >
            ×
          </button>
        </div>

        <button
          onClick={dismiss}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {dismissLabel}
        </button>
      </div>
    </>
  );
}
