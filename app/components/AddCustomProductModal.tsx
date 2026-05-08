"use client";

import { useState, useRef } from "react";

export type CustomVariant = {
  id: string;
  color?: string;
  color_code?: string;
  size?: string;
  price: number;
  inventory: number;
};

export type CustomProduct = {
  id: string;
  name: string;
  description: string;
  price: string;
  compare_at_price?: string;
  images: string[];
  product_type: "physical";
  fulfillment_type: "manual";
  custom_variants?: CustomVariant[];
  shipping?: {
    is_digital: boolean;
    flat_rate?: number;
    weight?: number;
  };
};

type Props = {
  onProductCreated: (product: CustomProduct) => void;
  onClose: () => void;
  uploadImage: (file: File) => Promise<string>;
};

const uid = () => Math.random().toString(36).slice(2, 10);

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

const BTN: React.CSSProperties = {
  padding: "9px 18px", borderRadius: 8, border: "none", fontWeight: 600,
  fontSize: 13, cursor: "pointer", transition: "opacity 0.15s",
};

export default function AddCustomProductModal({ onProductCreated, onClose, uploadImage }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1 — Images
  const [images, setImages] = useState<{ file: File | null; url: string; uploading: boolean }[]>([]);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Step 2 — Details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");

  // Step 3 — Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [variantType, setVariantType] = useState<"size-color" | "custom">("size-color");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["M", "L", "XL"]);
  const [colors, setColors] = useState<{ name: string; code: string }[]>([{ name: "Black", code: "#000000" }]);
  const [newColorName, setNewColorName] = useState("");
  const [newColorCode, setNewColorCode] = useState("#000000");
  const [customOptions, setCustomOptions] = useState<{ groupName: string; values: string[] }[]>([]);
  const [variantPrice, setVariantPrice] = useState("");
  const [variantInventory, setVariantInventory] = useState("10");

  // Step 4 — Shipping
  const [isDigital, setIsDigital] = useState(false);
  const [flatRate, setFlatRate] = useState("");
  const [weight, setWeight] = useState("");

  // Step 5
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Image handling ─────────────────────────────────────────────────────────

  async function handleImageFiles(files: FileList) {
    const remaining = 5 - images.length;
    if (remaining <= 0) return;
    const toAdd = Array.from(files).slice(0, remaining);
    const placeholders = toAdd.map(file => ({
      file, url: URL.createObjectURL(file), uploading: true,
    }));
    setImages(prev => [...prev, ...placeholders]);

    for (let i = 0; i < toAdd.length; i++) {
      try {
        const url = await uploadImage(toAdd[i]);
        setImages(prev => {
          const updated = [...prev];
          const idx = prev.findIndex(img => img.file === toAdd[i]);
          if (idx !== -1) updated[idx] = { file: null, url, uploading: false };
          return updated;
        });
      } catch {
        setImages(prev => prev.filter(img => img.file !== toAdd[i]));
      }
    }
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  function handleDragStart(e: React.DragEvent, idx: number) {
    e.dataTransfer.setData("text/plain", String(idx));
  }

  function handleDrop(e: React.DragEvent, targetIdx: number) {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (fromIdx === targetIdx) { setDragOverIdx(null); return; }
    setImages(prev => {
      const arr = [...prev];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(targetIdx, 0, item);
      return arr;
    });
    setDragOverIdx(null);
  }

  // ── Variant generation ────────────────────────────────────────────────────

  function buildVariants(): CustomVariant[] {
    if (!hasVariants) return [];
    const basePrice = parseFloat(variantPrice || price) || 0;
    const inv = parseInt(variantInventory) || 0;

    if (variantType === "size-color") {
      const variants: CustomVariant[] = [];
      if (colors.length > 0 && selectedSizes.length > 0) {
        for (const color of colors) {
          for (const size of selectedSizes) {
            variants.push({ id: uid(), color: color.name, color_code: color.code, size, price: basePrice, inventory: inv });
          }
        }
      } else if (colors.length > 0) {
        for (const color of colors) {
          variants.push({ id: uid(), color: color.name, color_code: color.code, price: basePrice, inventory: inv });
        }
      } else if (selectedSizes.length > 0) {
        for (const size of selectedSizes) {
          variants.push({ id: uid(), size, price: basePrice, inventory: inv });
        }
      }
      return variants;
    }

    // custom options — generate combinations
    if (customOptions.length === 0) return [];
    const combine = (groups: { groupName: string; values: string[] }[], idx: number): Record<string, string>[] => {
      if (idx >= groups.length) return [{}];
      return groups[idx].values.flatMap(v =>
        combine(groups, idx + 1).map(rest => ({ [groups[idx].groupName]: v, ...rest }))
      );
    };
    return combine(customOptions, 0).map(combo => ({
      id: uid(),
      color: combo["Color"],
      size: combo["Size"],
      price: basePrice,
      inventory: inv,
    }));
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleCreate() {
    setSaving(true); setError(null);
    try {
      const uploadedImages = images.filter(img => !img.uploading && img.url);
      if (uploadedImages.length === 0) throw new Error("Please add at least one product image.");
      if (!name.trim()) throw new Error("Product name is required.");
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) throw new Error("Please enter a valid price.");

      const product: CustomProduct = {
        id: uid(),
        name: name.trim(),
        description: description.trim(),
        price: `$${parsedPrice.toFixed(2)}`,
        compare_at_price: compareAtPrice ? `$${parseFloat(compareAtPrice).toFixed(2)}` : undefined,
        images: uploadedImages.map(img => img.url),
        product_type: "physical",
        fulfillment_type: "manual",
        custom_variants: hasVariants ? buildVariants() : undefined,
        shipping: {
          is_digital: isDigital,
          flat_rate: flatRate ? parseFloat(flatRate) : undefined,
          weight: weight ? parseFloat(weight) : undefined,
        },
      };

      onProductCreated(product);
    } catch (e: unknown) {
      setError((e as Error).message || "Failed to create product.");
    } finally {
      setSaving(false);
    }
  }

  // ── Step validation ───────────────────────────────────────────────────────

  const canAdvance = (() => {
    if (step === 1) return images.some(img => !img.uploading);
    if (step === 2) return name.trim().length > 0 && parseFloat(price) > 0;
    return true;
  })();

  const totalSteps = 4;
  const progressPct = ((step - 1) / totalSteps) * 100;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520,
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 14px", borderBottom: "1px solid #F0EFED", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>Custom Product</div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#AAA", padding: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: "#F0EFED", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#2563EB", borderRadius: 2, width: `${progressPct}%`, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>
            Step {step} of {totalSteps} — {["Product Images", "Product Details", "Variants", "Shipping"][step - 1]}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── Step 1: Images ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
                Upload 1–5 product photos. The first image is the main display image. Drag to reorder.
              </p>
              {/* Upload area */}
              {images.length < 5 && (
                <div
                  onClick={() => imgInputRef.current?.click()}
                  style={{
                    border: "2px dashed #D1D5DB", borderRadius: 10, padding: "24px 16px",
                    textAlign: "center", cursor: "pointer", color: "#9CA3AF", fontSize: 13,
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#2563EB")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#D1D5DB")}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Click to upload photos ({images.length}/5)
                  <input
                    ref={imgInputRef} type="file" accept="image/*" multiple hidden
                    onChange={e => { if (e.target.files) handleImageFiles(e.target.files); e.target.value = ""; }}
                  />
                </div>
              )}
              {/* Image grid */}
              {images.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      draggable={!img.uploading}
                      onDragStart={e => handleDragStart(e, idx)}
                      onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
                      onDragLeave={() => setDragOverIdx(null)}
                      onDrop={e => handleDrop(e, idx)}
                      style={{
                        position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden",
                        border: dragOverIdx === idx ? "2px solid #2563EB" : idx === 0 ? "2px solid #10B981" : "2px solid transparent",
                        cursor: img.uploading ? "default" : "grab",
                      }}
                    >
                      <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      {img.uploading && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ width: 20, height: 20, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                        </div>
                      )}
                      {idx === 0 && !img.uploading && (
                        <div style={{ position: "absolute", top: 4, left: 4, background: "#10B981", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
                          MAIN
                        </div>
                      )}
                      {!img.uploading && (
                        <button
                          onClick={() => removeImage(idx)}
                          style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── Step 2: Details ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Product Name *">
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Hand-painted Ceramic Mug"
                  style={inputStyle}
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your product…"
                  rows={4} style={{ ...inputStyle, resize: "none" }}
                />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Price *">
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 13 }}>$</span>
                    <input value={price} onChange={e => setPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" style={{ ...inputStyle, paddingLeft: 22 }} />
                  </div>
                </Field>
                <Field label="Compare-at Price">
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 13 }}>$</span>
                    <input value={compareAtPrice} onChange={e => setCompareAtPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" style={{ ...inputStyle, paddingLeft: 22 }} />
                  </div>
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 3: Variants ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox" checked={hasVariants} onChange={e => setHasVariants(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>This product has variants</span>
              </label>

              {hasVariants && (
                <>
                  {/* Variant type selector */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["size-color", "custom"] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setVariantType(type)}
                        style={{
                          padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
                          border: variantType === type ? "1.5px solid #2563EB" : "1.5px solid #E5E7EB",
                          background: variantType === type ? "#EFF6FF" : "#fff",
                          color: variantType === type ? "#2563EB" : "#6B7280",
                        }}
                      >
                        {type === "size-color" ? "Sizes & Colors" : "Custom Options"}
                      </button>
                    ))}
                  </div>

                  {variantType === "size-color" && (
                    <>
                      {/* Sizes */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Sizes</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {COMMON_SIZES.map(s => (
                            <button
                              key={s}
                              onClick={() => setSelectedSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                              style={{
                                padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
                                border: selectedSizes.includes(s) ? "1.5px solid #2563EB" : "1.5px solid #E5E7EB",
                                background: selectedSizes.includes(s) ? "#EFF6FF" : "#fff",
                                color: selectedSizes.includes(s) ? "#2563EB" : "#6B7280",
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Colors */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Colors</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                          {colors.map((c, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 8px" }}>
                              <div style={{ width: 12, height: 12, borderRadius: "50%", background: c.code, border: "1px solid rgba(0,0,0,0.1)" }} />
                              <span style={{ fontSize: 12, color: "#374151" }}>{c.name}</span>
                              <button onClick={() => setColors(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 0, lineHeight: 1 }}>×</button>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="color" value={newColorCode} onChange={e => setNewColorCode(e.target.value)} style={{ width: 32, height: 32, border: "1px solid #E5E7EB", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                          <input value={newColorName} onChange={e => setNewColorName(e.target.value)} placeholder="Color name" style={{ ...inputStyle, flex: 1 }} />
                          <button
                            onClick={() => { if (newColorName.trim()) { setColors(prev => [...prev, { name: newColorName.trim(), code: newColorCode }]); setNewColorName(""); } }}
                            style={{ ...BTN, padding: "7px 14px", background: "#F3F4F6", color: "#374151" }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {variantType === "custom" && (
                    <div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>Add option groups (e.g. "Material: Cotton, Polyester")</div>
                      {customOptions.map((grp, gi) => (
                        <div key={gi} style={{ marginBottom: 10, padding: 10, background: "#F9FAFB", borderRadius: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{grp.groupName}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {grp.values.map((v, vi) => (
                              <span key={vi} style={{ fontSize: 11, padding: "2px 8px", background: "#E5E7EB", borderRadius: 4, color: "#374151" }}>{v}</span>
                            ))}
                          </div>
                          <button onClick={() => setCustomOptions(prev => prev.filter((_, j) => j !== gi))} style={{ fontSize: 11, color: "#EF4444", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>Remove group</button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const name = prompt("Option group name (e.g. Material):");
                          if (!name) return;
                          const vals = prompt("Values, comma-separated (e.g. Cotton, Polyester):");
                          if (!vals) return;
                          setCustomOptions(prev => [...prev, { groupName: name, values: vals.split(",").map(v => v.trim()).filter(Boolean) }]);
                        }}
                        style={{ ...BTN, background: "#F3F4F6", color: "#374151", fontSize: 12 }}
                      >
                        + Add Option Group
                      </button>
                    </div>
                  )}

                  {/* Variant defaults */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Variant Price (optional)">
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 13 }}>$</span>
                        <input value={variantPrice} onChange={e => setVariantPrice(e.target.value)} type="number" placeholder={price || "0.00"} style={{ ...inputStyle, paddingLeft: 22 }} />
                      </div>
                    </Field>
                    <Field label="Inventory per variant">
                      <input value={variantInventory} onChange={e => setVariantInventory(e.target.value)} type="number" min="0" placeholder="10" style={inputStyle} />
                    </Field>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 4: Shipping ── */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={isDigital} onChange={e => setIsDigital(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Digital product (no shipping)</div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>Customer receives a download or email delivery</div>
                </div>
              </label>

              {!isDigital && (
                <>
                  <Field label="Product Weight (oz)">
                    <input value={weight} onChange={e => setWeight(e.target.value)} type="number" min="0" step="0.1" placeholder="e.g. 8" style={inputStyle} />
                  </Field>
                  <Field label="Flat Rate Shipping ($)">
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 13 }}>$</span>
                      <input value={flatRate} onChange={e => setFlatRate(e.target.value)} type="number" min="0" step="0.01" placeholder="e.g. 4.99" style={{ ...inputStyle, paddingLeft: 22 }} />
                    </div>
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>Leave blank to calculate at checkout or handle manually.</p>
                  </Field>
                </>
              )}

              {/* Summary */}
              <div style={{ background: "#F9FAFB", borderRadius: 10, padding: 14, border: "1px solid #E5E7EB" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Product Summary</div>
                <div style={{ fontSize: 12, color: "#6B7280", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div><strong>Name:</strong> {name || "—"}</div>
                  <div><strong>Price:</strong> {price ? `$${parseFloat(price).toFixed(2)}` : "—"}</div>
                  <div><strong>Images:</strong> {images.filter(i => !i.uploading).length} uploaded</div>
                  <div><strong>Variants:</strong> {hasVariants ? `${buildVariants().length} variants` : "None"}</div>
                  <div><strong>Fulfillment:</strong> Manual (you ship it)</div>
                </div>
              </div>

              {error && <div style={{ fontSize: 13, color: "#DC2626", background: "#FEF2F2", padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #F0EFED", flexShrink: 0, display: "flex", justifyContent: "space-between", gap: 10 }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => (s - 1) as typeof step)} style={{ ...BTN, background: "#F3F4F6", color: "#374151" }}>
              Back
            </button>
          ) : (
            <button onClick={onClose} style={{ ...BTN, background: "#F3F4F6", color: "#374151" }}>Cancel</button>
          )}
          {step < 4 ? (
            <button
              onClick={() => setStep(s => (s + 1) as typeof step)}
              disabled={!canAdvance}
              style={{ ...BTN, background: canAdvance ? "#2563EB" : "#93C5FD", color: "#fff", opacity: canAdvance ? 1 : 0.7 }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={saving}
              style={{ ...BTN, background: "#10B981", color: "#fff", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Creating…" : "Create Product"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E7EB",
  fontSize: 13, color: "#1A1A1A", background: "#fff", outline: "none",
  boxSizing: "border-box",
};
