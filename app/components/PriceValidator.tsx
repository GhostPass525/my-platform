"use client";

import { useEffect, useState, useCallback } from "react";
import { calculateMinimumPrice, calculateProfitBreakdown, type ProfitBreakdown } from "@/lib/pricing";

type Props = {
  /** Printful cost for the product (in dollars). Pass 0 if unknown. */
  printfulCost: number;
  /** Current price value (in dollars). */
  price: number;
  /** Shipping cost to add to the total (in dollars). Default 0. */
  shippingCost?: number;
  /** Called with the current price value whenever it changes. */
  onChange: (price: number) => void;
  /** Whether the surrounding form is being submitted (disables input). */
  disabled?: boolean;
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

/**
 * PriceValidator — a controlled price input with real-time minimum enforcement
 * and profit breakdown. Uses client-side pricing utilities (no API call needed).
 *
 * Usage:
 *   <PriceValidator
 *     printfulCost={12}
 *     price={priceState}
 *     onChange={setPriceState}
 *   />
 *
 * For server-side validation with actual variant costs, call
 * POST /api/products/validate-price instead.
 */
export default function PriceValidator({
  printfulCost,
  price,
  shippingCost = 0,
  onChange,
  disabled = false,
}: Props) {
  const minimum = calculateMinimumPrice(printfulCost);
  const suggested = Math.ceil(printfulCost * 2.5);
  const isValid = price >= minimum;
  const [breakdown, setBreakdown] = useState<ProfitBreakdown | null>(null);

  const recompute = useCallback(() => {
    if (price > 0) {
      setBreakdown(calculateProfitBreakdown(price, printfulCost, shippingCost));
    } else {
      setBreakdown(null);
    }
  }, [price, printfulCost, shippingCost]);

  useEffect(() => { recompute(); }, [recompute]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: `1.5px solid ${isValid || price === 0 ? "#E7E5E4" : "#FECACA"}`,
    fontSize: 14,
    fontWeight: 500,
    color: "#1A1A1A",
    background: isValid || price === 0 ? "#fff" : "#FEF2F2",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Price input */}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#888", pointerEvents: "none" }}>$</span>
        <input
          type="number"
          min={0}
          step={1}
          value={price || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          disabled={disabled}
          placeholder={String(suggested)}
          style={{ ...inputStyle, paddingLeft: 24 }}
        />
      </div>

      {/* Error / minimum hint */}
      {price > 0 && !isValid && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "6px 10px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            Minimum price: <strong>{fmt(minimum)}</strong> — covers production + fees.{" "}
            <button
              type="button"
              onClick={() => onChange(suggested)}
              style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: "#991B1B", cursor: "pointer", textDecoration: "underline" }}
            >
              Use {fmt(suggested)}
            </button>
          </span>
        </div>
      )}

      {/* Profit breakdown */}
      {breakdown && price >= minimum && (
        <div style={{ background: "#FAFAF8", border: "1px solid #E7E5E4", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            { label: "Sale price", value: fmt(breakdown.salePrice), bold: false },
            ...(breakdown.shippingCost > 0 ? [{ label: "Shipping", value: fmt(breakdown.shippingCost), bold: false }] : []),
            { label: "Stripe fee", value: `−${fmt(breakdown.stripeFee)}`, bold: false },
            { label: "Volcity fee (5%)", value: `−${fmt(breakdown.volcityFee)}`, bold: false },
            { label: "Production cost", value: `−${fmt(breakdown.printfulCost)}`, bold: false },
            { label: "Your profit", value: fmt(breakdown.ownerProfit), bold: true },
          ].map(({ label, value, bold }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#888" }}>{label}</span>
              <span style={{ fontWeight: bold ? 600 : 400, color: bold ? (breakdown.ownerProfit >= 0 ? "#16a34a" : "#991B1B") : "#555" }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
