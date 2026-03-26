"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type ConnectStatus = {
  connected: boolean;
  connected_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
};

type OrderItem = { product_name: string };

type Order = {
  id: string;
  total: number;
  customer_email: string;
  customer_name?: string;
  created_at: string;
  order_items?: OrderItem[];
};

type OrdersData = {
  orders: Order[];
  stats: { totalRevenue: number; totalOrders: number; avgOrderValue: number };
};

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

function SalesChart({ orders }: { orders: Order[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const data = days.map((d) => {
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const amount = orders
      .filter((o) => {
        const od = new Date(o.created_at);
        return (
          od.getDate() === d.getDate() &&
          od.getMonth() === d.getMonth() &&
          od.getFullYear() === d.getFullYear()
        );
      })
      .reduce((sum, o) => sum + (o.total || 0), 0);
    return { label, amount };
  });

  const maxVal = Math.max(...data.map((d) => d.amount), 100);
  const hasData = data.some((d) => d.amount > 0);
  const chartH = 96;
  const barW = 36;
  const gap = 12;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg
          width={totalW}
          height={chartH + 28}
          style={{ overflow: "visible" }}
        >
          {data.map((d, i) => {
            const barH = Math.max((d.amount / maxVal) * chartH, 0);
            const x = i * (barW + gap);
            return (
              <g key={i}>
                <rect x={x} y={0} width={barW} height={chartH} rx={6} fill="#F1F0EC" />
                {barH > 0 && (
                  <rect x={x} y={chartH - barH} width={barW} height={barH} rx={6} fill="#2563EB" />
                )}
                <text
                  x={x + barW / 2}
                  y={chartH + 20}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#94a3b8"
                  fontFamily="inherit"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {!hasData && (
        <p className="text-center text-sm text-slate-400 mt-3">
          Your sales chart will appear here
        </p>
      )}
    </div>
  );
}

export default function ConnectClient() {
  const searchParams = useSearchParams();
  const isConnected = searchParams.get("connected") === "1";
  const isRefresh = searchParams.get("refresh") === "1";

  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ordersData, setOrdersData] = useState<OrdersData | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connect/status");
      if (res.ok) setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const startOnboarding = useCallback(async () => {
    setOnboarding(true);
    setError(null);
    try {
      const res = await fetch("/api/connect/onboard", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        const msg = data?.error || "";
        setError(msg.toLowerCase().includes("connect") ? "CONNECT_NOT_ENABLED" : msg || "Failed to start Stripe onboarding.");
        setOnboarding(false);
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || "Network error.");
      setOnboarding(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrdersData(d))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [fetchStatus]);

  useEffect(() => {
    if (isConnected) {
      setShowBanner(true);
      const t = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(t);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isRefresh && !loading && status && !status.charges_enabled) startOnboarding();
  }, [isRefresh, loading, status, startOnboarding]);

  const orders = ordersData?.orders ?? [];
  const stats = ordersData?.stats;

  // group order items by product name for top products
  const productMap = new Map<string, { count: number; revenue: number }>();
  for (const o of orders) {
    for (const item of o.order_items ?? []) {
      const name = item.product_name || "Unknown";
      const prev = productMap.get(name) ?? { count: 0, revenue: 0 };
      productMap.set(name, { count: prev.count + 1, revenue: prev.revenue + (o.total || 0) });
    }
  }
  const topProducts = [...productMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  const now = new Date();
  const ordersThisMonth = orders.filter((o) => {
    const d = new Date(o.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const SpinIcon = () => (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1A1A1A", margin: 0, letterSpacing: "-0.01em" }}>
          Payments
        </h1>
        <p style={{ fontSize: 14, color: "#888", margin: "4px 0 0" }}>
          Connect Stripe to accept payments and track your revenue
        </p>
        <div style={{ marginTop: 20, borderBottom: "1px solid #E8E8E4" }} />
      </div>

      {/* Error banner */}
      {error && error !== "CONNECT_NOT_ENABLED" && (
        <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Success banner */}
      {showBanner && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-fadeIn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Your Stripe account is connected!
        </div>
      )}

      {/* ── Stripe Connect Card ─────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <SpinIcon /> Loading account status…
          </div>
        </div>
      ) : !status?.connected ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          {error === "CONNECT_NOT_ENABLED" ? (
            <div className="flex flex-col items-start gap-5">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Create or connect a Stripe account</h2>
                <p className="text-sm text-slate-500 max-w-sm">Sign up for Stripe — it only takes a few minutes.</p>
              </div>
              <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2">
                Sign up for Stripe
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              <p className="text-xs text-slate-400">Already have an account?{" "}
                <button onClick={() => { setError(null); startOnboarding(); }} className="underline text-slate-500 hover:text-slate-700">Try connecting again</button>
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-5">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Connect your Stripe account</h2>
                <p className="text-sm text-slate-500 max-w-sm">
                  Accept payments directly. VentureOS takes a <span className="font-medium text-slate-700">1% platform fee</span> per sale.
                </p>
              </div>
              <button onClick={startOnboarding} disabled={onboarding} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                {onboarding ? <><SpinIcon /> Redirecting…</> : "Connect Stripe Account"}
              </button>
            </div>
          )}
        </div>
      ) : !status.charges_enabled ? (
        <div className="bg-white rounded-xl border border-amber-200 p-6 mb-6" style={{ background: "rgba(254,243,199,0.2)" }}>
          <div className="flex flex-col items-start gap-5">
            <div className="h-12 w-12 rounded-xl bg-yellow-50 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Finish setting up your account</h2>
              <p className="text-sm text-slate-500 max-w-sm">Complete Stripe onboarding to start receiving payments.</p>
            </div>
            <button onClick={startOnboarding} disabled={onboarding} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-yellow-500 hover:bg-yellow-600 text-white transition-colors disabled:opacity-60 flex items-center gap-2">
              {onboarding ? <><SpinIcon /> Redirecting…</> : "Complete Setup"}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-emerald-200 p-6 mb-6" style={{ background: "rgba(240,253,244,0.4)" }}>
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Connected to Stripe</h2>
                <p className="text-sm text-slate-500 mt-0.5">Your account is active and ready to accept payments.</p>
              </div>
            </div>
            <div className="grid gap-2">
              {[
                { label: "Account ID", value: status.connected_account_id, mono: true },
                { label: "Payments", value: "Enabled", green: true },
                { label: "Payouts", value: status.payouts_enabled ? "Enabled" : "Pending", green: status.payouts_enabled, yellow: !status.payouts_enabled },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-sm text-slate-600">{row.label}</span>
                  <span className={`text-sm font-medium ${row.mono ? "font-mono text-slate-800" : row.green ? "text-emerald-700" : "text-yellow-600"}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <a href="https://dashboard.stripe.com/express" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors w-fit">
              Manage Account
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* ── Payment Summary Stats ────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        {loadingOrders ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-7 w-28 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 8 }}>Total Earned</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1A1A1A", letterSpacing: "-0.02em" }}>{fmt(stats?.totalRevenue ?? 0)}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{stats?.totalOrders ?? 0} orders all time</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 8 }}>This Month</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1A1A1A", letterSpacing: "-0.02em" }}>{ordersThisMonth}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                orders in {new Date().toLocaleDateString("en-US", { month: "long" })}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 8 }}>Avg Order</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1A1A1A", letterSpacing: "-0.02em" }}>{fmt(stats?.avgOrderValue ?? 0)}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>per transaction</div>
            </div>
          </>
        )}
      </div>

      {/* ── Sales Chart ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 20 }}>
          Sales — Last 7 Days
        </div>
        {loadingOrders ? (
          <div className="h-32 animate-pulse bg-slate-50 rounded-lg" />
        ) : (
          <SalesChart orders={orders} />
        )}
      </div>

      {/* ── Top Products ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 16 }}>
          Best Sellers
        </div>
        {loadingOrders ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-11" />)}
          </div>
        ) : topProducts.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <p className="text-sm text-slate-400">Your best sellers will appear here once you start getting sales.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topProducts.map(([name, data], i) => (
              <div key={name} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                <span style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8", width: 20, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#1A1A1A" }} className="truncate">{name}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>{data.count} sold</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{fmt(data.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Activity ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 16 }}>
          Recent Activity
        </div>
        {loadingOrders ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8" />)}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="text-sm text-slate-400">Activity will appear here once you start getting orders.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((o) => {
              const name = o.customer_name || o.customer_email?.split("@")[0] || "a customer";
              return (
                <div key={o.id} className="flex items-center gap-3">
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, color: "#374151" }}>
                    New order from <span style={{ fontWeight: 500 }}>{name}</span>
                    {" "}— <span style={{ fontWeight: 500 }}>{fmt(o.total)}</span>
                  </span>
                  <span style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>{timeAgo(o.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
