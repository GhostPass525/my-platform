"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { calculateMinimumPrice, calculateProfitBreakdown } from "@/lib/pricing";

// ── Types ─────────────────────────────────────────────────────────────────────

type CatalogProduct = {
  id: number;
  title: string;
  type: string;
  type_name?: string;
  brand?: string;
  model?: string;
  thumbnail_url?: string;
};

type CatalogVariant = {
  id: number;
  name: string;
  size: string;
  color: string;
  color_code?: string;
  price: string;
  in_stock: boolean;
};

export type NewProduct = {
  id: string;
  name: string;
  description: string;
  price: string;
  imageDataUrl?: string;
  design_url?: string;
  mockup_urls?: string[];
  product_type: "physical";
  printful_sync_product_id: number;
  printful_catalog_product_id: number;
  printful_variant_ids: number[];
  printful_variants: Array<{ id: number; size: string; color: string; color_code?: string }>;
};

type ImageLayer = {
  kind: "image";
  id: string;
  file: File | null;
  previewUrl: string | null;   // local blob or AI URL
  uploadedUrl: string | null;  // Supabase URL
  natW: number; natH: number;
  xPct: number; yPct: number; wPct: number;
};

type TextLayer = {
  kind: "text";
  id: string;
  text: string;
  fontFamily: string;
  fontSizePct: number;        // font size / printfile width [0..1]
  color: string;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
  letterSpacing: number;      // em units
  xPct: number; yPct: number;
  wPct: number;               // text box width fraction
};

type DesignLayer = ImageLayer | TextLayer;

type TemplateImageInfo = {
  url: string;
  templateWidth: number;
  templateHeight: number;
  printAreaTop: number;
  printAreaLeft: number;
  printAreaWidth: number;
  printAreaHeight: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "tshirts",     label: "T-Shirts",       keywords: ["T-SHIRT"] },
  { id: "hoodies",     label: "Hoodies",         keywords: ["HOODIE"] },
  { id: "sweatshirts", label: "Sweatshirts",     keywords: ["SWEATSHIRT"] },
  { id: "tanks",       label: "Tank Tops",       keywords: ["TANK TOP"] },
  { id: "longsleeves", label: "Long Sleeves",    keywords: ["LONG SLEEVE"] },
  { id: "allover",     label: "All-Over Print",  keywords: ["ALL-OVER"] },
  { id: "hats",        label: "Hats",            keywords: ["HAT", "CAP", "BEANIE", "SNAPBACK", "VISOR", "BUCKET"] },
  { id: "mugs",        label: "Mugs",            keywords: ["MUG"] },
  { id: "posters",     label: "Posters",         keywords: ["POSTER", "CANVAS PRINT", "FRAMED POSTER", "CANVAS"] },
  { id: "phonecases",  label: "Phone Cases",     keywords: ["PHONE CASE"] },
  { id: "totebags",    label: "Tote Bags",       keywords: ["TOTE BAG"] },
  { id: "stickers",    label: "Stickers",        keywords: ["STICKER", "DECAL"] },
] as const;
type CategoryId = typeof CATEGORIES[number]["id"];

const DESIGN_REQS: Record<CategoryId, string> = {
  tshirts:     "PNG with transparent background · 4500×5400 px recommended",
  hoodies:     "PNG with transparent background · 4500×5400 px recommended",
  sweatshirts: "PNG with transparent background · 4500×5400 px recommended",
  tanks:       "PNG with transparent background · 4500×5400 px recommended",
  longsleeves: "PNG with transparent background · 4500×5400 px recommended",
  allover:     "PNG/JPG · full-wrap print · high resolution required",
  hats:        "PNG with transparent background · embroidery or DTF",
  mugs:        "PNG/JPG · 3600×2400 px recommended",
  posters:     "PNG/JPG · 300 DPI · 3000×4500 px minimum",
  phonecases:  "PNG with transparent background · varies by model",
  totebags:    "PNG with transparent background · 3600×3600 px recommended",
  stickers:    "PNG with transparent background · 2000×2000 px recommended",
};

const NAME_SUGGESTIONS: Record<CategoryId, (brand?: string) => string> = {
  tshirts:     (b) => b ? `${b} Unisex Tee` : "Classic Unisex T-Shirt",
  hoodies:     (b) => b ? `${b} Pullover Hoodie` : "Premium Pullover Hoodie",
  sweatshirts: (b) => b ? `${b} Crew Sweatshirt` : "Classic Crew Sweatshirt",
  tanks:       (b) => b ? `${b} Tank Top` : "Everyday Tank Top",
  longsleeves: (b) => b ? `${b} Long Sleeve Tee` : "Long Sleeve T-Shirt",
  allover:     () => "All-Over Print Shirt",
  hats:        () => "Custom Hat",
  mugs:        () => "Signature Coffee Mug",
  posters:     () => "Art Print Poster",
  phonecases:  () => "Custom Phone Case",
  totebags:    () => "Canvas Tote Bag",
  stickers:    () => "Custom Sticker Pack",
};

const FONTS = [
  { name: "Impact",             family: "Impact" },
  { name: "Arial Black",        family: "Arial Black" },
  { name: "Bebas Neue",         family: "Bebas Neue" },
  { name: "Oswald",             family: "Oswald" },
  { name: "Montserrat",         family: "Montserrat" },
  { name: "Playfair Display",   family: "Playfair Display" },
  { name: "Lobster",            family: "Lobster" },
  { name: "Pacifico",           family: "Pacifico" },
  { name: "Permanent Marker",   family: "Permanent Marker" },
  { name: "Roboto Condensed",   family: "Roboto Condensed" },
  { name: "Anton",              family: "Anton" },
  { name: "Righteous",          family: "Righteous" },
  { name: "Press Start 2P",     family: "Press Start 2P" },
  { name: "Shadows Into Light", family: "Shadows Into Light" },
  { name: "Sacramento",         family: "Sacramento" },
  { name: "Dancing Script",     family: "Dancing Script" },
] as const;

const GFONTS_URL =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;700&family=Montserrat:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lobster&family=Pacifico&family=Permanent+Marker&family=Roboto+Condensed:wght@400;700&family=Anton&family=Righteous&family=Press+Start+2P&family=Shadows+Into+Light&family=Sacramento&family=Dancing+Script:wght@400;700&display=swap";

const TEXT_COLORS = [
  "#000000", "#FFFFFF", "#EF4444", "#1D3461", "#F59E0B",
  "#9CA3AF", "#16A34A", "#F97316", "#EC4899", "#7C3AED",
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function uid() { return Math.random().toString(36).slice(2, 10); }

function makeImageLayer(o: Partial<ImageLayer> = {}): ImageLayer {
  return { kind: "image", id: uid(), file: null, previewUrl: null, uploadedUrl: null, natW: 1, natH: 1, xPct: 0.1, yPct: 0.1, wPct: 0.8, ...o };
}
function makeTextLayer(o: Partial<TextLayer> = {}): TextLayer {
  return { kind: "text", id: uid(), text: "YOUR TEXT", fontFamily: "Impact", fontSizePct: 0.15, color: "#000000", bold: false, italic: false, align: "center", letterSpacing: 0, xPct: 0.1, yPct: 0.35, wPct: 0.8, ...o };
}

function imagePosToPosition(l: ImageLayer, pa: { width: number; height: number }) {
  const asp = l.natH > 0 && l.natW > 0 ? l.natH / l.natW : 1;
  const w = Math.round(l.wPct * pa.width);
  const h = Math.round(w * asp);
  return { area_width: pa.width, area_height: pa.height, width: w, height: h,
    top:  Math.max(0, Math.min(Math.round(l.yPct * pa.height), pa.height - h)),
    left: Math.max(0, Math.min(Math.round(l.xPct * pa.width),  pa.width  - w)) };
}

/** Composite all layers for a placement to a PNG Blob. */
async function compositeToPng(
  placeLayers: DesignLayer[],
  pa: { width: number; height: number }
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width  = pa.width;
  canvas.height = pa.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, pa.width, pa.height);

  for (const layer of placeLayers) {
    if (layer.kind === "image") {
      const src = layer.uploadedUrl || layer.previewUrl;
      if (!src) continue;
      await new Promise<void>((res) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const w = layer.wPct * pa.width;
          const h = layer.natW > 0 ? w * (layer.natH / layer.natW) : w;
          ctx.drawImage(img, layer.xPct * pa.width, layer.yPct * pa.height, w, h);
          res();
        };
        img.onerror = () => res();
        img.src = src;
      });
    } else {
      // Text layer
      const fontSize = layer.fontSizePct * pa.width;
      const fontStr = `${layer.italic ? "italic " : ""}${layer.bold ? "bold " : ""}${fontSize}px "${layer.fontFamily}", sans-serif`;
      try { await document.fonts.load(fontStr); } catch { /* continue */ }
      ctx.save();
      ctx.font = fontStr;
      ctx.fillStyle = layer.color;
      ctx.textAlign = layer.align;
      ctx.textBaseline = "top";
      try { (ctx as unknown as Record<string, string>).letterSpacing = `${layer.letterSpacing * fontSize}px`; } catch { /* not all browsers */ }
      const lines = layer.text.split("\n");
      const lineH = fontSize * 1.3;
      const boxW = layer.wPct * pa.width;
      const originX = layer.xPct * pa.width + (layer.align === "center" ? boxW / 2 : layer.align === "right" ? boxW : 0);
      const originY = layer.yPct * pa.height;
      lines.forEach((line, i) => ctx.fillText(line, originX, originY + i * lineH, boxW));
      ctx.restore();
    }
  }

  return new Promise(res => canvas.toBlob(b => res(b), "image/png"));
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  userId: string | null;
  projectId?: string | null;
  onProductCreated: (product: NewProduct) => void;
  onClose: () => void;
  uploadDesign: (file: File) => Promise<string>;
};

const STEP_LABELS = ["Product Type", "Design", "Price", "Details", "Create"];

export default function AddProductModal({ userId: _userId, projectId, onProductCreated, onClose, uploadDesign }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // ── Step 2 — multi-placement layer system ─────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [layers, setLayers] = useState<Record<string, DesignLayer[]>>({});
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [compositeUrls, setCompositeUrls] = useState<Record<string, string>>({});
  const [placements, setPlacements] = useState<string[]>(["front"]);
  const [placementLabels, setPlacementLabels] = useState<Record<string, string>>({ front: "Front" });
  const [printAreas, setPrintAreas] = useState<Record<string, { width: number; height: number }>>({ front: { width: 1800, height: 2400 } });
  const [activePlacement, setActivePlacement] = useState<string>("front");
  const [loadingPrintfiles, setLoadingPrintfiles] = useState(false);
  const [templateImages, setTemplateImages] = useState<Record<string, TemplateImageInfo>>({});
  const [uploading, setUploading] = useState(false);
  const [designMode, setDesignMode] = useState<"upload" | "ai">("upload");
  // Mockup preview
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [previewMockupUrls, setPreviewMockupUrls] = useState<string[]>([]);
  // AI generation
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStyle, setAiStyle] = useState("minimalist");
  const [aiState, setAiState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiGeneratedUrls, setAiGeneratedUrls] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  // Editor metrics
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [editorActualWidth, setEditorActualWidth] = useState(225);
  const dragStateRef = useRef<{
    kind: "layer";
    type: "move" | "resize-se" | "resize-sw" | "resize-ne" | "resize-nw";
    pointerId: number;
    layerId: string; placement: string;
    startX: number; startY: number;
    startXPct: number; startYPct: number; startWPct: number;
    startFontSizePct: number;
  } | null>(null);

  // ── Step 3 ────────────────────────────────────────────────────────────────
  const [price, setPrice] = useState(0);

  // ── Step 4 ────────────────────────────────────────────────────────────────
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");

  // Mockup generation (background, step 3)
  const [mockupUrls, setMockupUrls] = useState<string[]>([]);
  const [mockupState, setMockupState] = useState<"idle" | "generating" | "done" | "error">("idle");

  // Final save
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Load catalog
  useEffect(() => {
    fetch("/api/printful/products")
      .then(r => r.json())
      .then(d => setCatalogProducts(Array.isArray(d.result) ? d.result : []))
      .catch(() => setCatalogProducts([]))
      .finally(() => setLoadingCatalog(false));
  }, []);

  // Load Google Fonts once
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("vc-gfonts")) return;
    const link = document.createElement("link");
    link.id = "vc-gfonts";
    link.rel = "stylesheet";
    link.href = GFONTS_URL;
    document.head.appendChild(link);
  }, []);

  // Track editor container width for accurate text size display
  useEffect(() => {
    const el = editorContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setEditorActualWidth(el.clientWidth || 225));
    ro.observe(el);
    setEditorActualWidth(el.clientWidth || 225);
    return () => ro.disconnect();
  });

  // Load variants + printfiles when product selected
  const loadVariants = useCallback(async (product: CatalogProduct) => {
    setLoadingVariants(true);
    setLoadingPrintfiles(true);
    try {
      const [varRes, pfRes] = await Promise.all([
        fetch(`/api/printful/catalog/${product.id}`),
        fetch(`/api/printful/printfiles?productId=${product.id}`),
      ]);
      if (varRes.ok) {
        const d = await varRes.json();
        setVariants(Array.isArray(d.variants) ? d.variants : []);
      }
      if (pfRes.ok) {
        const pf = await pfRes.json();
        const newPl: string[] = pf.placements?.length > 0 ? pf.placements : ["front"];
        setPlacements(newPl);
        setPlacementLabels(pf.placementLabels ?? { front: "Front" });
        setPrintAreas(pf.printAreas ?? { front: { width: 1800, height: 2400 } });
        setTemplateImages(pf.templateImages ?? {});
        setActivePlacement(newPl[0]);
        setLayers(Object.fromEntries(newPl.map(p => [p, []])));
      }
    } catch {
      setVariants([]);
    } finally {
      setLoadingVariants(false);
      setLoadingPrintfiles(false);
    }
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const filteredProducts = selectedCategory
    ? catalogProducts.filter(p => {
        const cat = CATEGORIES.find(c => c.id === selectedCategory);
        if (!cat) return false;
        const t = ((p.type_name || "") + " " + (p.title || "")).toUpperCase();
        return (cat.keywords as readonly string[]).some(kw => t.includes(kw));
      })
    : [];

  const maxVariantCost = variants.length > 0 ? Math.max(...variants.map(v => parseFloat(v.price) || 0)) : 0;
  const minPrice = calculateMinimumPrice(maxVariantCost);
  const suggestedPrice = Math.ceil(maxVariantCost * 2.5);

  useEffect(() => {
    if (selectedProduct && variants.length > 0) {
      const cat = selectedCategory;
      if (cat) { const g = NAME_SUGGESTIONS[cat as CategoryId]; setProductName(g ? g(selectedProduct.brand) : selectedProduct.title); }
      setPrice(suggestedPrice || minPrice);
    }
    setMockupUrls([]); setMockupState("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, variants]);

  const activePlaceLayers = layers[activePlacement] ?? [];
  const hasLayersForActive = activePlaceLayers.length > 0;
  const hasAnyLayers = placements.some(pl => (layers[pl] ?? []).length > 0);
  const selectedLayer = activePlaceLayers.find(l => l.id === selectedLayerId) ?? null;

  const printArea = printAreas[activePlacement] ?? { width: 1800, height: 2400 };
  const editorMaxH = 300;
  const editorW = Math.min(512, Math.round(editorMaxH * printArea.width / printArea.height));

  // Template image layout (when Printful template data is available)
  const templateInfo = templateImages[activePlacement];
  const outerEditorW = templateInfo
    ? Math.min(512, Math.round(editorMaxH * templateInfo.templateWidth / templateInfo.templateHeight))
    : editorW;
  const outerEditorH = templateInfo
    ? Math.round(outerEditorW * templateInfo.templateHeight / templateInfo.templateWidth)
    : Math.round(editorW * printArea.height / printArea.width);
  const paLeftPct = templateInfo ? templateInfo.printAreaLeft / templateInfo.templateWidth : 0;
  const paTopPct  = templateInfo ? templateInfo.printAreaTop  / templateInfo.templateHeight : 0;
  const paWidthPct  = templateInfo ? templateInfo.printAreaWidth  / templateInfo.templateWidth  : 1;
  const paHeightPct = templateInfo ? templateInfo.printAreaHeight / templateInfo.templateHeight : 1;
  const printAreaPixelW = Math.round(outerEditorW * paWidthPct);
  const printAreaPixelH = Math.round(outerEditorH * paHeightPct);

  const colorGroups = variants.reduce<{ color: string; code?: string; count: number }[]>((acc, v) => {
    if (!acc.find(c => c.color === v.color)) acc.push({ color: v.color, code: v.color_code, count: variants.filter(x => x.color === v.color).length });
    return acc;
  }, []).slice(0, 8);
  const sizes = [...new Set(variants.map(v => v.size))].slice(0, 10);

  // ── Editor pointer handlers ───────────────────────────────────────────────

  function onLayerPointerDown(e: React.PointerEvent, layerId: string, type: "move" | "resize-se" | "resize-sw" | "resize-ne" | "resize-nw") {
    e.stopPropagation();
    setSelectedLayerId(layerId);
    const pl = activePlacement;
    const layer = (layers[pl] ?? []).find(l => l.id === layerId);
    if (!layer) return;
    dragStateRef.current = {
      kind: "layer", type, pointerId: e.pointerId, layerId, placement: pl,
      startX: e.clientX, startY: e.clientY,
      startXPct: layer.xPct, startYPct: layer.yPct, startWPct: layer.wPct,
      startFontSizePct: layer.kind === "text" ? layer.fontSizePct : 0,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onEditorPointerMove(e: React.PointerEvent) {
    const drag = dragStateRef.current;
    const container = editorContainerRef.current;
    if (!drag || !container) return;
    const rect = container.getBoundingClientRect();
    const cw = rect.width;
    const pa = printAreas[drag.placement] ?? { width: 1800, height: 2400 };
    const ch = cw * (pa.height / pa.width);
    const dxPct = (e.clientX - drag.startX) / cw;
    const dyPct = (e.clientY - drag.startY) / ch;

    setLayers(prev => {
      const pls = prev[drag.placement] ?? [];
      const idx = pls.findIndex(l => l.id === drag.layerId);
      if (idx === -1) return prev;
      const d = pls[idx];

      let updated: DesignLayer;
      if (drag.type === "move") {
        const asp = d.kind === "image" && d.natW > 0 ? d.natH / d.natW : 0;
        const hFrac = asp > 0 ? d.wPct * asp * (pa.width / pa.height) : d.kind === "text" ? d.fontSizePct * (pa.width / pa.height) * 1.4 : 0;
        updated = { ...d,
          xPct: Math.max(0, Math.min(1 - d.wPct,             drag.startXPct + dxPct)),
          yPct: Math.max(0, Math.min(hFrac > 0 ? 1 - hFrac : 0.9, drag.startYPct + dyPct)),
        };
      } else if (drag.type === "resize-se" || drag.type === "resize-ne") {
        if (d.kind === "text") {
          updated = { ...d, fontSizePct: Math.max(0.03, Math.min(0.5, drag.startFontSizePct + dxPct)) };
        } else {
          updated = { ...d, wPct: Math.max(0.05, Math.min(1 - drag.startXPct, drag.startWPct + dxPct)) };
        }
      } else { // nw or sw — grow left
        if (d.kind === "text") {
          updated = { ...d, fontSizePct: Math.max(0.03, Math.min(0.5, drag.startFontSizePct - dxPct)) };
        } else {
          const newW = Math.max(0.05, Math.min(drag.startXPct + drag.startWPct, drag.startWPct - dxPct));
          updated = { ...d, wPct: newW, xPct: Math.max(0, drag.startXPct + drag.startWPct - newW) };
        }
      }

      const next = [...pls];
      next[idx] = updated;
      return { ...prev, [drag.placement]: next };
    });
  }

  function onEditorPointerUp() { dragStateRef.current = null; }

  function onEditorClick(e: React.MouseEvent) {
    if (e.target === editorContainerRef.current) setSelectedLayerId(null);
  }

  // ── Layer management ──────────────────────────────────────────────────────

  function handleFileChange(file: File) {
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const layer = makeImageLayer({ file, previewUrl: blobUrl, natW: img.naturalWidth, natH: img.naturalHeight });
      setLayers(prev => ({ ...prev, [activePlacement]: [...(prev[activePlacement] ?? []), layer] }));
      setSelectedLayerId(layer.id);
    };
    img.src = blobUrl;
    setPreviewState("idle"); setPreviewMockupUrls([]);
  }

  function selectAiImage(url: string) {
    const img = new Image();
    img.onload = () => {
      const layer = makeImageLayer({ previewUrl: url, uploadedUrl: url, natW: img.naturalWidth, natH: img.naturalHeight });
      setLayers(prev => ({ ...prev, [activePlacement]: [...(prev[activePlacement] ?? []), layer] }));
      setSelectedLayerId(layer.id);
    };
    img.src = url;
    setPreviewState("idle"); setPreviewMockupUrls([]);
  }

  function addTextLayer() {
    const layer = makeTextLayer();
    setLayers(prev => ({ ...prev, [activePlacement]: [...(prev[activePlacement] ?? []), layer] }));
    setSelectedLayerId(layer.id);
    setPreviewState("idle"); setPreviewMockupUrls([]);
  }

  function updateLayer(id: string, updates: Partial<TextLayer> | Partial<ImageLayer>) {
    setLayers(prev => ({
      ...prev,
      [activePlacement]: (prev[activePlacement] ?? []).map(l => l.id === id ? { ...l, ...updates } as DesignLayer : l),
    }));
  }

  function removeLayerById(id: string) {
    setLayers(prev => ({ ...prev, [activePlacement]: (prev[activePlacement] ?? []).filter(l => l.id !== id) }));
    if (selectedLayerId === id) setSelectedLayerId(null);
    setPreviewState("idle"); setPreviewMockupUrls([]);
  }

  function bringLayerForward(id: string) {
    setLayers(prev => {
      const pls = [...(prev[activePlacement] ?? [])];
      const i = pls.findIndex(l => l.id === id);
      if (i < pls.length - 1) { [pls[i], pls[i + 1]] = [pls[i + 1], pls[i]]; }
      return { ...prev, [activePlacement]: pls };
    });
  }

  // ── Layer renderer (shared between template and fallback editor layouts) ──

  function renderLayers() {
    return activePlaceLayers.map((layer, idx) => {
      const isSel = layer.id === selectedLayerId;
      const handles = (["nw", "ne", "se", "sw"] as const).map(h => (
        <div key={h} onPointerDown={e => { e.stopPropagation(); onLayerPointerDown(e, layer.id, `resize-${h}` as "resize-nw"); }}
          style={cornerHandle(h)} />
      ));

      if (layer.kind === "image") {
        return (
          <div key={layer.id}
            onPointerDown={e => onLayerPointerDown(e, layer.id, "move")}
            style={{
              position: "absolute",
              left: `${layer.xPct * 100}%`, top: `${layer.yPct * 100}%`,
              width: `${layer.wPct * 100}%`,
              cursor: "move", touchAction: "none",
              outline: isSel ? "1.5px dashed rgba(15,23,42,0.7)" : "none",
              outlineOffset: 2, zIndex: idx + 1,
            }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={layer.previewUrl!} alt="Design" draggable={false}
              style={{ display: "block", width: "100%", height: "auto", pointerEvents: "none", userSelect: "none" }} />
            {isSel && handles}
          </div>
        );
      } else {
        const screenFont = layer.fontSizePct * editorActualWidth;
        return (
          <div key={layer.id}
            onPointerDown={e => onLayerPointerDown(e, layer.id, "move")}
            style={{
              position: "absolute",
              left: `${layer.xPct * 100}%`, top: `${layer.yPct * 100}%`,
              width: `${layer.wPct * 100}%`,
              cursor: "move", touchAction: "none",
              fontFamily: `"${layer.fontFamily}", sans-serif`,
              fontSize: screenFont, color: layer.color,
              fontWeight: layer.bold ? 700 : 400,
              fontStyle: layer.italic ? "italic" : "normal",
              textAlign: layer.align,
              letterSpacing: `${layer.letterSpacing}em`,
              lineHeight: 1.2, whiteSpace: "pre-wrap", wordBreak: "break-word",
              userSelect: "none", pointerEvents: "auto",
              outline: isSel ? "1.5px dashed rgba(15,23,42,0.7)" : "1px dashed rgba(0,0,0,0.15)",
              outlineOffset: 2, padding: "1px 2px", zIndex: idx + 1,
            }}>
            {layer.text || "YOUR TEXT"}
            {isSel && handles}
          </div>
        );
      }
    });
  }

  // ── API handlers ─────────────────────────────────────────────────────────

  async function handlePreviewMockup() {
    const pls = activePlaceLayers;
    if (pls.length === 0 || !selectedProduct || variants.length === 0) return;
    setPreviewState("loading");
    try {
      // Upload any pending image files
      const uploadedLayers = await Promise.all(pls.map(async l => {
        if (l.kind === "image" && l.file && !l.uploadedUrl) {
          const url = await uploadDesign(l.file);
          return { ...l, uploadedUrl: url } as ImageLayer;
        }
        return l;
      }));
      setLayers(prev => ({ ...prev, [activePlacement]: uploadedLayers }));

      // Composite all layers to a single image
      const blob = await compositeToPng(uploadedLayers, printArea);
      if (!blob) throw new Error("Failed to composite layers");
      const compositeFile = new File([blob], `preview-${activePlacement}.png`, { type: "image/png" });
      const compositeUrl = await uploadDesign(compositeFile);

      const inStockIds = variants.filter(v => v.in_stock).slice(0, 3).map(v => v.id);
      // Use first image layer's position for mockup placement, or center
      const firstImgLayer = uploadedLayers.find(l => l.kind === "image") as ImageLayer | undefined;
      const position = firstImgLayer
        ? imagePosToPosition(firstImgLayer, printArea)
        : { area_width: printArea.width, area_height: printArea.height, width: Math.round(printArea.width * 0.8), height: Math.round(printArea.height * 0.8), top: Math.round(printArea.height * 0.1), left: Math.round(printArea.width * 0.1) };

      const res = await fetch("/api/printful/generate-mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct.id, variantIds: inStockIds, designImageUrl: compositeUrl, position }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.mockupUrls) || data.mockupUrls.length === 0) throw new Error(data.error || "No mockups");
      setPreviewMockupUrls(data.mockupUrls);
      setPreviewState("done");
    } catch {
      setPreviewState("error");
    }
  }

  async function handleGenerateDesign() {
    if (!aiPrompt.trim()) return;
    setAiState("loading"); setAiError(null); setAiGeneratedUrls([]);
    try {
      const res = await fetch("/api/ai/generate-design", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim(), style: aiStyle }),
      });
      const data = await res.json();
      if (data.comingSoon) { setAiError("AI generation coming soon! Upload your own design for now."); setAiState("error"); return; }
      if (!res.ok || !Array.isArray(data.imageUrls) || data.imageUrls.length === 0) throw new Error(data.error || "Generation failed");
      setAiGeneratedUrls(data.imageUrls); setAiState("done");
    } catch (e: unknown) { setAiError((e as Error)?.message || "Generation failed."); setAiState("error"); }
  }

  async function generateMockups(
    imageUrl: string, productId: number, varIds: number[],
    position: ReturnType<typeof imagePosToPosition>,
  ) {
    setMockupState("generating");
    try {
      const res = await fetch("/api/printful/generate-mockup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantIds: varIds, designImageUrl: imageUrl, position }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.mockupUrls) || data.mockupUrls.length === 0) throw new Error(data.error || "No mockups");
      setMockupUrls(data.mockupUrls); setMockupState("done");
    } catch { setMockupState("error"); }
  }

  async function handleUploadAndNext() {
    if (!hasAnyLayers) return;
    setUploading(true); setError(null);
    try {
      // 1. Upload any raw files in image layers
      const updatedLayers: Record<string, DesignLayer[]> = {};
      for (const [pl, pls] of Object.entries(layers)) {
        updatedLayers[pl] = await Promise.all(pls.map(async l => {
          if (l.kind === "image" && l.file && !l.uploadedUrl) {
            return { ...l, uploadedUrl: await uploadDesign(l.file) } as ImageLayer;
          }
          return l;
        }));
      }
      setLayers(updatedLayers);

      // 2. Composite each placement that has layers
      const newComposites: Record<string, string> = {};
      for (const [pl, pls] of Object.entries(updatedLayers)) {
        if (pls.length === 0) continue;
        const pa = printAreas[pl] ?? { width: 1800, height: 2400 };
        const blob = await compositeToPng(pls, pa);
        if (!blob) continue;
        const file = new File([blob], `design-${pl}-${Date.now()}.png`, { type: "image/png" });
        newComposites[pl] = await uploadDesign(file);
      }
      setCompositeUrls(newComposites);
      setStep(3);

      // 3. Generate mockups in background using primary placement
      const primaryPl = newComposites["front"] ? "front" : Object.keys(newComposites)[0];
      const primaryUrl = newComposites[primaryPl];
      if (primaryUrl && selectedProduct && variants.length > 0) {
        if (previewMockupUrls.length > 0) { setMockupUrls(previewMockupUrls); setMockupState("done"); }
        else {
          const inStockIds = variants.filter(v => v.in_stock).slice(0, 3).map(v => v.id);
          const pa = printAreas[primaryPl] ?? { width: 1800, height: 2400 };
          const firstImg = (updatedLayers[primaryPl] ?? []).find(l => l.kind === "image") as ImageLayer | undefined;
          const position = firstImg ? imagePosToPosition(firstImg, pa)
            : { area_width: pa.width, area_height: pa.height, width: Math.round(pa.width * 0.8), height: Math.round(pa.height * 0.8), top: Math.round(pa.height * 0.1), left: Math.round(pa.width * 0.1) };
          generateMockups(primaryUrl, selectedProduct.id, inStockIds, position);
        }
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || "Upload failed. Please try again.");
    } finally { setUploading(false); }
  }

  async function handleSave() {
    const primaryUrl = compositeUrls["front"] ?? compositeUrls[placements[0]];
    if (!selectedProduct || !primaryUrl || price < minPrice || !productName.trim()) return;
    setSaving(true); setError(null);
    const retailPrice = price.toFixed(2);
    const variantInputs = variants.filter(v => v.in_stock).map(v => ({ variantId: v.id, retailPrice }));
    const placementFiles = placements.filter(pl => compositeUrls[pl]).map(pl => ({ placement: pl, url: compositeUrls[pl] }));
    try {
      const inStockV = variants.filter(v => v.in_stock);
      const res = await fetch("/api/printful/create-product", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(), description: description.trim(),
          designUrl: primaryUrl, variantInputs,
          projectId: projectId ?? undefined,
          printfulCatalogProductId: selectedProduct.id,
          printfulVariants: inStockV.map(v => ({ id: v.id, size: v.size, color: v.color, color_code: v.color_code })),
          mockupUrls: mockupUrls.length > 0 ? mockupUrls : undefined,
          placementFiles: placementFiles.length > 0 ? placementFiles : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");
      onProductCreated({
        id: data.productId || uid(),
        name: productName.trim(), description: description.trim(), price: `$${price}`,
        imageDataUrl: mockupUrls[0] || data.thumbnailUrl || primaryUrl,
        design_url: primaryUrl,
        mockup_urls: mockupUrls.length > 0 ? mockupUrls : undefined,
        product_type: "physical",
        printful_sync_product_id: data.syncProductId,
        printful_catalog_product_id: selectedProduct.id,
        printful_variant_ids: inStockV.map(v => v.id),
        printful_variants: inStockV.map(v => ({ id: v.id, size: v.size, color: v.color, color_code: v.color_code })),
      });
      setSuccess(true);
    } catch (e: unknown) { setError((e as Error)?.message || "Failed."); }
    finally { setSaving(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const breakdown = price > 0 && price >= minPrice ? calculateProfitBreakdown(price, maxVariantCost, 0) : null;

  // Corner handle style helper
  const cornerHandle = (handle: string) => ({
    position: "absolute" as const,
    width: 10, height: 10,
    background: "#0f172a", border: "2px solid #fff", borderRadius: 2, zIndex: 10, touchAction: "none" as const,
    ...(handle.includes("n") ? { top: -5 } : { bottom: -5 }),
    ...(handle.includes("w")
      ? { left: -5, cursor: handle === "nw" ? "nw-resize" : "sw-resize" }
      : { right: -5, cursor: handle === "ne" ? "ne-resize" : "se-resize" }),
  });

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.22)", margin: 16, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid #F0EFED", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>Add Physical Product</div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#AAA", padding: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {STEP_LABELS.map((label, i) => {
              const n = i + 1; const active = step === n; const done = step > n;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "#16a34a" : active ? "#0f172a" : "#EEEDE9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {done ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                           : <span style={{ fontSize: 10, fontWeight: 600, color: active ? "#fff" : "#AAA" }}>{n}</span>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? "#1A1A1A" : "#AAA", whiteSpace: "nowrap" }}>{label}</span>
                  </div>
                  {i < STEP_LABELS.length - 1 && <div style={{ width: 16, height: 1, background: "#EEEDE9", flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── SUCCESS ── */}
          {success && (
            <div style={{ textAlign: "center", padding: "40px 16px" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A", marginBottom: 6 }}>Product created!</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>It&apos;s now in your store and ready to sell.</div>
              <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
            </div>
          )}

          {/* ── STEP 1 ── */}
          {!success && step === 1 && (
            <div>
              {!selectedCategory ? (
                <>
                  <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Choose a product type to get started.</p>
                  {loadingCatalog ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {[...Array(8)].map((_, i) => <div key={i} style={{ height: 72, background: "#F5F4F2", borderRadius: 10 }} />)}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                          style={{ padding: "14px 8px", borderRadius: 10, border: "1.5px solid #E7E5E4", background: "#FAFAF8", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#0f172a"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E7E5E4"; }}>
                          <span style={{ fontSize: 22 }}>{cat.id === "tshirts" ? "👕" : cat.id === "hoodies" ? "🧥" : cat.id === "sweatshirts" ? "🧶" : cat.id === "tanks" ? "🎽" : cat.id === "longsleeves" ? "👔" : cat.id === "allover" ? "🎨" : cat.id === "hats" ? "🧢" : cat.id === "mugs" ? "☕" : cat.id === "posters" ? "🖼️" : cat.id === "phonecases" ? "📱" : cat.id === "totebags" ? "👜" : "🏷️"}</span>
                          <span style={{ fontSize: 11, fontWeight: 500, color: "#1A1A1A", textAlign: "center", lineHeight: 1.3 }}>{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : !selectedProduct ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setSelectedCategory(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 12, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6" /></svg>Back
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{CATEGORIES.find(c => c.id === selectedCategory)?.label}</span>
                  </div>
                  {filteredProducts.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#AAA", textAlign: "center", padding: "24px 0" }}>No products found in this category.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {filteredProducts.slice(0, 20).map(p => (
                        <button key={p.id} onClick={() => { setSelectedProduct(p); loadVariants(p); }}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #E7E5E4", background: "#FAFAF8", cursor: "pointer", textAlign: "left" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#0f172a"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E7E5E4"; }}>
                          {p.thumbnail_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={p.thumbnail_url} alt={p.title} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                            : <div style={{ width: 44, height: 44, background: "#EEEDE9", borderRadius: 6, flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                            <div style={{ fontSize: 11, color: "#AAA", marginTop: 2 }}>{p.brand || p.type_name}</div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2.2"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <button onClick={() => { setSelectedProduct(null); setVariants([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 12, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6" /></svg>Back
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedProduct.title}</span>
                  </div>
                  {loadingVariants ? (
                    <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#AAA" }}>Loading variants…</div>
                  ) : (
                    <div>
                      {colorGroups.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 8 }}>Available Colors ({colorGroups.length})</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {colorGroups.map(c => (
                              <div key={c.color} title={c.color} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 6, background: "#F5F4F2", fontSize: 11, color: "#555" }}>
                                <div style={{ width: 12, height: 12, borderRadius: "50%", background: c.code || "#ccc", border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />{c.color}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {sizes.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 8 }}>Available Sizes</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {sizes.map(s => <span key={s} style={{ padding: "3px 8px", borderRadius: 5, background: "#F5F4F2", fontSize: 12, color: "#555", fontWeight: 500 }}>{s}</span>)}
                          </div>
                        </div>
                      )}
                      {maxVariantCost > 0 && (
                        <div style={{ padding: "10px 12px", borderRadius: 8, background: "#FAFAF8", border: "1px solid #EEEDE9", fontSize: 12, color: "#888" }}>
                          Production cost: <strong style={{ color: "#1A1A1A" }}>from {fmt(Math.min(...variants.map(v => parseFloat(v.price) || 99)))}</strong> per item
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── STEP 2: Design ── */}
          {!success && step === 2 && (
            <div>
              {/* Placement tabs */}
              {placements.length > 1 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA" }}>Placement</div>
                    <div style={{ fontSize: 11, color: "#AAA" }}>— front required, others optional</div>
                  </div>
                  <div style={{ display: "flex", gap: 0, border: "1.5px solid #E7E5E4", borderRadius: 10, overflow: "hidden" }}>
                    {placements.map((pl, pi) => {
                      const hasLayers = (layers[pl] ?? []).length > 0;
                      const isActive = activePlacement === pl;
                      return (
                        <button key={pl} onClick={() => { setActivePlacement(pl); setPreviewState("idle"); setPreviewMockupUrls([]); setSelectedLayerId(null); }}
                          style={{ flex: 1, padding: "7px 4px", border: "none", background: isActive ? "#0f172a" : "#FAFAF8", color: isActive ? "#fff" : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {hasLayers && <span style={{ width: 5, height: 5, borderRadius: "50%", background: isActive ? "#4ade80" : "#16a34a", flexShrink: 0 }} />}
                            {placementLabels[pl] ?? pl}
                          </div>
                          {pi > 0 && <span style={{ fontSize: 9, opacity: 0.55, fontWeight: 400 }}>optional</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── EDITOR (shown when layers exist) ── */}
              {hasLayersForActive ? (
                <div style={{ marginBottom: 14 }}>
                  {/* Product reference bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "7px 10px", background: "#F8F7F5", borderRadius: 8, border: "1px solid #E7E5E4" }}>
                    {selectedProduct?.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedProduct.thumbnail_url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedProduct?.title}</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>
                        {placementLabels[activePlacement] ?? activePlacement} · Drag layers · Corner handles to resize
                      </div>
                    </div>
                  </div>

                  {/* Editor canvas */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {templateInfo ? (
                      /* ── Template image layout: full product photo + print area overlay ── */
                      <div
                        style={{
                          position: "relative",
                          width: outerEditorW, height: outerEditorH,
                          borderRadius: 10, overflow: "hidden",
                          background: "#F5F4F2", userSelect: "none", touchAction: "none", flexShrink: 0,
                        }}
                      >
                        {/* Blank product photo */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={templateInfo.url} alt="" draggable={false}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
                        {/* Print area — all layers live inside here, pointer handlers here */}
                        <div
                          ref={editorContainerRef}
                          onPointerMove={onEditorPointerMove}
                          onPointerUp={onEditorPointerUp}
                          onPointerLeave={onEditorPointerUp}
                          onClick={onEditorClick}
                          style={{
                            position: "absolute",
                            left: `${paLeftPct * 100}%`, top: `${paTopPct * 100}%`,
                            width: printAreaPixelW, height: printAreaPixelH,
                            border: "1.5px dashed rgba(255,255,255,0.65)",
                            boxSizing: "border-box", cursor: "default",
                          }}
                        >
                          <div style={{ position: "absolute", bottom: 2, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "rgba(255,255,255,0.55)", pointerEvents: "none", lineHeight: 1 }}>
                            print area
                          </div>
                          {renderLayers()}
                        </div>
                      </div>
                    ) : (
                      /* ── Fallback: print area as editor ── */
                      <div
                        ref={editorContainerRef}
                        onPointerMove={onEditorPointerMove}
                        onPointerUp={onEditorPointerUp}
                        onPointerLeave={onEditorPointerUp}
                        onClick={onEditorClick}
                        style={{
                          position: "relative",
                          width: editorW, maxWidth: "100%",
                          aspectRatio: `${printArea.width} / ${printArea.height}`,
                          border: "2px dashed #D1D5DB", borderRadius: 10,
                          background: "#F5F4F2",
                          overflow: "hidden", userSelect: "none", touchAction: "none", cursor: "default",
                        }}
                      >
                        {selectedProduct?.thumbnail_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selectedProduct.thumbnail_url} alt="" draggable={false}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none", userSelect: "none" }} />
                        )}
                        <div style={{ position: "absolute", bottom: 3, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "rgba(0,0,0,0.25)", pointerEvents: "none" }}>
                          {printArea.width}×{printArea.height}px print area
                        </div>
                        {renderLayers()}
                      </div>
                    )}
                  </div>

                  {/* Layer toolbar */}
                  <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f); e.target.value = ""; }} />
                    <button onClick={() => fileRef.current?.click()}
                      style={{ padding: "6px 11px", borderRadius: 8, border: "1.5px solid #E7E5E4", background: "#FAFAF8", color: "#555", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                      Add Image
                    </button>
                    <button onClick={addTextLayer}
                      style={{ padding: "6px 11px", borderRadius: 8, border: "1.5px solid #E7E5E4", background: "#FAFAF8", color: "#555", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 7V4h16v3M9 20h6M12 4v16" /></svg>
                      Add Text
                    </button>
                    {selectedLayer && (
                      <>
                        {activePlaceLayers.indexOf(selectedLayer) < activePlaceLayers.length - 1 && (
                          <button onClick={() => bringLayerForward(selectedLayer.id)}
                            style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #E7E5E4", background: "#FAFAF8", color: "#555", fontSize: 12, cursor: "pointer" }}
                            title="Bring forward">↑</button>
                        )}
                        <button onClick={() => removeLayerById(selectedLayer.id)}
                          style={{ padding: "6px 11px", borderRadius: 8, border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#991B1B", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Remove
                        </button>
                      </>
                    )}
                    <div style={{ marginLeft: "auto" }}>
                      <button onClick={handlePreviewMockup} disabled={previewState === "loading"}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid #0f172a", background: "#fff", color: "#0f172a", fontSize: 12, fontWeight: 600, cursor: previewState === "loading" ? "not-allowed" : "pointer", opacity: previewState === "loading" ? 0.5 : 1 }}>
                        {previewState === "loading" ? "Generating…" : previewState === "done" ? "Regenerate" : "Preview Mockup"}
                      </button>
                    </div>
                  </div>

                  {/* ── Text properties panel ── */}
                  {selectedLayer?.kind === "text" && (
                    <div style={{ marginTop: 12, padding: "12px", background: "#F8F7F5", borderRadius: 10, border: "1px solid #E7E5E4" }}>
                      {/* Text input */}
                      <textarea
                        value={selectedLayer.text}
                        onChange={e => updateLayer(selectedLayer.id, { text: e.target.value })}
                        placeholder="Your text here…"
                        rows={2}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #E7E5E4", fontSize: 13, resize: "none", boxSizing: "border-box", marginBottom: 10, fontFamily: `"${selectedLayer.fontFamily}", sans-serif` }}
                      />
                      {/* Font selector */}
                      <div style={{ marginBottom: 10 }}>
                        <select
                          value={selectedLayer.fontFamily}
                          onChange={e => updateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                          style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1.5px solid #E7E5E4", fontSize: 13, background: "#fff", cursor: "pointer" }}
                        >
                          {FONTS.map(f => (
                            <option key={f.family} value={f.family}>{f.name}</option>
                          ))}
                        </select>
                        {/* Font preview strip */}
                        <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 6, background: "#fff", border: "1px solid #E7E5E4", fontFamily: `"${selectedLayer.fontFamily}", sans-serif`, fontSize: 18, color: selectedLayer.color === "#FFFFFF" ? "#000" : selectedLayer.color, textAlign: "center", letterSpacing: `${selectedLayer.letterSpacing}em`, fontWeight: selectedLayer.bold ? 700 : 400, fontStyle: selectedLayer.italic ? "italic" : "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {selectedLayer.text || "Preview"}
                        </div>
                      </div>
                      {/* Color */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", marginBottom: 6 }}>Color</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          {TEXT_COLORS.map(c => (
                            <div key={c} onClick={() => updateLayer(selectedLayer.id, { color: c })}
                              style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: selectedLayer.color === c ? "3px solid #0f172a" : "1.5px solid rgba(0,0,0,0.12)", cursor: "pointer", flexShrink: 0 }} />
                          ))}
                          <input type="color" value={selectedLayer.color}
                            onChange={e => updateLayer(selectedLayer.id, { color: e.target.value })}
                            style={{ width: 22, height: 22, padding: 0, border: "1.5px solid #E7E5E4", borderRadius: "50%", cursor: "pointer", flexShrink: 0 }} title="Custom color" />
                        </div>
                      </div>
                      {/* Style + Align row */}
                      <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
                        <button onClick={() => updateLayer(selectedLayer.id, { bold: !selectedLayer.bold })}
                          style={{ padding: "5px 10px", borderRadius: 7, border: "1.5px solid #E7E5E4", background: selectedLayer.bold ? "#0f172a" : "#fff", color: selectedLayer.bold ? "#fff" : "#1A1A1A", fontSize: 13, fontWeight: 700, cursor: "pointer", lineHeight: 1 }}>B</button>
                        <button onClick={() => updateLayer(selectedLayer.id, { italic: !selectedLayer.italic })}
                          style={{ padding: "5px 10px", borderRadius: 7, border: "1.5px solid #E7E5E4", background: selectedLayer.italic ? "#0f172a" : "#fff", color: selectedLayer.italic ? "#fff" : "#1A1A1A", fontSize: 13, fontStyle: "italic", fontWeight: 700, cursor: "pointer", lineHeight: 1 }}>I</button>
                        <div style={{ width: 1, height: 20, background: "#E7E5E4", flexShrink: 0, margin: "0 2px" }} />
                        {(["left", "center", "right"] as const).map(a => (
                          <button key={a} onClick={() => updateLayer(selectedLayer.id, { align: a })}
                            style={{ padding: "5px 7px", borderRadius: 7, border: "1.5px solid #E7E5E4", background: selectedLayer.align === a ? "#0f172a" : "#fff", color: selectedLayer.align === a ? "#fff" : "#888", fontSize: 11, cursor: "pointer", lineHeight: 1 }}>
                            {a === "left" ? "⬛◻◻" : a === "center" ? "◻⬛◻" : "◻◻⬛"}
                          </button>
                        ))}
                      </div>
                      {/* Font size */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", marginBottom: 4 }}>
                          <span>Size</span><span style={{ textTransform: "none", letterSpacing: 0, color: "#1A1A1A" }}>{Math.round(selectedLayer.fontSizePct * 100)}%</span>
                        </div>
                        <input type="range" min={3} max={40} step={1}
                          value={Math.round(selectedLayer.fontSizePct * 100)}
                          onChange={e => updateLayer(selectedLayer.id, { fontSizePct: Number(e.target.value) / 100 })}
                          style={{ width: "100%", accentColor: "#0f172a" }} />
                      </div>
                      {/* Letter spacing */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", marginBottom: 4 }}>
                          <span>Letter Spacing</span>
                          <span style={{ textTransform: "none", letterSpacing: 0, color: "#1A1A1A" }}>{selectedLayer.letterSpacing > 0 ? "+" : ""}{selectedLayer.letterSpacing.toFixed(2)}em</span>
                        </div>
                        <input type="range" min={-0.05} max={0.5} step={0.01}
                          value={selectedLayer.letterSpacing}
                          onChange={e => updateLayer(selectedLayer.id, { letterSpacing: Number(e.target.value) })}
                          style={{ width: "100%", accentColor: "#0f172a" }} />
                      </div>
                    </div>
                  )}

                  {/* Mockup preview result */}
                  {previewState === "done" && previewMockupUrls.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewMockupUrls[0]} alt="Product mockup" style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 10, border: "1px solid #E7E5E4", display: "block" }} />
                      {previewMockupUrls.length > 1 && (
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          {previewMockupUrls.slice(0, 4).map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={url} alt={`Angle ${i + 1}`} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1.5px solid #E7E5E4" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {previewState === "error" && (
                    <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", fontSize: 12, color: "#92400E", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ flex: 1 }}>Preview failed. You can still proceed.</span>
                      <button onClick={handlePreviewMockup} style={{ background: "none", border: "1px solid #D97706", borderRadius: 6, color: "#92400E", fontSize: 11, padding: "3px 8px", cursor: "pointer" }}>Retry</button>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Empty state: Upload / AI / Text ── */
                <div>
                  {loadingPrintfiles && <div style={{ fontSize: 12, color: "#AAA", marginBottom: 10, textAlign: "center" }}>Loading print area info…</div>}

                  {/* Product preview with print area highlight */}
                  {(templateInfo || selectedProduct?.thumbnail_url) && (
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, padding: "10px 12px", background: "#F8F7F5", borderRadius: 10, border: "1px solid #E7E5E4" }}>
                      <div style={{ position: "relative", width: 72, height: 72, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#EEEDE9" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={templateInfo?.url || selectedProduct?.thumbnail_url || ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {templateInfo && (
                          <div style={{
                            position: "absolute",
                            left: `${paLeftPct * 100}%`, top: `${paTopPct * 100}%`,
                            width: `${paWidthPct * 100}%`, height: `${paHeightPct * 100}%`,
                            border: "1.5px dashed rgba(255,255,255,0.85)", boxSizing: "border-box",
                          }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A", marginBottom: 2 }}>
                          {placementLabels[activePlacement] ?? activePlacement} · {selectedProduct?.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#888" }}>
                          Print area: {printArea.width}×{printArea.height}px · Add a design below
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick-start buttons */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f); e.target.value = ""; }} />
                    <button onClick={addTextLayer}
                      style={{ flex: 1, padding: "14px 8px", borderRadius: 10, border: "1.5px solid #E7E5E4", background: "#FAFAF8", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#0f172a"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E7E5E4"; }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="1.5" strokeLinecap="round"><path d="M4 7V4h16v3M9 20h6M12 4v16" /></svg>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>Add Text</span>
                    </button>
                    <button onClick={() => fileRef.current?.click()}
                      style={{ flex: 1, padding: "14px 8px", borderRadius: 10, border: "1.5px solid #E7E5E4", background: "#FAFAF8", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#0f172a"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E7E5E4"; }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>Upload Image</span>
                    </button>
                    <button onClick={() => setDesignMode("ai")}
                      style={{ flex: 1, padding: "14px 8px", borderRadius: 10, border: `1.5px solid ${designMode === "ai" ? "#0f172a" : "#E7E5E4"}`, background: designMode === "ai" ? "#0f172a" : "#FAFAF8", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                      onMouseEnter={e => { if (designMode !== "ai") e.currentTarget.style.borderColor = "#0f172a"; }}
                      onMouseLeave={e => { if (designMode !== "ai") e.currentTarget.style.borderColor = "#E7E5E4"; }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={designMode === "ai" ? "#fff" : "#AAA"} strokeWidth="1.5" strokeLinecap="round"><path d="M12 2L9 9l-7 3 7 3 3 7 3-7 7-3-7-3z" /></svg>
                      <span style={{ fontSize: 12, fontWeight: 600, color: designMode === "ai" ? "#fff" : "#1A1A1A" }}>Generate AI</span>
                    </button>
                  </div>

                  {/* Design requirements hint */}
                  {selectedCategory && designMode !== "ai" && (
                    <div style={{ marginBottom: 12, fontSize: 12, color: "#888", background: "#FAFAF8", border: "1px solid #EEEDE9", borderRadius: 8, padding: "8px 12px" }}>
                      <strong style={{ color: "#555" }}>Design requirements:</strong> {DESIGN_REQS[selectedCategory]}
                    </div>
                  )}

                  {/* Drag-and-drop zone (upload mode) */}
                  {designMode !== "ai" && (
                    <div
                      onClick={() => fileRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileChange(f); }}
                      style={{ border: "2px dashed #E7E5E4", borderRadius: 12, padding: "36px 24px", textAlign: "center", cursor: "pointer" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#0f172a"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E7E5E4"; }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#888", marginBottom: 4 }}>or drop an image here</div>
                      <div style={{ fontSize: 11, color: "#BBB" }}>PNG, JPG or WebP · max 25 MB</div>
                    </div>
                  )}

                  {/* AI generator panel */}
                  {designMode === "ai" && (
                    <div style={{ background: "#F8F7F5", borderRadius: 12, padding: 14, border: "1px solid #E7E5E4" }}>
                      <div style={{ marginBottom: 10 }}>
                        <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && aiPrompt.trim() && aiState !== "loading") handleGenerateDesign(); }}
                          placeholder="e.g., minimalist mountain sunset logo, vintage surf badge"
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #E7E5E4", fontSize: 13, color: "#1A1A1A", background: "#fff", outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 6 }}>Style</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(["minimalist", "vintage", "bold", "illustrated", "abstract"] as const).map(s => (
                            <button key={s} onClick={() => setAiStyle(s)}
                              style={{ padding: "5px 10px", borderRadius: 7, border: `1.5px solid ${aiStyle === s ? "#0f172a" : "#E7E5E4"}`, background: aiStyle === s ? "#0f172a" : "#FAFAF8", color: aiStyle === s ? "#fff" : "#1A1A1A", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button onClick={handleGenerateDesign} disabled={!aiPrompt.trim() || aiState === "loading"}
                        style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: !aiPrompt.trim() || aiState === "loading" ? "#E5E7EB" : "#0f172a", color: !aiPrompt.trim() || aiState === "loading" ? "#9CA3AF" : "#fff", fontSize: 13, fontWeight: 600, cursor: !aiPrompt.trim() || aiState === "loading" ? "not-allowed" : "pointer" }}>
                        {aiState === "loading" ? "Generating… (10–20 seconds)" : "Generate Design"}
                      </button>
                      {aiState === "error" && aiError && (
                        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 12, color: "#991B1B" }}>{aiError}</div>
                      )}
                      {aiState === "done" && aiGeneratedUrls.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 8 }}>Click to add to canvas</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                            {aiGeneratedUrls.map((url, i) => (
                              <button key={i} onClick={() => selectAiImage(url)}
                                style={{ padding: 0, border: "2px solid #E7E5E4", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "none" }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#0f172a"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E7E5E4"; }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`Option ${i + 1}`} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                              </button>
                            ))}
                          </div>
                          <button onClick={handleGenerateDesign} style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: "1.5px solid #E7E5E4", background: "#FAFAF8", color: "#555", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            Regenerate
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && <div style={{ marginTop: 12, fontSize: 12, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px" }}>{error}</div>}
            </div>
          )}

          {/* ── STEP 3: Price ── */}
          {!success && step === 3 && (
            <div>
              {mockupState === "generating" && (
                <div style={{ marginBottom: 16, padding: "16px 0", borderRadius: 12, background: "#F5F4F2", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minHeight: 100 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BBB" strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  <div style={{ fontSize: 12, color: "#AAA" }}>Generating product mockup…</div>
                </div>
              )}
              {mockupState === "done" && mockupUrls.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 8 }}>Product Preview</div>
                  <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E7E5E4", background: "#F8F7F5", textAlign: "center", padding: "12px 12px 6px", marginBottom: mockupUrls.length > 1 ? 8 : 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mockupUrls[0]} alt="Mockup" style={{ maxHeight: 200, maxWidth: "100%", objectFit: "contain", borderRadius: 8 }} />
                  </div>
                  {mockupUrls.length > 1 && (
                    <div style={{ display: "flex", gap: 6 }}>
                      {mockupUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={url} alt={`Mockup ${i + 1}`} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, border: "1.5px solid #E7E5E4", flexShrink: 0 }} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {mockupState === "error" && (
                <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", fontSize: 12, color: "#92400E" }}>
                  Couldn&apos;t generate preview. Your design will still print correctly.
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 6 }}>Production Cost</div>
                <div style={{ fontSize: 14, color: "#555" }}>Up to <strong style={{ color: "#1A1A1A" }}>{fmt(maxVariantCost)}</strong> per item</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 6 }}>Your Sale Price</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {[minPrice, suggestedPrice, Math.ceil(suggestedPrice * 1.3)].map(p => (
                    <button key={p} onClick={() => setPrice(p)}
                      style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${price === p ? "#0f172a" : "#E7E5E4"}`, background: price === p ? "#0f172a" : "#FAFAF8", color: price === p ? "#fff" : "#1A1A1A", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                      <div>{fmt(p)}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{p === minPrice ? "Minimum" : p === suggestedPrice ? "Suggested" : "Premium"}</div>
                    </button>
                  ))}
                </div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#888", pointerEvents: "none" }}>$</span>
                  <input type="number" min={minPrice} step={1} value={price || ""} onChange={e => setPrice(parseFloat(e.target.value) || 0)} placeholder={String(suggestedPrice)}
                    style={{ width: "100%", padding: "9px 12px 9px 24px", borderRadius: 8, border: `1.5px solid ${price > 0 && price < minPrice ? "#FECACA" : "#E7E5E4"}`, fontSize: 14, fontWeight: 500, color: "#1A1A1A", background: price > 0 && price < minPrice ? "#FEF2F2" : "#fff", outline: "none", boxSizing: "border-box" }} />
                </div>
                {price > 0 && price < minPrice && <div style={{ marginTop: 6, fontSize: 12, color: "#991B1B" }}>Minimum price is {fmt(minPrice)} — covers production + fees.</div>}
              </div>
              {breakdown && (
                <div style={{ background: "#FAFAF8", border: "1px solid #E7E5E4", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                  {[{ label: "Sale price", value: fmt(breakdown.salePrice) }, { label: "Stripe fee", value: `−${fmt(breakdown.stripeFee)}` }, { label: "Volcity fee (5%)", value: `−${fmt(breakdown.volcityFee)}` }, { label: "Production cost", value: `−${fmt(breakdown.printfulCost)}` }].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#888" }}>{label}</span><span style={{ color: "#555" }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, paddingTop: 5, borderTop: "1px solid #EEEDE9", marginTop: 3 }}>
                    <span style={{ color: "#1A1A1A" }}>Your profit</span>
                    <span style={{ color: breakdown.ownerProfit >= 5 ? "#16a34a" : "#D97706" }}>{fmt(breakdown.ownerProfit)} / item</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Details ── */}
          {!success && step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", display: "block", marginBottom: 6 }}>Product Name</label>
                <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Classic Unisex T-Shirt"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E7E5E4", fontSize: 14, color: "#1A1A1A", background: "#fff", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", display: "block", marginBottom: 6 }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the product for your customers…" rows={3}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E7E5E4", fontSize: 13, color: "#1A1A1A", background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 8 }}>Variants ({variants.filter(v => v.in_stock).length} available)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {colorGroups.slice(0, 6).map(c => (
                    <div key={c.color} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 5, background: "#F5F4F2", fontSize: 11, color: "#555" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.code || "#ccc", border: "1px solid rgba(0,0,0,0.1)" }} />{c.color} · {c.count} sizes
                    </div>
                  ))}
                  {colorGroups.length > 6 && <span style={{ fontSize: 11, color: "#AAA", alignSelf: "center" }}>+{colorGroups.length - 6} more</span>}
                </div>
              </div>
              {error && <div style={{ fontSize: 12, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px" }}>{error}</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px 20px", borderTop: "1px solid #F0EFED", flexShrink: 0, display: success ? "none" : "flex", gap: 10 }}>
          {step > 1 && (
            <button onClick={() => { setStep(s => (s - 1) as typeof step); setError(null); }}
              style={{ flex: 0, padding: "10px 16px", borderRadius: 10, border: "1px solid #E7E5E4", background: "#fff", color: "#888", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Back
            </button>
          )}
          <div style={{ flex: 1 }}>
            {step === 1 && selectedProduct && !loadingVariants && (
              <button onClick={() => setStep(2)}
                style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Next — Add Design
              </button>
            )}
            {step === 2 && (
              <button onClick={handleUploadAndNext} disabled={!hasAnyLayers || uploading}
                style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: !hasAnyLayers || uploading ? "#E5E7EB" : "#0f172a", color: !hasAnyLayers || uploading ? "#9CA3AF" : "#fff", fontSize: 13, fontWeight: 600, cursor: !hasAnyLayers || uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {uploading ? "Rendering & uploading…" : "Next — Set Price"}
              </button>
            )}
            {step === 3 && (
              <button onClick={() => setStep(4)} disabled={!price || price < minPrice}
                style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: !price || price < minPrice ? "#E5E7EB" : "#0f172a", color: !price || price < minPrice ? "#9CA3AF" : "#fff", fontSize: 13, fontWeight: 600, cursor: !price || price < minPrice ? "not-allowed" : "pointer" }}>
                Next — Product Details
              </button>
            )}
            {step === 4 && (
              <button onClick={handleSave} disabled={saving || !productName.trim()}
                style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: saving || !productName.trim() ? "#E5E7EB" : "#0f172a", color: saving || !productName.trim() ? "#9CA3AF" : "#fff", fontSize: 13, fontWeight: 600, cursor: saving || !productName.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {saving ? "Creating Product…" : "Create Product"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
