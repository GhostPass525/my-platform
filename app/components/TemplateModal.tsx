"use client";

import { useState } from "react";

type Theme = {
  accent: string;
  accent2: string;
  bg: string;
  panel: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
};

type FontChoice =
  | "Inter"
  | "Plus Jakarta Sans"
  | "DM Sans"
  | "Manrope"
  | "Work Sans"
  | "Poppins"
  | "Nunito"
  | "Raleway"
  | "Josefin Sans"
  | "Montserrat"
  | "Space Grotesk"
  | "Syne"
  | "Oswald"
  | "Bebas Neue"
  | "Playfair Display"
  | "Cormorant Garamond"
  | "Lora"
  | "Merriweather"
  | "Fraunces"
  | "Crimson Pro"
  | "Instrument Serif"
  | "Source Serif 4"
  | "Libre Baskerville"
  | "Georgia"
  | "Times New Roman"
  | "Pacifico";

type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  previewBg: string;
  previewAccent: string;
  previewText: string;
  theme: Theme;
  font: FontChoice;
};

const TEMPLATES: Template[] = [
  {
    id: "minimal-clean",
    name: "Minimal Clean",
    description: "White space, crisp type, zero distraction.",
    category: "All",
    previewBg: "#FFFFFF",
    previewAccent: "#171717",
    previewText: "#171717",
    font: "Inter",
    theme: {
      accent: "#171717",
      accent2: "#404040",
      bg: "#FFFFFF",
      panel: "#FFFFFF",
      surface: "#F9F9F9",
      text: "#171717",
      mutedText: "#737373",
      border: "rgba(0,0,0,0.10)",
    },
  },
  {
    id: "bold-dark",
    name: "Bold Dark",
    description: "High contrast, punchy, made for night owls.",
    category: "Digital",
    previewBg: "#09090B",
    previewAccent: "#818CF8",
    previewText: "#FAFAFA",
    font: "Poppins",
    theme: {
      accent: "#818cf8",
      accent2: "#34d399",
      bg: "#09090b",
      panel: "#18181b",
      surface: "#18181b",
      text: "#fafafa",
      mutedText: "#a1a1aa",
      border: "rgba(255,255,255,0.10)",
    },
  },
  {
    id: "warm-natural",
    name: "Warm Natural",
    description: "Earthy tones. Perfect for food, wellness, handmade.",
    category: "Food & Beverage",
    previewBg: "#FFF7ED",
    previewAccent: "#EA580C",
    previewText: "#431407",
    font: "Plus Jakarta Sans",
    theme: {
      accent: "#ea580c",
      accent2: "#f59e0b",
      bg: "#fff7ed",
      panel: "#ffffff",
      surface: "#ffffff",
      text: "#431407",
      mutedText: "#92400e",
      border: "rgba(67,20,7,0.10)",
    },
  },
  {
    id: "modern-blue",
    name: "Modern Blue",
    description: "Trustworthy, professional — great for services.",
    category: "Services",
    previewBg: "#FFFFFF",
    previewAccent: "#2563EB",
    previewText: "#0B1220",
    font: "Inter",
    theme: {
      accent: "#2563eb",
      accent2: "#06b6d4",
      bg: "#ffffff",
      panel: "#ffffff",
      surface: "#ffffff",
      text: "#0b1220",
      mutedText: "#475569",
      border: "rgba(2,6,23,0.10)",
    },
  },
  {
    id: "vibrant-pop",
    name: "Vibrant Pop",
    description: "Bold colors and energy. Apparel, youth brands.",
    category: "Fashion",
    previewBg: "#FAF5FF",
    previewAccent: "#7C3AED",
    previewText: "#2E1065",
    font: "Montserrat",
    theme: {
      accent: "#7c3aed",
      accent2: "#c026d3",
      bg: "#faf5ff",
      panel: "#ffffff",
      surface: "#ffffff",
      text: "#2e1065",
      mutedText: "#6b21a8",
      border: "rgba(46,16,101,0.10)",
    },
  },
  {
    id: "luxury-black",
    name: "Luxury Black",
    description: "Moody, editorial, premium. Jewelry, fashion, art.",
    category: "Fashion",
    previewBg: "#0A0A0A",
    previewAccent: "#D4AF6A",
    previewText: "#F0EBE1",
    font: "Georgia",
    theme: {
      accent: "#d4af6a",
      accent2: "#b5975a",
      bg: "#0a0a0a",
      panel: "#141414",
      surface: "#141414",
      text: "#f0ebe1",
      mutedText: "#8a8070",
      border: "rgba(255,255,255,0.08)",
    },
  },
  {
    id: "soft-pastel",
    name: "Soft Pastel",
    description: "Gentle gradients, feminine, approachable. Beauty, health.",
    category: "Health",
    previewBg: "#FFF1F2",
    previewAccent: "#E11D48",
    previewText: "#881337",
    font: "DM Sans",
    theme: {
      accent: "#e11d48",
      accent2: "#db2777",
      bg: "#fff1f2",
      panel: "#ffffff",
      surface: "#ffffff",
      text: "#881337",
      mutedText: "#9f1239",
      border: "rgba(136,19,55,0.10)",
    },
  },
  {
    id: "urban-street",
    name: "Urban Street",
    description: "Raw, gritty, authentic. Streetwear, sneakers, skate.",
    category: "Fashion",
    previewBg: "#F8FAFC",
    previewAccent: "#475569",
    previewText: "#0F172A",
    font: "Montserrat",
    theme: {
      accent: "#475569",
      accent2: "#64748b",
      bg: "#f8fafc",
      panel: "#ffffff",
      surface: "#ffffff",
      text: "#0f172a",
      mutedText: "#64748b",
      border: "rgba(15,23,42,0.10)",
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    description: "Natural, organic, sustainable. Plants, outdoors, eco brands.",
    category: "Health",
    previewBg: "#F0FDF4",
    previewAccent: "#16A34A",
    previewText: "#14532D",
    font: "DM Sans",
    theme: {
      accent: "#16a34a",
      accent2: "#065f46",
      bg: "#f0fdf4",
      panel: "#ffffff",
      surface: "#ffffff",
      text: "#14532d",
      mutedText: "#4b7a5e",
      border: "rgba(20,83,45,0.12)",
    },
  },
  {
    id: "digital-teal",
    name: "Digital Teal",
    description: "Modern tech-forward aesthetic. SaaS, digital products.",
    category: "Digital",
    previewBg: "#F0FDFA",
    previewAccent: "#0D9488",
    previewText: "#134E4A",
    font: "Plus Jakarta Sans",
    theme: {
      accent: "#0d9488",
      accent2: "#0284c7",
      bg: "#f0fdfa",
      panel: "#ffffff",
      surface: "#ffffff",
      text: "#134e4a",
      mutedText: "#0f766e",
      border: "rgba(19,78,74,0.10)",
    },
  },
  {
    id: "bakery-gold",
    name: "Bakery Gold",
    description: "Warm amber tones. Cafes, bakeries, artisan food.",
    category: "Food & Beverage",
    previewBg: "#FFFBEB",
    previewAccent: "#D97706",
    previewText: "#78350F",
    font: "Georgia",
    theme: {
      accent: "#d97706",
      accent2: "#b45309",
      bg: "#fffbeb",
      panel: "#ffffff",
      surface: "#ffffff",
      text: "#78350f",
      mutedText: "#92400e",
      border: "rgba(120,53,15,0.10)",
    },
  },
  {
    id: "clean-services",
    name: "Clean Services",
    description: "Professional, calming. Consultants, coaches, agencies.",
    category: "Services",
    previewBg: "#F0FDFA",
    previewAccent: "#0891B2",
    previewText: "#164E63",
    font: "Inter",
    theme: {
      accent: "#0891b2",
      accent2: "#0284c7",
      bg: "#f0fdfa",
      panel: "#ffffff",
      surface: "#ffffff",
      text: "#164e63",
      mutedText: "#0e7490",
      border: "rgba(14,116,144,0.12)",
    },
  },
];

const CATEGORIES = ["All", "Fashion", "Food & Beverage", "Services", "Digital", "Health"];

type Props = {
  onApply: (theme: Theme, font: FontChoice) => void;
  onClose: () => void;
};

function MiniPreview({ template }: { template: Template }) {
  return (
    <div
      style={{
        height: 110,
        background: template.previewBg,
        borderRadius: "8px 8px 0 0",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: "10px 12px",
        gap: 6,
      }}
    >
      {/* Nav bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 28, height: 6, borderRadius: 3, background: template.previewAccent }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 20, height: 4, borderRadius: 2, background: `${template.previewText}20` }} />
          ))}
        </div>
      </div>
      {/* Hero headline */}
      <div style={{ width: "70%", height: 7, borderRadius: 3, background: template.previewText, opacity: 0.85, marginTop: 4 }} />
      <div style={{ width: "55%", height: 5, borderRadius: 3, background: template.previewText, opacity: 0.4 }} />
      <div style={{ width: "45%", height: 5, borderRadius: 3, background: template.previewText, opacity: 0.4 }} />
      {/* CTA button */}
      <div
        style={{
          width: 54,
          height: 16,
          borderRadius: 4,
          background: template.previewAccent,
          marginTop: 2,
        }}
      />
    </div>
  );
}

export default function TemplateModal({ onApply, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = activeCategory === "All"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          width: "100%",
          maxWidth: 840,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #F0EFE9",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", letterSpacing: "-0.3px" }}>Templates</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>Pick a style — your content stays the same</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              border: "none",
              borderRadius: 8,
              background: "transparent",
              cursor: "pointer",
              fontSize: 18,
              color: "#9CA3AF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; e.currentTarget.style.color = "#374151"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9CA3AF"; }}
          >
            ×
          </button>
        </div>

        {/* Category filters */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid #F0EFE9", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "5px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                border: "1px solid",
                borderColor: activeCategory === cat ? "#2563EB" : "#E2E8F0",
                background: activeCategory === cat ? "#EFF6FF" : "#FFFFFF",
                color: activeCategory === cat ? "#2563EB" : "#6B7280",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px 24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
            alignContent: "start",
          }}
        >
          {filtered.map((template) => (
            <div
              key={template.id}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                border: `2px solid ${hoveredId === template.id ? "#2563EB" : "#E8E8E4"}`,
                borderRadius: 10,
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: hoveredId === template.id ? "0 4px 20px rgba(37,99,235,0.14)" : "none",
                transform: hoveredId === template.id ? "translateY(-2px)" : "none",
              }}
            >
              <MiniPreview template={template} />
              <div style={{ padding: "10px 12px 12px", background: "#FFFFFF" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{template.name}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 3, lineHeight: 1.4 }}>{template.description}</div>
                <button
                  onClick={() => onApply(template.theme, template.font)}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    height: 28,
                    border: "none",
                    borderRadius: 6,
                    background: hoveredId === template.id ? "#2563EB" : "#F3F4F6",
                    color: hoveredId === template.id ? "#FFFFFF" : "#374151",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  Apply template
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
