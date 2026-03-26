"use client";

import { useState } from "react";
import { LayoutId } from "./LayoutTemplates";

// ─── Layout configs ───────────────────────────────────────────────
const LAYOUTS = [
  {
    id: "big-hero" as LayoutId,
    name: "Big Hero",
    description: "Full-width dramatic hero, content-first. Like Nike or Apple.",
    category: "Bold & Hero",
  },
  {
    id: "split-screen" as LayoutId,
    name: "Split Screen",
    description: "Modern, editorial, balanced. Half text, half image.",
    category: "Split Screen",
  },
  {
    id: "centered-minimal" as LayoutId,
    name: "Centered Minimal",
    description: "Clean, breathing, premium. Everything centered with whitespace.",
    category: "Minimal",
  },
  {
    id: "editorial-magazine" as LayoutId,
    name: "Editorial Magazine",
    description: "Bold, asymmetric, typographic. Like a fashion magazine.",
    category: "Editorial",
  },
  {
    id: "classic-shop" as LayoutId,
    name: "Classic Shop",
    description: "Familiar ecommerce. Trustworthy and conversion-focused.",
    category: "Classic Shop",
  },
  {
    id: "one-page-scroll" as LayoutId,
    name: "One Page Scroll",
    description: "Startup landing page. Storytelling-focused, all in one scroll.",
    category: "Minimal",
  },
];

const CATEGORIES = ["All", "Bold & Hero", "Minimal", "Split Screen", "Editorial", "Classic Shop"];

// ─── SVG Wireframes ───────────────────────────────────────────────
function LayoutWireframe({ id }: { id: LayoutId }) {
  const W = 240;
  const H = 180;

  if (id === "big-hero") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width={W} height={H} fill="#F9FAFB" />
        {/* Hero */}
        <rect x={0} y={0} width={W} height={95} rx={0} fill="#D1D5DB" />
        <rect x={60} y={36} width={120} height={12} rx={3} fill="#9CA3AF" />
        <rect x={80} y={56} width={80} height={8} rx={3} fill="#9CA3AF" />
        <rect x={96} y={70} width={48} height={14} rx={4} fill="#6B7280" />
        {/* 3 product cards */}
        <rect x={4} y={102} width={72} height={60} rx={4} fill="#E5E7EB" />
        <rect x={84} y={102} width={72} height={60} rx={4} fill="#E5E7EB" />
        <rect x={164} y={102} width={72} height={60} rx={4} fill="#E5E7EB" />
        {/* Card inner lines */}
        <rect x={8} y={146} width={64} height={6} rx={2} fill="#D1D5DB" />
        <rect x={88} y={146} width={64} height={6} rx={2} fill="#D1D5DB" />
        <rect x={168} y={146} width={64} height={6} rx={2} fill="#D1D5DB" />
        {/* Footer */}
        <rect x={0} y={168} width={W} height={12} rx={0} fill="#E5E7EB" />
      </svg>
    );
  }

  if (id === "split-screen") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width={W} height={H} fill="#F9FAFB" />
        {/* Split hero: left text, right image */}
        <rect x={0} y={0} width={118} height={95} rx={0} fill="#E5E7EB" />
        <rect x={122} y={0} width={118} height={95} rx={0} fill="#D1D5DB" />
        {/* Left text lines */}
        <rect x={10} y={22} width={88} height={10} rx={3} fill="#D1D5DB" />
        <rect x={10} y={38} width={70} height={7} rx={2} fill="#E5E7EB" />
        <rect x={10} y={52} width={50} height={7} rx={2} fill="#E5E7EB" />
        <rect x={10} y={68} width={42} height={14} rx={4} fill="#9CA3AF" />
        {/* 2-col product grid */}
        <rect x={4} y={102} width={113} height={58} rx={4} fill="#E5E7EB" />
        <rect x={123} y={102} width={113} height={58} rx={4} fill="#E5E7EB" />
        {/* Card inner lines */}
        <rect x={8} y={145} width={60} height={6} rx={2} fill="#D1D5DB" />
        <rect x={127} y={145} width={60} height={6} rx={2} fill="#D1D5DB" />
      </svg>
    );
  }

  if (id === "centered-minimal") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width={W} height={H} fill="#F9FAFB" />
        {/* Nav */}
        <rect x={0} y={0} width={W} height={18} rx={0} fill="#E5E7EB" />
        {/* Centered text rects */}
        <rect x={50} y={28} width={140} height={10} rx={3} fill="#D1D5DB" />
        <rect x={70} y={44} width={100} height={7} rx={2} fill="#E5E7EB" />
        <rect x={86} y={58} width={68} height={12} rx={4} fill="#D1D5DB" />
        {/* 3 small product cards — centered */}
        <rect x={12} y={82} width={64} height={70} rx={4} fill="#E5E7EB" />
        <rect x={88} y={82} width={64} height={70} rx={4} fill="#E5E7EB" />
        <rect x={164} y={82} width={64} height={70} rx={4} fill="#E5E7EB" />
        {/* Card inner */}
        <rect x={16} y={135} width={56} height={5} rx={2} fill="#D1D5DB" />
        <rect x={92} y={135} width={56} height={5} rx={2} fill="#D1D5DB" />
        <rect x={168} y={135} width={56} height={5} rx={2} fill="#D1D5DB" />
      </svg>
    );
  }

  if (id === "editorial-magazine") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width={W} height={H} fill="#F9FAFB" />
        {/* Nav */}
        <rect x={0} y={0} width={W} height={16} rx={0} fill="#E5E7EB" />
        {/* Large oversized text block */}
        <rect x={0} y={22} width={180} height={24} rx={2} fill="#D1D5DB" />
        <rect x={0} y={50} width={220} height={14} rx={2} fill="#E5E7EB" />
        {/* HR */}
        <rect x={0} y={68} width={W} height={2} rx={0} fill="#D1D5DB" />
        {/* Asymmetric: big left card */}
        <rect x={0} y={74} width={120} height={96} rx={4} fill="#E5E7EB" />
        {/* Two stacked right */}
        <rect x={128} y={74} width={108} height={44} rx={4} fill="#E5E7EB" />
        <rect x={128} y={126} width={108} height={44} rx={4} fill="#E5E7EB" />
        {/* Lines on big left */}
        <rect x={4} y={148} width={80} height={6} rx={2} fill="#D1D5DB" />
        <rect x={4} y={158} width={50} height={5} rx={2} fill="#D1D5DB" />
      </svg>
    );
  }

  if (id === "classic-shop") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width={W} height={H} fill="#F9FAFB" />
        {/* Nav */}
        <rect x={0} y={0} width={W} height={16} rx={0} fill="#E5E7EB" />
        {/* Banner */}
        <rect x={0} y={20} width={W} height={50} rx={0} fill="#D1D5DB" />
        <rect x={70} y={33} width={100} height={10} rx={3} fill="#9CA3AF" />
        <rect x={92} y={48} width={56} height={12} rx={4} fill="#6B7280" />
        {/* 3 category cards */}
        <rect x={2} y={78} width={74} height={28} rx={3} fill="#E5E7EB" />
        <rect x={83} y={78} width={74} height={28} rx={3} fill="#E5E7EB" />
        <rect x={164} y={78} width={74} height={28} rx={3} fill="#E5E7EB" />
        {/* 4 product cards */}
        <rect x={2} y={114} width={54} height={40} rx={3} fill="#E5E7EB" />
        <rect x={62} y={114} width={54} height={40} rx={3} fill="#E5E7EB" />
        <rect x={122} y={114} width={54} height={40} rx={3} fill="#E5E7EB" />
        <rect x={182} y={114} width={56} height={40} rx={3} fill="#E5E7EB" />
        {/* Trust bar */}
        <rect x={0} y={160} width={W} height={12} rx={0} fill="#E5E7EB" />
      </svg>
    );
  }

  if (id === "one-page-scroll") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width={W} height={H} fill="#F9FAFB" />
        {/* Nav */}
        <rect x={0} y={0} width={W} height={16} rx={0} fill="#E5E7EB" />
        {/* Section 1 - hero (dark) */}
        <rect x={0} y={20} width={W} height={36} rx={0} fill="#D1D5DB" />
        <rect x={60} y={28} width={120} height={8} rx={3} fill="#9CA3AF" />
        <rect x={90} y={40} width={60} height={10} rx={3} fill="#9CA3AF" />
        {/* Section 2 - features (light) */}
        <rect x={0} y={60} width={W} height={30} rx={0} fill="#F3F4F6" />
        <rect x={10} y={68} width={64} height={14} rx={3} fill="#E5E7EB" />
        <rect x={88} y={68} width={64} height={14} rx={3} fill="#E5E7EB" />
        <rect x={166} y={68} width={64} height={14} rx={3} fill="#E5E7EB" />
        {/* Section 3 - products (gray) */}
        <rect x={0} y={94} width={W} height={32} rx={0} fill="#E5E7EB" />
        <rect x={10} y={100} width={66} height={20} rx={3} fill="#D1D5DB" />
        <rect x={88} y={100} width={66} height={20} rx={3} fill="#D1D5DB" />
        <rect x={166} y={100} width={66} height={20} rx={3} fill="#D1D5DB" />
        {/* Section 4 - testimonials (white) */}
        <rect x={0} y={130} width={W} height={26} rx={0} fill="#F9FAFB" />
        <rect x={6} y={136} width={70} height={14} rx={3} fill="#E5E7EB" />
        <rect x={85} y={136} width={70} height={14} rx={3} fill="#E5E7EB" />
        <rect x={164} y={136} width={70} height={14} rx={3} fill="#E5E7EB" />
        {/* Footer */}
        <rect x={0} y={160} width={W} height={20} rx={0} fill="#D1D5DB" />
        <rect x={80} y={166} width={80} height={7} rx={2} fill="#9CA3AF" />
      </svg>
    );
  }

  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}><rect width={W} height={H} fill="#F9FAFB" /></svg>;
}

// ─── Props ────────────────────────────────────────────────────────
type Props = {
  activeLayout?: LayoutId;
  onPreview: (id: LayoutId | null) => void;
  onApply: (id: LayoutId) => void;
  onClose: () => void;
};

// ─── Modal ────────────────────────────────────────────────────────
export default function LayoutPickerModal({ activeLayout, onPreview, onApply, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All"
    ? LAYOUTS
    : LAYOUTS.filter((l) => l.category === activeCategory);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "#fff",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px 48px" }}>
        {/* Header */}
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "#64748B",
            padding: "0 0 20px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back to builder
        </button>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: 0 }}>Choose a layout</h1>
        <p style={{ marginTop: 6, fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
          Pick how your storefront is structured. Your content stays the same.
        </p>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "22px 0 28px" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${activeCategory === cat ? "#2563EB" : "#E2E8F0"}`,
                background: activeCategory === cat ? "#EFF6FF" : "transparent",
                color: activeCategory === cat ? "#2563EB" : "#64748B",
                fontSize: 12,
                fontWeight: activeCategory === cat ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid of layout cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {filtered.map((layout) => {
            const isActive = activeLayout === layout.id;
            return (
              <div
                key={layout.id}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${isActive ? "#2563EB" : "#E8E8E4"}`,
                  overflow: "hidden",
                  background: "#fff",
                  position: "relative",
                  boxShadow: isActive ? "0 0 0 3px rgba(37,99,235,0.12)" : "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = "#2563EB";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = "#E8E8E4";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {/* Active badge */}
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      zIndex: 2,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#2563EB",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </div>
                )}

                {/* Wireframe */}
                <div style={{ height: 180, overflow: "hidden", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <LayoutWireframe id={layout.id} />
                </div>

                {/* Card info */}
                <div style={{ padding: "14px 14px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{layout.name}</div>
                    {isActive && (
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "2px 7px", borderRadius: 10 }}>
                        Active
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, margin: "0 0 12px" }}>
                    {layout.description}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => onPreview(layout.id)}
                      style={{
                        flex: 1,
                        height: 28,
                        borderRadius: 6,
                        border: "1px solid #E2E8F0",
                        background: "transparent",
                        color: "#475569",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "border-color 0.12s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#94A3B8"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => onApply(layout.id)}
                      style={{
                        flex: 1,
                        height: 28,
                        borderRadius: 6,
                        border: "none",
                        background: "#2563EB",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity: isActive ? 0.6 : 1,
                        transition: "opacity 0.12s",
                      }}
                    >
                      {isActive ? "Applied" : "Use Layout"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
