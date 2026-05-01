"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Order } from "./page";

type Stats = {
  totalRevenue: number;
  totalOrders: number;
  unfulfilledCount: number;
  inProgressCount: number;
};

function fmt(n: number) {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function orderAmount(o: Order): number {
  return Number(o.amount ?? o.total ?? 0);
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  unfulfilled:  { label: "Unfulfilled",  color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  in_progress:  { label: "In Progress",  color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  fulfilled:    { label: "Fulfilled",    color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  cancelled:    { label: "Cancelled",    color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" },
};

const PRODUCT_TYPE_ICON: Record<string, string> = {
  physical: "📦",
  digital: "💾",
  service: "🔧",
  consultation: "💬",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unfulfilled;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: highlight ? "#FFFBEB" : "#fff",
        borderColor: highlight ? "#FDE68A" : "#E2E8F0",
      }}
    >
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</div>
      <div className="text-2xl font-semibold text-slate-900 tracking-tight">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Order Card ─────────────────────────────────────────────────── */

function OrderCard({
  order,
  onStatusChange,
  onViewDetails,
  onToast,
}: {
  order: Order;
  onStatusChange: (id: string, status: string) => void;
  onViewDetails: (order: Order) => void;
  onToast: (msg: string) => void;
}) {
  const productType = order.product_type || "physical";
  const icon = PRODUCT_TYPE_ICON[productType] ?? "📦";
  const amount = orderAmount(order);

  function copyToClipboard(text: string, msg: string) {
    navigator.clipboard.writeText(text).then(() => onToast(msg)).catch(() => onToast("Failed to copy"));
  }

  const formattedAddress = order.shipping_address
    ? [
        order.shipping_address.line1,
        order.shipping_address.line2,
        `${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.zip}`,
        order.shipping_address.country,
      ].filter(Boolean).join("\n")
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 flex items-center gap-4 border-b border-slate-100">
        <div className="text-lg flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-slate-400">#{shortId(order.id)}</span>
            <StatusBadge status={order.fulfillment_status} />
          </div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
            {order.product_name || "Order"}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-base font-bold text-slate-900">{fmt(amount)}</div>
          <div className="text-xs text-slate-400 mt-0.5">{fmtDate(order.created_at)}</div>
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 py-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <span className="font-medium w-20 flex-shrink-0 text-xs text-slate-400 uppercase tracking-wide">Customer</span>
          <span>{order.customer_name || order.customer_email || "—"}</span>
        </div>

        {order.customer_email && (
          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-medium w-20 flex-shrink-0 text-xs text-slate-400 uppercase tracking-wide">Email</span>
            <span className="truncate">{order.customer_email}</span>
          </div>
        )}

        {order.customer_phone && (
          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-medium w-20 flex-shrink-0 text-xs text-slate-400 uppercase tracking-wide">Phone</span>
            <span>{order.customer_phone}</span>
          </div>
        )}

        {order.preferred_datetime && (
          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-medium w-20 flex-shrink-0 text-xs text-slate-400 uppercase tracking-wide">Preferred</span>
            <span>{order.preferred_datetime}</span>
          </div>
        )}

        {order.customer_notes && (
          <div className="flex items-start gap-2 text-slate-700">
            <span className="font-medium w-20 flex-shrink-0 text-xs text-slate-400 uppercase tracking-wide mt-0.5">Notes</span>
            <span className="italic text-slate-600 text-xs leading-relaxed">&ldquo;{order.customer_notes}&rdquo;</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
        {formattedAddress && (
          <ActionBtn onClick={() => copyToClipboard(formattedAddress, "Address copied!")}>
            Copy Address
          </ActionBtn>
        )}
        {order.customer_email && (
          <ActionBtn onClick={() => copyToClipboard(order.customer_email!, "Email copied!")}>
            Copy Email
          </ActionBtn>
        )}
        {order.customer_email && (
          <ActionBtn
            onClick={() => {
              const subject = encodeURIComponent(`Re: Your order #${shortId(order.id)} — ${order.product_name || "Order"}`);
              window.open(`mailto:${order.customer_email}?subject=${subject}`, "_blank");
            }}
          >
            Contact Customer
          </ActionBtn>
        )}

        {order.fulfillment_status === "unfulfilled" && (
          <ActionBtn accent onClick={() => onStatusChange(order.id, "in_progress")}>
            Mark In Progress
          </ActionBtn>
        )}
        {(order.fulfillment_status === "unfulfilled" || order.fulfillment_status === "in_progress") && (
          <ActionBtn accent onClick={() => onStatusChange(order.id, "fulfilled")}>
            Mark Fulfilled
          </ActionBtn>
        )}

        <ActionBtn onClick={() => onViewDetails(order)}>
          View Details
        </ActionBtn>
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 hover:opacity-80"
      style={
        accent
          ? { background: "#1E293B", color: "#fff", border: "1px solid #1E293B" }
          : { background: "#fff", color: "#475569", borderColor: "#E2E8F0" }
      }
    >
      {children}
    </button>
  );
}

/* ─── Order Detail Drawer ─────────────────────────────────────────── */

function OrderDrawer({
  order,
  onClose,
  onStatusChange,
  onNotesUpdate,
  onToast,
}: {
  order: Order;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onNotesUpdate: (id: string, notes: string) => void;
  onToast: (msg: string) => void;
}) {
  const [notes, setNotes] = useState(order.fulfillment_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const supabase = createClient();

  const amount = orderAmount(order);

  async function saveNotes() {
    setSavingNotes(true);
    const { error } = await supabase
      .from("orders")
      .update({ fulfillment_notes: notes })
      .eq("id", order.id);
    setSavingNotes(false);
    if (!error) {
      onNotesUpdate(order.id, notes);
      onToast("Notes saved");
    }
  }

  function copyToClipboard(text: string, msg: string) {
    navigator.clipboard.writeText(text).then(() => onToast(msg)).catch(() => onToast("Failed to copy"));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="ml-auto h-full w-full max-w-md bg-white border-l border-slate-200 flex flex-col shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <div className="font-semibold text-slate-900">Order #{shortId(order.id)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Placed {fmtDate(order.created_at)}</div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-6">
          {/* Customer */}
          <Section title="Customer">
            <DetailRow label="Name" value={order.customer_name || "—"} />
            <DetailRow
              label="Email"
              value={order.customer_email || "—"}
              action={order.customer_email ? { label: "Copy", onClick: () => copyToClipboard(order.customer_email!, "Email copied!") } : undefined}
            />
            {order.customer_phone && <DetailRow label="Phone" value={order.customer_phone} />}
          </Section>

          {/* Order */}
          <Section title="Order">
            <DetailRow label="Product" value={order.product_name || "—"} />
            <DetailRow label="Type" value={order.product_type ? order.product_type.charAt(0).toUpperCase() + order.product_type.slice(1) : "—"} />
            {order.product_variants && (
              <DetailRow
                label="Variants"
                value={Object.entries(order.product_variants).map(([k, v]) => `${k}: ${v}`).join("  ·  ")}
              />
            )}
            <DetailRow label="Amount" value={`${fmt(amount)} ${(order.currency || "usd").toUpperCase()}`} />
          </Section>

          {/* Shipping */}
          {order.shipping_address && (
            <Section title="Shipping Address">
              <div className="text-sm text-slate-700 leading-relaxed space-y-0.5">
                <div>{order.shipping_address.line1}</div>
                {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
                <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}</div>
                <div>{order.shipping_address.country}</div>
              </div>
              <button
                onClick={() => {
                  const addr = [
                    order.shipping_address!.line1,
                    order.shipping_address!.line2,
                    `${order.shipping_address!.city}, ${order.shipping_address!.state} ${order.shipping_address!.zip}`,
                    order.shipping_address!.country,
                  ].filter(Boolean).join("\n");
                  copyToClipboard(addr, "Address copied!");
                }}
                className="mt-2 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Copy Address
              </button>
            </Section>
          )}

          {/* Preferred date/time */}
          {order.preferred_datetime && (
            <Section title="Preferred Date / Time">
              <div className="text-sm text-slate-700">{order.preferred_datetime}</div>
            </Section>
          )}

          {/* Customer notes */}
          {order.customer_notes && (
            <Section title="Customer Notes">
              <div className="text-sm text-slate-700 italic leading-relaxed">&ldquo;{order.customer_notes}&rdquo;</div>
            </Section>
          )}

          {/* Fulfillment status */}
          <Section title="Fulfillment Status">
            <select
              value={order.fulfillment_status}
              onChange={(e) => onStatusChange(order.id, e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
            >
              <option value="unfulfilled">Unfulfilled</option>
              <option value="in_progress">In Progress</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Section>

          {/* Internal notes */}
          <Section title="Internal Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add private notes about this order…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="mt-2 px-4 py-2 rounded-lg text-xs font-medium bg-slate-900 text-white hover:opacity-80 disabled:opacity-50 transition"
            >
              {savingNotes ? "Saving…" : "Save Notes"}
            </button>
          </Section>

          {/* Stripe IDs */}
          {(order.stripe_session_id || order.stripe_payment_intent_id) && (
            <Section title="Payment">
              {order.stripe_session_id && (
                <DetailRow label="Session" value={order.stripe_session_id.slice(0, 24) + "…"} />
              )}
              {order.stripe_payment_intent_id && (
                <DetailRow label="Payment Intent" value={order.stripe_payment_intent_id.slice(0, 24) + "…"} />
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, action }: {
  label: string;
  value: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm text-slate-800 break-all">{value}</span>
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs text-slate-400 hover:text-slate-700 flex-shrink-0 transition-colors underline"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Toast ─────────────────────────────────────────────────── */

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-xl animate-fadeIn">
      {message}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */

type ActiveTab = "all" | "unfulfilled" | "in_progress" | "fulfilled";

export default function OrdersClient({
  initialOrders,
  stats,
}: {
  initialOrders: Order[];
  stats: Stats;
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);
  const supabase = createClient();

  useEffect(() => {
    try {
      // pub_url_${projectId} stores the actual publishId-based URL (set since May 2026)
      // Fall back to scanning for any pub_url_ key if project-specific lookup fails
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("pub_url_")) {
          const url = localStorage.getItem(key);
          if (url) { setStoreUrl(url); break; }
        }
      }
    } catch {}
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((d) => setStripeConnected(!!d?.stripe?.onboarded))
      .catch(() => setStripeConnected(null));
  }, []);

  const unfulfilledCount = orders.filter((o) => o.fulfillment_status === "unfulfilled").length;
  const inProgressCount  = orders.filter((o) => o.fulfillment_status === "in_progress").length;
  const totalRevenue     = orders.reduce((s, o) => s + orderAmount(o), 0);

  async function handleStatusChange(orderId: string, newStatus: string) {
    const { error } = await supabase
      .from("orders")
      .update({ fulfillment_status: newStatus })
      .eq("id", orderId);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, fulfillment_status: newStatus } : o))
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, fulfillment_status: newStatus } : prev);
      }
      setToast(`Marked ${newStatus.replace("_", " ")}`);
    }
  }

  function handleNotesUpdate(orderId: string, notes: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, fulfillment_notes: notes } : o))
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "all") return true;
    return o.fulfillment_status === activeTab;
  });

  const tabs: { key: ActiveTab; label: string; count?: number }[] = [
    { key: "all",         label: "All",         count: orders.length },
    { key: "unfulfilled", label: "Unfulfilled",  count: unfulfilledCount },
    { key: "in_progress", label: "In Progress",  count: inProgressCount },
    { key: "fulfilled",   label: "Fulfilled",    count: orders.filter((o) => o.fulfillment_status === "fulfilled").length },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Orders</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage and fulfill orders from your stores</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Revenue" value={fmt(totalRevenue)} sub="Gross, before fees" />
        <StatCard label="Total Orders" value={orders.length.toString()} sub="All time" />
        <StatCard label="Unfulfilled" value={unfulfilledCount.toString()} sub="Needs action" highlight={unfulfilledCount > 0} />
        <StatCard label="In Progress" value={inProgressCount.toString()} sub="Being processed" />
      </div>

      {/* Payout info */}
      <div className="mb-6 rounded-xl px-4 py-3 flex gap-3" style={{ border: "1px solid #e7e5e4", background: "#fafaf9" }}>
        <svg className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#a8a29e" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        </svg>
        <div className="text-sm leading-relaxed" style={{ color: "#57534e" }}>
          <strong style={{ color: "#0c0a09" }}>How payouts work:</strong> Stripe deposits funds directly into your connected bank account, typically within 2–7 business days. Stripe charges a processing fee (usually 2.9% + 30¢ per transaction). You keep the rest.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium transition-all duration-150 border-b-2 -mb-px flex items-center gap-1.5"
            style={{
              borderColor: activeTab === tab.key ? "#0F172A" : "transparent",
              color: activeTab === tab.key ? "#0F172A" : "#94A3B8",
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className="inline-flex items-center justify-center h-4 min-w-4 rounded-full text-[10px] font-bold px-1"
                style={{
                  background: activeTab === tab.key ? "#0F172A" : "#E2E8F0",
                  color: activeTab === tab.key ? "#fff" : "#64748B",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-24">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-slate-100 mb-4 mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          {activeTab === "all" && stripeConnected === false ? (
            <>
              <p className="text-base font-medium text-slate-700 mb-1">Connect Stripe to start accepting orders</p>
              <p className="text-sm text-slate-400 max-w-xs mx-auto mb-6">
                Customers can&apos;t check out until you connect a Stripe account. It only takes a few minutes.
              </p>
              <a
                href="/dashboard/connect"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                style={{ textDecoration: "none" }}
              >
                Connect Stripe Now
              </a>
            </>
          ) : (
            <>
              <p className="text-base font-medium text-slate-700 mb-1">
                {activeTab === "all" ? "No orders yet" : `No ${activeTab.replace("_", " ")} orders`}
              </p>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                {activeTab === "all"
                  ? storeUrl
                    ? `Share your store to start getting sales: ${storeUrl}`
                    : "Share your store to start getting sales. Your orders will appear here."
                  : `Orders with "${activeTab.replace("_", " ")}" status will appear here.`}
              </p>
              {activeTab === "all" && storeUrl && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(storeUrl).then(() => setToast("Store link copied!")).catch(() => setToast("Failed to copy"));
                  }}
                  className="mt-6 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Copy Store Link
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              onViewDetails={setSelectedOrder}
              onToast={setToast}
            />
          ))}
        </div>
      )}

      {/* Order detail drawer */}
      {selectedOrder && (
        <OrderDrawer
          order={orders.find((o) => o.id === selectedOrder.id) ?? selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          onNotesUpdate={handleNotesUpdate}
          onToast={setToast}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
