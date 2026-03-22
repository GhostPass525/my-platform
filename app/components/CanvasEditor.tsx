"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Moveable from "react-moveable";
import Selecto from "react-selecto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CanvasElement {
  id: string;
  type: "text" | "image" | "button" | "shape" | "section";
  x: number;       // in 1200px artboard space
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  name: string;
  // Text
  content?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  // Image
  src?: string;
  alt?: string;
  objectFit?: "cover" | "contain" | "fill";
  // Style
  backgroundColor?: string;
  borderRadius?: number;
  padding?: number;
  opacity?: number;
  borderColor?: string;
  borderWidth?: number;
  // Button
  href?: string;
  buttonStyle?: "filled" | "outlined" | "ghost";
  accentColor?: string;
}

type SiteData = {
  brandName?: string;
  tagline?: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  primaryCTA?: string;
  heroImageDataUrl?: string;
  sections?: { title: string; bullets: string[] }[];
  faq?: { q: string; a: string }[];
  theme?: {
    accent: string;
    bg: string;
    text: string;
    mutedText: string;
    border: string;
  };
};

export interface CanvasEditorProps {
  elements: CanvasElement[];
  onUpdate: (elements: CanvasElement[]) => void;
  onUndo: () => void;
  onRedo: () => void;
  theme: {
    accent: string;
    text: string;
    mutedText: string;
    border: string;
    bg: string;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ARTBOARD_WIDTH = 1200;
const MIN_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── parseStoreToCanvas ──────────────────────────────────────────────────────

export function parseStoreToCanvas(site: SiteData): CanvasElement[] {
  const els: CanvasElement[] = [];
  let z = 1;
  const accent = site.theme?.accent ?? "#2563EB";
  const bg = site.theme?.bg ?? "#ffffff";
  const textColor = site.theme?.text ?? "#0b1220";
  const muted = site.theme?.mutedText ?? "#475569";

  // Page background
  els.push({
    id: uid(), type: "shape", name: "Page Background",
    x: 0, y: 0, width: ARTBOARD_WIDTH, height: 3000,
    rotation: 0, zIndex: z++, locked: true, visible: true,
    backgroundColor: bg,
  });

  // Header bar
  els.push({
    id: uid(), type: "shape", name: "Header",
    x: 0, y: 0, width: ARTBOARD_WIDTH, height: 80,
    rotation: 0, zIndex: z++, locked: false, visible: true,
    backgroundColor: "#ffffff",
    borderWidth: 0, borderColor: "rgba(0,0,0,0.08)",
  });

  // Brand name
  els.push({
    id: uid(), type: "text", name: "Brand Name",
    x: 40, y: 22, width: 300, height: 36,
    rotation: 0, zIndex: z++, locked: false, visible: true,
    content: site.brandName ?? "Your Brand",
    fontSize: 22, fontWeight: "700", color: textColor,
  });

  // CTA button
  els.push({
    id: uid(), type: "button", name: "Nav CTA",
    x: 1000, y: 16, width: 160, height: 48,
    rotation: 0, zIndex: z++, locked: false, visible: true,
    content: site.primaryCTA ?? "Get Started",
    buttonStyle: "filled",
    backgroundColor: accent, color: "#ffffff",
    borderRadius: 8, fontSize: 14, fontWeight: "600", accentColor: accent,
  });

  // Hero section background
  els.push({
    id: uid(), type: "shape", name: "Hero Section",
    x: 0, y: 80, width: ARTBOARD_WIDTH, height: 540,
    rotation: 0, zIndex: z++, locked: false, visible: true,
    backgroundColor: bg,
  });

  // Hero headline
  els.push({
    id: uid(), type: "text", name: "Hero Headline",
    x: 80, y: 165, width: 560, height: 140,
    rotation: 0, zIndex: z++, locked: false, visible: true,
    content: site.heroHeadline ?? "Your Headline Here",
    fontSize: 52, fontWeight: "800", color: textColor, lineHeight: 1.15,
  });

  // Hero subheadline
  els.push({
    id: uid(), type: "text", name: "Hero Subheadline",
    x: 80, y: 325, width: 520, height: 80,
    rotation: 0, zIndex: z++, locked: false, visible: true,
    content: site.heroSubheadline ?? "Your compelling subheadline goes here",
    fontSize: 20, fontWeight: "400", color: muted, lineHeight: 1.6,
  });

  // Primary CTA
  els.push({
    id: uid(), type: "button", name: "Hero CTA",
    x: 80, y: 440, width: 200, height: 56,
    rotation: 0, zIndex: z++, locked: false, visible: true,
    content: site.primaryCTA ?? "Shop Now",
    buttonStyle: "filled",
    backgroundColor: accent, color: "#ffffff",
    borderRadius: 10, fontSize: 17, fontWeight: "600", accentColor: accent,
  });

  // Hero image
  els.push({
    id: uid(), type: "image", name: "Hero Image",
    x: 700, y: 120, width: 440, height: 420,
    rotation: 0, zIndex: z++, locked: false, visible: true,
    src: site.heroImageDataUrl ?? undefined,
    alt: "Hero image", objectFit: "cover",
    borderRadius: 16, backgroundColor: `${accent}15`,
  });

  // Sections
  const COLS = 3;
  const colW = 340;
  const gap = (ARTBOARD_WIDTH - 80 * 2 - colW * COLS) / (COLS - 1);
  let sectionY = 680;

  (site.sections ?? []).slice(0, 6).forEach((sec, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const cx = 80 + col * (colW + gap);
    const cy = sectionY + row * 220;

    els.push({
      id: uid(), type: "shape", name: `${sec.title} Card`,
      x: cx, y: cy, width: colW, height: 200,
      rotation: 0, zIndex: z++, locked: false, visible: true,
      backgroundColor: "#ffffff", borderRadius: 12,
      borderColor: "#E2E8F0", borderWidth: 1,
    });
    els.push({
      id: uid(), type: "text", name: `${sec.title} Title`,
      x: cx + 20, y: cy + 20, width: colW - 40, height: 32,
      rotation: 0, zIndex: z++, locked: false, visible: true,
      content: sec.title, fontSize: 16, fontWeight: "600", color: textColor,
    });
    sec.bullets.slice(0, 3).forEach((bullet, bi) => {
      els.push({
        id: uid(), type: "text", name: `Bullet ${idx + 1}-${bi + 1}`,
        x: cx + 20, y: cy + 60 + bi * 36, width: colW - 40, height: 28,
        rotation: 0, zIndex: z++, locked: false, visible: true,
        content: `• ${bullet}`, fontSize: 13, fontWeight: "400", color: muted, lineHeight: 1.5,
      });
    });

    if (col === COLS - 1 || idx === (site.sections ?? []).length - 1) {
      // next row
    }
  });

  return els;
}

// ─── ElementRenderer ─────────────────────────────────────────────────────────

function ElementRenderer({
  el,
  scale,
  isSelected,
  isEditing,
  onStartEdit,
  onEndEdit,
  onClick,
  onRightClick,
}: {
  el: CanvasElement;
  scale: number;
  isSelected: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: (newContent: string) => void;
  onClick: (e: React.MouseEvent) => void;
  onRightClick: (e: React.MouseEvent) => void;
}) {
  const editRef = useRef<HTMLDivElement>(null);

  // Focus contenteditable when entering edit mode
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      // place cursor at end
      const range = document.createRange();
      range.selectNodeContents(editRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  const s = (v: number) => v * scale;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: s(el.x),
    top: s(el.y),
    width: s(el.width),
    height: s(el.height),
    zIndex: el.zIndex,
    opacity: (el.opacity ?? 1) * (el.visible === false ? 0 : 1),
    backgroundColor: el.backgroundColor,
    borderRadius: el.borderRadius !== undefined ? s(el.borderRadius) : undefined,
    padding: el.padding !== undefined ? s(el.padding) : undefined,
    border: el.borderWidth && el.borderWidth > 0 ? `${el.borderWidth}px solid ${el.borderColor ?? "transparent"}` : undefined,
    boxSizing: "border-box",
    cursor: el.locked ? "default" : "move",
    userSelect: "none",
    overflow: "hidden",
    pointerEvents: el.visible === false ? "none" : "auto",
  };

  if (el.type === "text") {
    const textStyle: React.CSSProperties = {
      fontSize: s(el.fontSize ?? 16),
      fontWeight: el.fontWeight ?? "400",
      fontFamily: el.fontFamily,
      color: el.color ?? "#000",
      textAlign: el.textAlign ?? "left",
      lineHeight: el.lineHeight ?? 1.4,
      whiteSpace: "pre-wrap",
      width: "100%",
      height: "100%",
      display: "block",
      outline: "none",
      cursor: isEditing ? "text" : "inherit",
      background: "transparent",
      userSelect: isEditing ? "text" : "none",
      wordBreak: "break-word",
    };

    if (isEditing) {
      return (
        <div
          style={{ ...baseStyle, cursor: "text", zIndex: 9000, overflow: "visible" }}
          data-id={el.id}
        >
          <div
            ref={editRef}
            contentEditable
            suppressContentEditableWarning
            style={textStyle}
            onBlur={(e) => onEndEdit(e.currentTarget.innerText)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onEndEdit(editRef.current?.innerText ?? el.content ?? "");
              }
              e.stopPropagation();
            }}
          >
            {el.content ?? ""}
          </div>
        </div>
      );
    }

    return (
      <div
        style={baseStyle}
        data-id={el.id}
        className="canvas-element"
        onClick={onClick}
        onDoubleClick={!el.locked ? onStartEdit : undefined}
        onContextMenu={onRightClick}
      >
        <div style={{ ...textStyle, pointerEvents: "none" }}>
          {el.content ?? ""}
        </div>
      </div>
    );
  }

  if (el.type === "image") {
    return (
      <div
        style={baseStyle}
        data-id={el.id}
        className="canvas-element"
        onClick={onClick}
        onContextMenu={onRightClick}
      >
        {el.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={el.src}
            alt={el.alt ?? ""}
            style={{ width: "100%", height: "100%", objectFit: el.objectFit ?? "cover", display: "block", pointerEvents: "none" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: s(8),
            background: el.backgroundColor ?? "#f1f5f9",
            color: "#94a3b8", fontSize: s(13), pointerEvents: "none",
          }}>
            <svg width={s(24)} height={s(24)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Image</span>
          </div>
        )}
      </div>
    );
  }

  if (el.type === "button") {
    const isFilled = el.buttonStyle !== "outlined" && el.buttonStyle !== "ghost";
    const isOutlined = el.buttonStyle === "outlined";
    const btnBg = isFilled ? (el.backgroundColor ?? "#2563EB") : "transparent";
    const btnColor = isFilled ? (el.color ?? "#fff") : (el.backgroundColor ?? "#2563EB");

    if (isEditing) {
      return (
        <div
          style={{
            ...baseStyle,
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: btnBg,
            border: isOutlined ? `2px solid ${el.backgroundColor ?? "#2563EB"}` : "none",
            cursor: "text", zIndex: 9000,
          }}
          data-id={el.id}
        >
          <div
            ref={editRef}
            contentEditable
            suppressContentEditableWarning
            style={{
              fontSize: s(el.fontSize ?? 15),
              fontWeight: el.fontWeight ?? "600",
              color: btnColor,
              outline: "none",
              textAlign: "center",
              whiteSpace: "nowrap",
              userSelect: "text",
            }}
            onBlur={(e) => onEndEdit(e.currentTarget.innerText)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onEndEdit(editRef.current?.innerText ?? el.content ?? "");
              }
              e.stopPropagation();
            }}
          >
            {el.content ?? "Button"}
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          ...baseStyle,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: btnBg,
          border: isOutlined ? `2px solid ${el.backgroundColor ?? "#2563EB"}` : "none",
        }}
        data-id={el.id}
        className="canvas-element"
        onClick={onClick}
        onDoubleClick={!el.locked ? onStartEdit : undefined}
        onContextMenu={onRightClick}
      >
        <span style={{
          fontSize: s(el.fontSize ?? 15),
          fontWeight: el.fontWeight ?? "600",
          color: btnColor,
          pointerEvents: "none",
        }}>
          {el.content ?? "Button"}
        </span>
      </div>
    );
  }

  // shape / section
  return (
    <div
      style={baseStyle}
      data-id={el.id}
      className="canvas-element"
      onClick={onClick}
      onContextMenu={onRightClick}
    />
  );
}

// ─── ContextMenu ─────────────────────────────────────────────────────────────

function ContextMenu({
  x, y, element, onClose,
  onDelete, onDuplicate, onBringForward, onSendBackward, onBringToFront, onSendToBack, onToggleLock,
}: {
  x: number; y: number; element: CanvasElement;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onToggleLock: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const items = [
    { label: "Duplicate", action: onDuplicate },
    null,
    { label: "Bring to Front", action: onBringToFront },
    { label: "Bring Forward", action: onBringForward },
    { label: "Send Backward", action: onSendBackward },
    { label: "Send to Back", action: onSendToBack },
    null,
    { label: element.locked ? "Unlock Element" : "Lock Element", action: onToggleLock },
    null,
    { label: "Delete", action: onDelete, danger: true },
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: x, top: y,
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 8px 30px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08)",
        padding: "4px 0",
        zIndex: 9999,
        minWidth: 180,
      }}
    >
      {items.map((item, i) =>
        item === null ? (
          <div key={i} style={{ height: 1, background: "#E5E7EB", margin: "3px 0" }} />
        ) : (
          <button
            key={item.label}
            onClick={() => { item.action(); onClose(); }}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "7px 14px", fontSize: 13,
              background: "transparent", border: "none",
              color: item.danger ? "#EF4444" : "#0f172a",
              cursor: "pointer",
              lineHeight: "20px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = item.danger ? "#FEF2F2" : "#F8FAFC"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

// ─── FloatingToolbar ─────────────────────────────────────────────────────────

function FloatingToolbar({
  element,
  artboardRef,
  scale,
  onUpdate,
  onDelete,
  onBringForward,
  onSendBackward,
}: {
  element: CanvasElement;
  artboardRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
  onUpdate: (patch: Partial<CanvasElement>) => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
}) {
  const s = (v: number) => v * scale;

  // Get artboard's current viewport rect (accounts for scrolling)
  const artboardRect = artboardRef.current?.getBoundingClientRect();
  if (!artboardRect) return null;

  const elViewLeft = artboardRect.left + s(element.x);
  const elViewTop = artboardRect.top + s(element.y);
  const elViewWidth = s(element.width);

  const toolbarHeight = 40;
  const toolbarGap = 8;
  let top = elViewTop - toolbarHeight - toolbarGap;
  if (top < artboardRect.top + 8) {
    top = elViewTop + s(element.height) + toolbarGap; // flip below
  }
  const left = Math.max(artboardRect.left + 8, Math.min(elViewLeft + elViewWidth / 2 - 200, artboardRect.right - 408));

  const fontSizes = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96];

  return (
    <div
      style={{
        position: "fixed",
        left, top,
        zIndex: 8000,
        background: "#1e293b",
        borderRadius: 8,
        padding: "0 8px",
        display: "flex",
        alignItems: "center",
        gap: 2,
        height: toolbarHeight,
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Text controls */}
      {(element.type === "text" || element.type === "button") && (
        <>
          {/* Font size */}
          <select
            value={element.fontSize ?? 16}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            style={{ height: 26, padding: "0 4px", borderRadius: 4, border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", fontSize: 12, cursor: "pointer" }}
          >
            {fontSizes.map((fs) => <option key={fs} value={fs}>{fs}</option>)}
          </select>

          {/* Bold */}
          <TBtn
            active={(element.fontWeight ?? "400") === "700" || element.fontWeight === "bold"}
            onClick={() => onUpdate({ fontWeight: element.fontWeight === "700" ? "400" : "700" })}
            title="Bold"
          >B</TBtn>

          {/* Italic — not stored as italic yet, but we can add */}
          <div style={{ width: 1, height: 20, background: "#334155", margin: "0 4px" }} />

          {/* Align */}
          {(["left", "center", "right"] as const).map((align) => (
            <TBtn
              key={align}
              active={element.textAlign === align}
              onClick={() => onUpdate({ textAlign: align })}
              title={`Align ${align}`}
            >
              {align === "left" ? "≡L" : align === "center" ? "≡C" : "≡R"}
            </TBtn>
          ))}

          <div style={{ width: 1, height: 20, background: "#334155", margin: "0 4px" }} />

          {/* Color */}
          <label title="Text Color" style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
            <div style={{ width: 16, height: 16, borderRadius: 3, background: element.color ?? "#000", border: "2px solid #475569" }} />
            <input type="color" value={element.color ?? "#000000"} onChange={(e) => onUpdate({ color: e.target.value })} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
          </label>
        </>
      )}

      {/* Background / shape controls */}
      {(element.type === "shape" || element.type === "button" || element.type === "image") && (
        <>
          <label title="Background Color" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: element.backgroundColor ?? "#ffffff", border: "2px solid #475569" }} />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>BG</span>
            <input type="color" value={element.backgroundColor ?? "#ffffff"} onChange={(e) => onUpdate({ backgroundColor: e.target.value })} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
          </label>
          <div style={{ width: 1, height: 20, background: "#334155", margin: "0 4px" }} />
        </>
      )}

      {/* Opacity */}
      <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>α</span>
        <input
          type="range" min={0} max={1} step={0.01}
          value={element.opacity ?? 1}
          onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
          style={{ width: 60, cursor: "pointer" }}
        />
      </label>

      <div style={{ width: 1, height: 20, background: "#334155", margin: "0 4px" }} />

      {/* Layering */}
      <TBtn onClick={onBringForward} title="Bring Forward">↑</TBtn>
      <TBtn onClick={onSendBackward} title="Send Backward">↓</TBtn>

      <div style={{ width: 1, height: 20, background: "#334155", margin: "0 4px" }} />

      {/* Delete */}
      <TBtn onClick={onDelete} title="Delete" danger>✕</TBtn>
    </div>
  );
}

function TBtn({ children, active, onClick, title, danger }: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        height: 28, minWidth: 28, padding: "0 6px",
        borderRadius: 4, border: "none",
        background: active ? "#3b82f6" : "transparent",
        color: danger ? "#f87171" : active ? "#fff" : "#e2e8f0",
        fontSize: 13, fontWeight: "500",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = danger ? "#450a0a" : "#1e3a5f";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? "#3b82f6" : "transparent";
      }}
    >
      {children}
    </button>
  );
}

// ─── CanvasEditor ─────────────────────────────────────────────────────────────

export default function CanvasEditor({ elements, onUpdate, onUndo, onRedo, theme }: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<Moveable>(null);
  const [scale, setScale] = useState(0.6);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);
  const [dimTooltip, setDimTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // Selected elements
  const selectedElements = useMemo(
    () => elements.filter((e) => selectedIds.includes(e.id) && !e.locked),
    [elements, selectedIds]
  );
  const primarySelected = selectedElements[0] ?? null;

  // Compute scale from container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      if (w > 0) setScale(w / ARTBOARD_WIDTH);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const s = useCallback((v: number) => v * scale, [scale]);

  // ─── Element helpers ──────────────────────────────────────────────────────

  const patchElement = useCallback(
    (id: string, patch: Partial<CanvasElement>) => {
      onUpdate(elements.map((el) => (el.id === id ? { ...el, ...patch } : el)));
    },
    [elements, onUpdate]
  );

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    onUpdate(elements.filter((el) => !selectedIds.includes(el.id)));
    setSelectedIds([]);
  }, [elements, onUpdate, selectedIds]);

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const toAdd = selectedIds
      .map((id) => elements.find((el) => el.id === id))
      .filter(Boolean)
      .map((el) => ({ ...el!, id: uid(), x: el!.x + 20, y: el!.y + 20, name: `${el!.name} copy` }));
    const newIds = toAdd.map((e) => e.id);
    onUpdate([...elements, ...toAdd]);
    setSelectedIds(newIds);
  }, [elements, onUpdate, selectedIds]);

  // Layer order
  const bringForward = useCallback((id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const above = elements.filter((e) => e.zIndex > el.zIndex).sort((a, b) => a.zIndex - b.zIndex)[0];
    if (!above) return;
    onUpdate(elements.map((e) => {
      if (e.id === id) return { ...e, zIndex: above.zIndex };
      if (e.id === above.id) return { ...e, zIndex: el.zIndex };
      return e;
    }));
  }, [elements, onUpdate]);

  const sendBackward = useCallback((id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const below = elements.filter((e) => e.zIndex < el.zIndex).sort((a, b) => b.zIndex - a.zIndex)[0];
    if (!below) return;
    onUpdate(elements.map((e) => {
      if (e.id === id) return { ...e, zIndex: below.zIndex };
      if (e.id === below.id) return { ...e, zIndex: el.zIndex };
      return e;
    }));
  }, [elements, onUpdate]);

  const bringToFront = useCallback((id: string) => {
    const maxZ = Math.max(...elements.map((e) => e.zIndex));
    patchElement(id, { zIndex: maxZ + 1 });
  }, [elements, patchElement]);

  const sendToBack = useCallback((id: string) => {
    const minZ = Math.min(...elements.map((e) => e.zIndex));
    patchElement(id, { zIndex: minZ - 1 });
  }, [elements, patchElement]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't intercept when text editing
      if (editingId) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const mod = e.ctrlKey || e.metaKey;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === "Escape") setSelectedIds([]);
      if (mod && e.key === "d") { e.preventDefault(); duplicateSelected(); }
      if (mod && !e.shiftKey && e.key === "z") { e.preventDefault(); onUndo(); }
      if (mod && e.shiftKey && e.key === "z") { e.preventDefault(); onRedo(); }
      if (mod && e.key === "a") {
        e.preventDefault();
        setSelectedIds(elements.filter((el) => !el.locked).map((el) => el.id));
      }
      if (mod && e.key === "]") { e.preventDefault(); if (selectedIds[0]) bringForward(selectedIds[0]); }
      if (mod && e.key === "[") { e.preventDefault(); if (selectedIds[0]) sendBackward(selectedIds[0]); }

      // Arrow nudge
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        onUpdate(elements.map((el) =>
          selectedIds.includes(el.id) && !el.locked ? { ...el, x: el.x + dx, y: el.y + dy } : el
        ));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editingId, selectedIds, elements, deleteSelected, duplicateSelected, onUndo, onRedo, bringForward, sendBackward, onUpdate]);

  // ─── Artboard click (deselect) ────────────────────────────────────────────

  const onArtboardClick = useCallback((e: React.MouseEvent) => {
    if (e.target === artboardRef.current) {
      setSelectedIds([]);
      setEditingId(null);
    }
  }, []);

  // ─── Artboard height ──────────────────────────────────────────────────────

  const artboardHeight = useMemo(() => {
    const maxBottom = elements.reduce((max, el) => Math.max(max, el.y + el.height), 900);
    return Math.max(1400, maxBottom + 200);
  }, [elements]);

  // Compute sorted elements for rendering
  const sortedElements = useMemo(
    () => [...elements].sort((a, b) => a.zIndex - b.zIndex),
    [elements]
  );

  // ─── Moveable drag / resize callbacks ────────────────────────────────────
  // Elements are rendered at (el.x * scale, el.y * scale), so Moveable
  // works in artboard-scaled space. We divide by scale to get 1200px coords.

  const dragStartData = useRef<Map<string, { x: number; y: number }>>(new Map());

  const onDragStart = useCallback(({ target }: { target: HTMLElement }) => {
    const id = target.dataset.id!;
    const el = elements.find((e) => e.id === id);
    if (el) dragStartData.current.set(id, { x: el.x, y: el.y });
  }, [elements]);

  const onDrag = useCallback(({ target, left, top }: { target: HTMLElement; left: number; top: number }) => {
    target.style.left = `${left}px`;
    target.style.top = `${top}px`;
    // Show dim tooltip
    const x = Math.round(left / scale);
    const y = Math.round(top / scale);
    setDimTooltip({ x: left + 10, y: top - 28, text: `x: ${x}, y: ${y}` });
  }, [scale]);

  const onDragEnd = useCallback(({ target, lastEvent }: { target: HTMLElement; lastEvent: any }) => {
    setDimTooltip(null);
    if (!lastEvent) return;
    const id = target.dataset.id!;
    const newX = Math.round(lastEvent.left / scale);
    const newY = Math.round(lastEvent.top / scale);
    onUpdate(elements.map((el) => el.id === id ? { ...el, x: newX, y: newY } : el));
    dragStartData.current.delete(id);
  }, [elements, onUpdate, scale]);

  const onDragGroupEnd = useCallback(({ events }: { events: any[] }) => {
    setDimTooltip(null);
    const updates = new Map<string, { x: number; y: number }>();
    events.forEach(({ target, lastEvent }) => {
      if (!lastEvent) return;
      const id = target.dataset.id!;
      updates.set(id, { x: Math.round(lastEvent.left / scale), y: Math.round(lastEvent.top / scale) });
    });
    if (updates.size === 0) return;
    onUpdate(elements.map((el) => {
      const u = updates.get(el.id);
      return u ? { ...el, ...u } : el;
    }));
  }, [elements, onUpdate, scale]);

  const resizeStartData = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(new Map());

  const onResizeStart = useCallback(({ target }: { target: HTMLElement }) => {
    const id = target.dataset.id!;
    const el = elements.find((e) => e.id === id);
    if (el) resizeStartData.current.set(id, { x: el.x, y: el.y, w: el.width, h: el.height });
  }, [elements]);

  const onResize = useCallback(({ target, width, height, drag }: { target: HTMLElement; width: number; height: number; drag: any }) => {
    target.style.width = `${width}px`;
    target.style.height = `${height}px`;
    target.style.left = `${drag.left}px`;
    target.style.top = `${drag.top}px`;
    const w = Math.round(width / scale);
    const h = Math.round(height / scale);
    setDimTooltip({ x: drag.left + width + 10, y: drag.top, text: `${w} × ${h}px` });
  }, [scale]);

  const onResizeEnd = useCallback(({ target, lastEvent }: { target: HTMLElement; lastEvent: any }) => {
    setDimTooltip(null);
    if (!lastEvent) return;
    const id = target.dataset.id!;
    const newW = Math.max(MIN_SIZE, Math.round(lastEvent.width / scale));
    const newH = Math.max(MIN_SIZE, Math.round(lastEvent.height / scale));
    const newX = Math.round(lastEvent.drag.left / scale);
    const newY = Math.round(lastEvent.drag.top / scale);
    onUpdate(elements.map((el) => el.id === id ? { ...el, x: newX, y: newY, width: newW, height: newH } : el));
    resizeStartData.current.delete(id);
  }, [elements, onUpdate, scale]);

  // ─── Selection click ──────────────────────────────────────────────────────

  const onElementClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    } else {
      setSelectedIds([id]);
    }
    setEditingId(null);
  }, []);

  const onElementRightClick = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds([id]);
    setContextMenu({ x: e.clientX, y: e.clientY, elementId: id });
  }, []);

  const onStartEdit = useCallback((id: string) => {
    setSelectedIds([id]);
    setEditingId(id);
  }, []);

  const onEndEdit = useCallback((id: string, newContent: string) => {
    setEditingId(null);
    patchElement(id, { content: newContent });
  }, [patchElement]);

  // ─── Render ──────────────────────────────────────────────────────────────

  // Targets for Moveable — computed after render
  const [moveableTargetEls, setMoveableTargetEls] = useState<HTMLElement[]>([]);
  useEffect(() => {
    if (!artboardRef.current) return;
    const targets = selectedIds
      .filter((id) => id !== editingId)
      .map((id) => artboardRef.current!.querySelector<HTMLElement>(`[data-id="${id}"]`))
      .filter((el): el is HTMLElement => !!el && !elements.find((e) => e.id === el.dataset.id)?.locked);
    setMoveableTargetEls(targets);
  }, [selectedIds, editingId, elements, scale]);

  const ctxEl = contextMenu ? elements.find((e) => e.id === contextMenu.elementId) : null;

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", minHeight: 400, background: "#E8E7E3", overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      {/* Scrollable artboard area */}
      <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1, minHeight: 0 }}>
        {/* Artboard */}
        <div
          ref={artboardRef}
          onClick={onArtboardClick}
          style={{
            position: "relative",
            width: s(ARTBOARD_WIDTH),
            height: s(artboardHeight),
            background: theme.bg ?? "#fff",
            margin: "0 auto",
            boxShadow: "0 2px 20px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}
        >
          {/* Elements */}
          {sortedElements.map((el) => (
            <ElementRenderer
              key={el.id}
              el={el}
              scale={scale}
              isSelected={selectedIds.includes(el.id)}
              isEditing={editingId === el.id}
              onStartEdit={() => onStartEdit(el.id)}
              onEndEdit={(content) => onEndEdit(el.id, content)}
              onClick={(e) => onElementClick(e, el.id)}
              onRightClick={(e) => onElementRightClick(e, el.id)}
            />
          ))}

          {/* Selection highlights */}
          {selectedIds
            .filter((id) => id !== editingId)
            .map((id) => {
              const el = elements.find((e) => e.id === id);
              if (!el) return null;
              return (
                <div
                  key={`sel-${id}`}
                  style={{
                    position: "absolute",
                    left: s(el.x) - 1,
                    top: s(el.y) - 1,
                    width: s(el.width) + 2,
                    height: s(el.height) + 2,
                    border: "2px solid #2563EB",
                    borderRadius: 2,
                    pointerEvents: "none",
                    zIndex: 8990,
                    boxSizing: "border-box",
                  }}
                />
              );
            })}

          {/* Moveable */}
          {moveableTargetEls.length > 0 && scale > 0 && (
            <Moveable
              ref={moveableRef}
              target={moveableTargetEls.length === 1 ? moveableTargetEls[0] : moveableTargetEls}
              draggable={true}
              resizable={true}
              keepRatio={false}
              snappable={false}
              hideDefaultLines={false}
              onDragStart={({ target }) => onDragStart({ target: target as HTMLElement })}
              onDrag={({ target, left, top }) => onDrag({ target: target as HTMLElement, left, top })}
              onDragEnd={({ target, lastEvent }) => onDragEnd({ target: target as HTMLElement, lastEvent })}
              onDragGroupEnd={({ events }) => onDragGroupEnd({ events })}
              onResizeStart={({ target }) => onResizeStart({ target: target as HTMLElement })}
              onResize={({ target, width, height, drag }) => onResize({ target: target as HTMLElement, width, height, drag })}
              onResizeEnd={({ target, lastEvent }) => onResizeEnd({ target: target as HTMLElement, lastEvent })}
              renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
              edge={false}
              zoom={1}
              origin={false}
              padding={{ left: 0, top: 0, right: 0, bottom: 0 }}
              useAccuratePosition={true}
            />
          )}

          {/* Dim tooltip */}
          {dimTooltip && (
            <div style={{
              position: "absolute",
              left: dimTooltip.x,
              top: dimTooltip.y,
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 11,
              pointerEvents: "none",
              zIndex: 9500,
              whiteSpace: "nowrap",
            }}>
              {dimTooltip.text}
            </div>
          )}
        </div>
      </div>

      {/* Floating toolbar */}
      {primarySelected && !editingId && (
        <FloatingToolbar
          element={primarySelected}
          artboardRef={artboardRef}
          scale={scale}
          onUpdate={(patch) => patchElement(primarySelected.id, patch)}
          onDelete={() => { deleteSelected(); }}
          onBringForward={() => bringForward(primarySelected.id)}
          onSendBackward={() => sendBackward(primarySelected.id)}
        />
      )}

      {/* Context menu */}
      {contextMenu && ctxEl && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          element={ctxEl}
          onClose={() => setContextMenu(null)}
          onDelete={() => { patchElement(ctxEl.id, {}); onUpdate(elements.filter((e) => e.id !== ctxEl.id)); setSelectedIds([]); }}
          onDuplicate={() => { const copy = { ...ctxEl, id: uid(), x: ctxEl.x + 20, y: ctxEl.y + 20, name: `${ctxEl.name} copy` }; onUpdate([...elements, copy]); setSelectedIds([copy.id]); }}
          onBringForward={() => bringForward(ctxEl.id)}
          onSendBackward={() => sendBackward(ctxEl.id)}
          onBringToFront={() => bringToFront(ctxEl.id)}
          onSendToBack={() => sendToBack(ctxEl.id)}
          onToggleLock={() => patchElement(ctxEl.id, { locked: !ctxEl.locked })}
        />
      )}

      {/* Selecto for drag-to-select */}
      <Selecto
        container={artboardRef.current}
        selectableTargets={[".canvas-element"]}
        hitRate={0}
        selectByClick={false}
        selectFromInside={false}
        continueSelect={false}
        onSelect={(e) => {
          const ids = e.selected.map((el) => (el as HTMLElement).dataset.id!).filter(Boolean);
          setSelectedIds(ids);
        }}
      />
    </div>
  );
}
