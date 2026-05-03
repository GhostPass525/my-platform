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
  /** First mockup URL (or uploaded design URL as fallback) — used as card image. */
  imageDataUrl?: string;
  /** Original uploaded design URL — required for Printful order fulfillment. */
  design_url?: string;
  /** All generated mockup URLs (front, back, etc.) — used as product image gallery. */
  mockup_urls?: string[];
  product_type: "physical";
  printful_sync_product_id: number;
  printful_catalog_product_id: number;
  printful_variant_ids: number[];
  printful_variants: Array<{ id: number; size: string; color: string; color_code?: string }>;
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
  hats:        "PNG with transparent background · embroidery or DTF print · varies by model",
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

// ── Placement zones & preview helpers ─────────────────────────────────────────

/** Printful print-area coordinate zones (1800×2400 canvas) per preset. */
const PLACEMENT_ZONES = {
  'center':     { zoneTop: 450,  zoneLeft: 0,   zoneW: 1800, zoneH: 1800 },
  'top-center': { zoneTop: 150,  zoneLeft: 0,   zoneW: 1800, zoneH: 1200 },
  'left-chest': { zoneTop: 250,  zoneLeft: 100, zoneW: 500,  zoneH: 500  },
} as const;

/** Compute Printful position object from placement preset, scale, and image aspect ratio. */
function computePrintfulPosition(
  placement: 'center' | 'top-center' | 'left-chest',
  scale: number,
  naturalW: number,
  naturalH: number,
): { area_width: number; area_height: number; width: number; height: number; top: number; left: number } {
  const AREA_W = 1800, AREA_H = 2400;
  const ratio = naturalH > 0 && naturalW > 0 ? naturalH / naturalW : 1;
  const zone = PLACEMENT_ZONES[placement];

  const designW = Math.round(zone.zoneW * (scale / 100));
  const designH = Math.round(designW * ratio);

  let top: number, left: number;
  if (placement === 'center') {
    top  = zone.zoneTop + Math.round((zone.zoneH - designH) / 2);
    left = zone.zoneLeft + Math.round((zone.zoneW - designW) / 2);
  } else if (placement === 'top-center') {
    top  = zone.zoneTop;
    left = zone.zoneLeft + Math.round((zone.zoneW - designW) / 2);
  } else {
    top  = zone.zoneTop;
    left = zone.zoneLeft;
  }

  return {
    area_width:  AREA_W,
    area_height: AREA_H,
    width:  designW,
    height: designH,
    top:  Math.max(0, Math.min(top,  AREA_H - designH)),
    left: Math.max(0, Math.min(left, AREA_W - designW)),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  userId: string | null;
  projectId?: string | null;
  onProductCreated: (product: NewProduct) => void;
  onClose: () => void;
  /** Upload a file to Supabase Storage, return the public URL. */
  uploadDesign: (file: File) => Promise<string>;
};

const STEP_LABELS = ["Product Type", "Design", "Price", "Details", "Create"];

export default function AddProductModal({ userId: _userId, projectId, onProductCreated, onClose, uploadDesign }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [variants, setVariants] = useState<CatalogVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Step 2
  const fileRef = useRef<HTMLInputElement>(null);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [designPreview, setDesignPreview] = useState<string | null>(null);
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Step 2 — mockup preview
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [previewMockupUrls, setPreviewMockupUrls] = useState<string[]>([]);
  const [previewUploadedUrl, setPreviewUploadedUrl] = useState<string | null>(null);

  // Step 3
  const [price, setPrice] = useState(0);

  // Step 4
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 — placement controls
  const [designPlacement, setDesignPlacement] = useState<'center' | 'top-center' | 'left-chest'>('center');
  const [designScale, setDesignScale] = useState(65);
  const [designNaturalSize, setDesignNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // Mockup generation (runs in background during step 3)
  const [mockupUrls, setMockupUrls] = useState<string[]>([]);
  const [mockupState, setMockupState] = useState<"idle" | "generating" | "done" | "error">("idle");

  // Step 5
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load catalog on mount
  useEffect(() => {
    fetch("/api/printful/products")
      .then((r) => r.json())
      .then((d) => setCatalogProducts(Array.isArray(d.result) ? d.result : []))
      .catch(() => setCatalogProducts([]))
      .finally(() => setLoadingCatalog(false));
  }, []);

  // Load variants when product selected
  const loadVariants = useCallback(async (product: CatalogProduct) => {
    setLoadingVariants(true);
    try {
      const res = await fetch(`/api/printful/catalog/${product.id}`);
      if (res.ok) {
        const d = await res.json();
        setVariants(Array.isArray(d.variants) ? d.variants : []);
      }
    } catch {
      setVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  }, []);

  // Derived: filtered products
  const filteredProducts = selectedCategory
    ? catalogProducts.filter((p) => {
        const cat = CATEGORIES.find((c) => c.id === selectedCategory);
        if (!cat) return false;
        // Use type_name (e.g. "T-Shirt") or title for matching — not the internal `type` code (e.g. "DTFILM")
        const searchTarget = ((p.type_name || "") + " " + (p.title || "")).toUpperCase();
        return (cat.keywords as readonly string[]).some((kw) => searchTarget.includes(kw));
      })
    : [];

  // Derived: max Printful cost from loaded variants
  const maxVariantCost = variants.length > 0
    ? Math.max(...variants.map((v) => parseFloat(v.price) || 0))
    : 0;
  const minPrice = calculateMinimumPrice(maxVariantCost);
  const suggestedPrice = Math.ceil(maxVariantCost * 2.5);

  // Auto-set name/price when product + variants are ready; reset mockups on product change
  useEffect(() => {
    if (selectedProduct && variants.length > 0) {
      const cat = selectedCategory;
      if (cat) {
        const gen = NAME_SUGGESTIONS[cat as CategoryId];
        setProductName(gen ? gen(selectedProduct.brand) : selectedProduct.title);
      }
      setPrice(suggestedPrice || minPrice);
    }
    // Reset mockups whenever the selected product changes
    setMockupUrls([]);
    setMockupState("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, variants]);

  // Handle file selection
  function handleFileChange(file: File) {
    if (!file) return;
    setDesignFile(file);
    setDesignUrl(null);
    setDesignNaturalSize(null);
    setPreviewState("idle");
    setPreviewMockupUrls([]);
    setPreviewUploadedUrl(null);
    const url = URL.createObjectURL(file);
    setDesignPreview(url);
    const img = new Image();
    img.onload = () => setDesignNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }

  // Generate and display a real Printful mockup preview (button-triggered)
  async function handlePreviewMockup() {
    if (!designFile || !selectedProduct || variants.length === 0) return;
    setPreviewState("loading");
    try {
      const uploadUrl = previewUploadedUrl || await uploadDesign(designFile);
      if (!previewUploadedUrl) setPreviewUploadedUrl(uploadUrl);
      const inStockIds = variants.filter(v => v.in_stock).slice(0, 3).map(v => v.id);
      const nat = designNaturalSize ?? { w: 1, h: 1 };
      const position = computePrintfulPosition(designPlacement, designScale, nat.w, nat.h);
      const res = await fetch("/api/printful/generate-mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct.id, variantIds: inStockIds, designImageUrl: uploadUrl, position }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.mockupUrls) || data.mockupUrls.length === 0) {
        throw new Error(data.error || "No mockups returned");
      }
      setPreviewMockupUrls(data.mockupUrls);
      setPreviewState("done");
    } catch {
      setPreviewState("error");
    }
  }

  // Generate mockups in background — doesn't block navigation
  async function generateMockups(
    imageUrl: string,
    productId: number,
    varIds: number[],
    position: { area_width: number; area_height: number; width: number; height: number; top: number; left: number },
  ) {
    setMockupState("generating");
    try {
      const res = await fetch("/api/printful/generate-mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantIds: varIds, designImageUrl: imageUrl, position }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.mockupUrls) || data.mockupUrls.length === 0) {
        throw new Error(data.error || "No mockups returned");
      }
      setMockupUrls(data.mockupUrls);
      setMockupState("done");
    } catch {
      setMockupState("error");
    }
  }

  // Upload design and advance; reuse preview upload/mockups if already generated
  async function handleUploadAndNext() {
    if (!designFile) return;
    setUploading(true);
    setError(null);
    try {
      const url = previewUploadedUrl || await uploadDesign(designFile);
      setDesignUrl(url);
      setStep(3);
      if (previewMockupUrls.length > 0) {
        // Reuse the mockups the user already previewed
        setMockupUrls(previewMockupUrls);
        setMockupState("done");
      } else if (selectedProduct && variants.length > 0) {
        const inStockIds = variants.filter(v => v.in_stock).slice(0, 3).map(v => v.id);
        const nat = designNaturalSize ?? { w: 1, h: 1 };
        const position = computePrintfulPosition(designPlacement, designScale, nat.w, nat.h);
        generateMockups(url, selectedProduct.id, inStockIds, position);
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // Final save
  async function handleSave() {
    if (!selectedProduct || !designUrl || price < minPrice || !productName.trim()) return;
    setSaving(true);
    setError(null);

    // Build variant inputs — use all in-stock variants with the set retail price
    const retailPrice = price.toFixed(2);
    const variantInputs = variants
      .filter((v) => v.in_stock)
      .map((v) => ({ variantId: v.id, retailPrice }));

    try {
      const inStockVariantsForBody = variants.filter((v) => v.in_stock);
      const res = await fetch("/api/printful/create-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          description: description.trim(),
          designUrl,
          variantInputs,
          projectId: projectId ?? undefined,
          printfulCatalogProductId: selectedProduct?.id ?? undefined,
          printfulVariants: inStockVariantsForBody.map((v) => ({
            id: v.id,
            size: v.size,
            color: v.color,
            color_code: v.color_code,
          })),
          mockupUrls: mockupUrls.length > 0 ? mockupUrls : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");

      // Prefer generated mockup; fall back to Printful thumbnail, then raw design
      const primaryImage = mockupUrls[0] || data.thumbnailUrl || designUrl || undefined;

      onProductCreated({
        id: data.productId || uid(),
        name: productName.trim(),
        description: description.trim(),
        price: `$${price}`,
        imageDataUrl: primaryImage,
        design_url: designUrl || undefined,
        mockup_urls: mockupUrls.length > 0 ? mockupUrls : undefined,
        product_type: "physical",
        printful_sync_product_id: data.syncProductId,
        printful_catalog_product_id: selectedProduct.id,
        printful_variant_ids: inStockVariantsForBody.map((v) => v.id),
        printful_variants: inStockVariantsForBody.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          color_code: v.color_code,
        })),
      });
      setSuccess(true);
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to create product. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const breakdown = price > 0 && price >= minPrice
    ? calculateProfitBreakdown(price, maxVariantCost, 0)
    : null;

  // Colors grouped from variants (deduped)
  const colorGroups = variants.reduce<{ color: string; code?: string; count: number }[]>((acc, v) => {
    if (!acc.find((c) => c.color === v.color)) {
      acc.push({ color: v.color, code: v.color_code, count: variants.filter((x) => x.color === v.color).length });
    }
    return acc;
  }, []).slice(0, 8);

  const sizes = [...new Set(variants.map((v) => v.size))].slice(0, 10);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
          {/* Step indicator */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "#16a34a" : active ? "#0f172a" : "#EEEDE9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {done
                        ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                        : <span style={{ fontSize: 10, fontWeight: 600, color: active ? "#fff" : "#AAA" }}>{n}</span>
                      }
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
              <button
                onClick={onClose}
                style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          )}

          {/* ── STEP 1: Product Type ── */}
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
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          style={{ padding: "14px 8px", borderRadius: 10, border: "1.5px solid #E7E5E4", background: "#FAFAF8", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "border-color 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0f172a"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E7E5E4"; }}
                        >
                          <span style={{ fontSize: 22 }}>
                            {cat.id === "tshirts" ? "👕" : cat.id === "hoodies" ? "🧥" : cat.id === "sweatshirts" ? "🧶" : cat.id === "tanks" ? "🎽" : cat.id === "longsleeves" ? "👔" : cat.id === "allover" ? "🎨" : cat.id === "hats" ? "🧢" : cat.id === "mugs" ? "☕" : cat.id === "posters" ? "🖼️" : cat.id === "phonecases" ? "📱" : cat.id === "totebags" ? "👜" : "🏷️"}
                          </span>
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6" /></svg>
                      Back
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{CATEGORIES.find((c) => c.id === selectedCategory)?.label}</span>
                  </div>
                  {filteredProducts.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#AAA", textAlign: "center", padding: "24px 0" }}>No products found in this category.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {filteredProducts.slice(0, 20).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedProduct(p); loadVariants(p); }}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #E7E5E4", background: "#FAFAF8", cursor: "pointer", textAlign: "left", transition: "border-color 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0f172a"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E7E5E4"; }}
                        >
                          {p.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.thumbnail_url} alt={p.title} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 44, height: 44, background: "#EEEDE9", borderRadius: 6, flexShrink: 0 }} />
                          )}
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6" /></svg>
                      Back
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
                            {colorGroups.map((c) => (
                              <div key={c.color} title={c.color} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 6, background: "#F5F4F2", fontSize: 11, color: "#555" }}>
                                <div style={{ width: 12, height: 12, borderRadius: "50%", background: c.code || "#ccc", border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
                                {c.color}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {sizes.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 8 }}>Available Sizes</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {sizes.map((s) => (
                              <span key={s} style={{ padding: "3px 8px", borderRadius: 5, background: "#F5F4F2", fontSize: 12, color: "#555", fontWeight: 500 }}>{s}</span>
                            ))}
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

          {/* ── STEP 2: Upload Design ── */}
          {!success && step === 2 && (
            <div>
              {selectedCategory && (
                <div style={{ marginBottom: 14, fontSize: 12, color: "#888", background: "#FAFAF8", border: "1px solid #EEEDE9", borderRadius: 8, padding: "8px 12px" }}>
                  <strong style={{ color: "#555" }}>Design requirements:</strong> {DESIGN_REQS[selectedCategory]}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
              />
              {!designFile ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileChange(f); }}
                  style={{ border: "2px dashed #E7E5E4", borderRadius: 12, padding: "48px 24px", textAlign: "center", cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#0f172a"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E7E5E4"; }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A", marginBottom: 4 }}>Upload your design</div>
                  <div style={{ fontSize: 12, color: "#AAA" }}>PNG, JPG or WebP · max 25 MB · drag & drop or click</div>
                </div>
              ) : (
                <div>
                  {/* Design / mockup preview area */}
                  {previewState === "idle" && (
                    <div style={{ borderRadius: 12, border: "1px solid #E7E5E4", background: "#F8F7F5", marginBottom: 12, padding: 16, textAlign: "center" }}>
                      {designPreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={designPreview} alt="Design" style={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain", borderRadius: 8 }} />
                      )}
                    </div>
                  )}
                  {previewState === "loading" && (
                    <div style={{ borderRadius: 12, border: "1px solid #E7E5E4", background: "#F8F7F5", marginBottom: 12, padding: "32px 16px", textAlign: "center" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#BBB" strokeWidth="2" strokeLinecap="round" style={{ margin: "0 auto 10px", display: "block" }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      <div style={{ fontSize: 13, color: "#888" }}>Generating mockup… this takes ~30 seconds</div>
                    </div>
                  )}
                  {previewState === "done" && previewMockupUrls.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewMockupUrls[0]} alt="Product mockup" style={{ width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 12, border: "1px solid #E7E5E4", display: "block" }} />
                      {previewMockupUrls.length > 1 && (
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          {previewMockupUrls.slice(0, 4).map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={url} alt={`Angle ${i + 1}`} style={{ width: 58, height: 58, objectFit: "cover", borderRadius: 8, border: "1.5px solid #E7E5E4" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {previewState === "error" && (
                    <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", fontSize: 12, color: "#92400E" }}>
                      Preview generation failed. You can still set placement and proceed.
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 16 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{designFile.name}</span>
                    <button onClick={() => { setDesignFile(null); setDesignPreview(null); }} style={{ background: "none", border: "none", color: "#AAA", cursor: "pointer", fontSize: 12, padding: "0 0 0 8px", flexShrink: 0 }}>
                      Change
                    </button>
                  </div>

                  {/* Placement presets */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 8 }}>Placement</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {([ { id: "center", label: "Center" }, { id: "top-center", label: "Top Center" }, { id: "left-chest", label: "Left Chest" } ] as const).map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => setDesignPlacement(preset.id)}
                          style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${designPlacement === preset.id ? "#0f172a" : "#E7E5E4"}`, background: designPlacement === preset.id ? "#0f172a" : "#FAFAF8", color: designPlacement === preset.id ? "#fff" : "#1A1A1A", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scale slider */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 6 }}>
                      Design Size — <span style={{ textTransform: "none", letterSpacing: 0, color: "#1A1A1A" }}>{designScale}%</span>
                    </div>
                    <input
                      type="range"
                      min={40} max={90} step={5}
                      value={designScale}
                      onChange={(e) => setDesignScale(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#0f172a" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#AAA", marginTop: 2 }}>
                      <span>Small</span><span>Large</span>
                    </div>
                  </div>

                  {/* Preview Mockup button */}
                  <button
                    onClick={handlePreviewMockup}
                    disabled={previewState === "loading" || !selectedProduct || variants.length === 0}
                    style={{
                      width: "100%", padding: "10px 0", borderRadius: 10, border: "1.5px solid #0f172a",
                      background: previewState === "loading" ? "#F5F4F2" : "#fff",
                      color: previewState === "loading" ? "#AAA" : "#0f172a",
                      fontSize: 13, fontWeight: 600, cursor: previewState === "loading" ? "not-allowed" : "pointer",
                    }}
                  >
                    {previewState === "loading" ? "Generating…" : previewState === "done" ? "Regenerate Preview" : "Preview Mockup"}
                  </button>
                </div>
              )}
              {error && <div style={{ marginTop: 12, fontSize: 12, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px" }}>{error}</div>}
            </div>
          )}

          {/* ── STEP 3: Set Price ── */}
          {!success && step === 3 && (
            <div>
              {/* Mockup preview — shows while user sets price */}
              {mockupState === "generating" && (
                <div style={{ marginBottom: 16, padding: "16px 0", borderRadius: 12, background: "#F5F4F2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 120 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BBB" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  <div style={{ fontSize: 12, color: "#AAA" }}>Generating product mockup…</div>
                </div>
              )}
              {mockupState === "done" && mockupUrls.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 8 }}>
                    Product Preview
                  </div>
                  {/* Primary mockup — large */}
                  <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E7E5E4", background: "#F8F7F5", textAlign: "center", padding: "12px 12px 6px", marginBottom: mockupUrls.length > 1 ? 8 : 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mockupUrls[0]} alt="Product mockup" style={{ maxHeight: 200, maxWidth: "100%", objectFit: "contain", borderRadius: 8 }} />
                  </div>
                  {/* Additional angles — thumbnails */}
                  {mockupUrls.length > 1 && (
                    <div style={{ display: "flex", gap: 6 }}>
                      {mockupUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={url} alt={`Mockup ${i + 1}`}
                          style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, border: "1.5px solid #E7E5E4", cursor: "pointer", flexShrink: 0 }} />
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
                <div style={{ fontSize: 14, color: "#555" }}>
                  Up to <strong style={{ color: "#1A1A1A" }}>{fmt(maxVariantCost)}</strong> per item (varies by size/color)
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 6 }}>Your Sale Price</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {[minPrice, suggestedPrice, Math.ceil(suggestedPrice * 1.3)].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPrice(p)}
                      style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${price === p ? "#0f172a" : "#E7E5E4"}`, background: price === p ? "#0f172a" : "#FAFAF8", color: price === p ? "#fff" : "#1A1A1A", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                    >
                      <div>{fmt(p)}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{p === minPrice ? "Minimum" : p === suggestedPrice ? "Suggested" : "Premium"}</div>
                    </button>
                  ))}
                </div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#888", pointerEvents: "none" }}>$</span>
                  <input
                    type="number"
                    min={minPrice}
                    step={1}
                    value={price || ""}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    placeholder={String(suggestedPrice)}
                    style={{ width: "100%", padding: "9px 12px 9px 24px", borderRadius: 8, border: `1.5px solid ${price > 0 && price < minPrice ? "#FECACA" : "#E7E5E4"}`, fontSize: 14, fontWeight: 500, color: "#1A1A1A", background: price > 0 && price < minPrice ? "#FEF2F2" : "#fff", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                {price > 0 && price < minPrice && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#991B1B" }}>
                    Minimum price is {fmt(minPrice)} — covers production + fees.
                  </div>
                )}
              </div>
              {breakdown && (
                <div style={{ background: "#FAFAF8", border: "1px solid #E7E5E4", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                  {[
                    { label: "Sale price", value: fmt(breakdown.salePrice) },
                    { label: "Stripe fee", value: `−${fmt(breakdown.stripeFee)}` },
                    { label: "Volcity fee (5%)", value: `−${fmt(breakdown.volcityFee)}` },
                    { label: "Production cost", value: `−${fmt(breakdown.printfulCost)}` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#888" }}>{label}</span>
                      <span style={{ color: "#555" }}>{value}</span>
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
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Classic Unisex T-Shirt"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E7E5E4", fontSize: 14, color: "#1A1A1A", background: "#fff", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", display: "block", marginBottom: 6 }}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the product for your customers…"
                  rows={3}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E7E5E4", fontSize: 13, color: "#1A1A1A", background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 8 }}>Variants ({variants.filter(v => v.in_stock).length} available)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {colorGroups.slice(0, 6).map((c) => (
                    <div key={c.color} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 5, background: "#F5F4F2", fontSize: 11, color: "#555" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.code || "#ccc", border: "1px solid rgba(0,0,0,0.1)" }} />
                      {c.color} · {c.count} sizes
                    </div>
                  ))}
                  {colorGroups.length > 6 && <span style={{ fontSize: 11, color: "#AAA", alignSelf: "center" }}>+{colorGroups.length - 6} more</span>}
                </div>
              </div>
              {error && (
                <div style={{ fontSize: 12, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px" }}>{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px 20px", borderTop: "1px solid #F0EFED", flexShrink: 0, display: success ? "none" : "flex", gap: 10 }}>
          {step > 1 && (
            <button
              onClick={() => { setStep((s) => (s - 1) as typeof step); setError(null); }}
              style={{ flex: 0, padding: "10px 16px", borderRadius: 10, border: "1px solid #E7E5E4", background: "#fff", color: "#888", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              Back
            </button>
          )}
          <div style={{ flex: 1 }}>
            {step === 1 && selectedProduct && !loadingVariants && (
              <button
                onClick={() => setStep(2)}
                style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Next — Upload Design
              </button>
            )}
            {step === 2 && (
              <button
                onClick={handleUploadAndNext}
                disabled={!designFile || uploading}
                style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: !designFile || uploading ? "#E5E7EB" : "#0f172a", color: !designFile || uploading ? "#9CA3AF" : "#fff", fontSize: 13, fontWeight: 600, cursor: !designFile || uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                {uploading ? "Uploading…" : "Next — Set Price"}
              </button>
            )}
            {step === 3 && (
              <button
                onClick={() => setStep(4)}
                disabled={!price || price < minPrice}
                style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: !price || price < minPrice ? "#E5E7EB" : "#0f172a", color: !price || price < minPrice ? "#9CA3AF" : "#fff", fontSize: 13, fontWeight: 600, cursor: !price || price < minPrice ? "not-allowed" : "pointer" }}
              >
                Next — Product Details
              </button>
            )}
            {step === 4 && (
              <button
                onClick={handleSave}
                disabled={saving || !productName.trim()}
                style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: saving || !productName.trim() ? "#E5E7EB" : "#0f172a", color: saving || !productName.trim() ? "#9CA3AF" : "#fff", fontSize: 13, fontWeight: 600, cursor: saving || !productName.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                {saving ? "Creating Product…" : "Create Product"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
