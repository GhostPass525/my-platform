"use client";

import { useRef, useState, useCallback, useEffect } from "react";

type Props = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  initialX?: number;
  initialY?: number;
  width?: number;
};

export default function FloatingPanel({ title, onClose, children, initialX = 80, initialY = 80, width = 320 }: Props) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [minimized, setMinimized] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width,
        zIndex: 100,
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.06)",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* Header / drag handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          background: "#F7F6F3",
          borderBottom: minimized ? "none" : "1px solid #E8E8E4",
          cursor: "grab",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="#CBD5E1">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="5" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="6" r="1.5" />
            <circle cx="5" cy="6" r="1.5" />
            <circle cx="8" cy="6" r="1.5" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => setMinimized((v) => !v)}
            title={minimized ? "Expand" : "Minimize"}
            style={{
              width: 22,
              height: 22,
              border: "none",
              borderRadius: 5,
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9CA3AF",
              fontSize: 14,
              lineHeight: 1,
              padding: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#EEE"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {minimized ? "+" : "−"}
          </button>
          <button
            onClick={onClose}
            title="Close"
            style={{
              width: 22,
              height: 22,
              border: "none",
              borderRadius: 5,
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9CA3AF",
              fontSize: 14,
              lineHeight: 1,
              padding: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#FFEBEB"; e.currentTarget.style.color = "#EF4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9CA3AF"; }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div style={{ padding: "14px 14px 14px", userSelect: "text" }}>
          {children}
        </div>
      )}
    </div>
  );
}
