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
        return od.getDate() === d.getDate() && od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
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
        <svg width={totalW} height={chartH + 28} style={{ overflow: "visible" }}>
          {data.map((d, i) => {
            const barH = Math.max((d.amount / maxVal) * chartH, 0);
            const x = i * (barW + gap);
            return (
              <g key={i}>
                <rect x={x} y={0} width={barW} height={chartH} rx={6} fill="#EEEDE9" />
                {barH > 0 && <rect x={x} y={chartH - barH} width={barW} height={barH} rx={6} fill="#2563EB" />}
                <text x={x + barW / 2} y={chartH + 20} textAnchor="middle" fontSize={11} fill="#AAA" fontFamily="inherit">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {!hasData && (
        <p style={{ textAlign: "center", fontSize: 13, color: "#AAA", marginTop: 12 }}>
          Your sales chart will appear here
        </p>
      )}
    </div>
  );
}

const CARD: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #E8E8E4",
  padding: 24,
  marginBottom: 16,
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#AAA",
  marginBottom: 16,
};

const SpinIcon = () => (
  <svg style={{ animation: "spin 1s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
);

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
      const data = await res.json().catch(() => null);
      if (res.ok && data) setStatus(data);
    } catch (e) {
      console.error("Connect status fetch failed:", e);
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
      const bannerTimer = setTimeout(() => setShowBanner(false), 6000);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        await fetchStatus();
        if (attempts >= 5) clearInterval(poll);
      }, 2000);
      return () => { clearTimeout(bannerTimer); clearInterval(poll); };
    }
  }, [isConnected, fetchStatus]);

  useEffect(() => {
    if (isRefresh && !loading && status && !status.charges_enabled) startOnboarding();
  }, [isRefresh, loading, status, startOnboarding]);

  const orders = ordersData?.orders ?? [];
  const stats = ordersData?.stats;

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
  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1A1A1A", margin: 0, letterSpacing: "-0.01em" }}>Payments</h1>
        <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>Connect Stripe to accept payments and track your revenue</p>
      </div>

      {/* Error banner */}
      {error && error !== "CONNECT_NOT_ENABLED" && (
        <div style={{ ...CARD, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Success banner */}
      {showBanner && (
        <div style={{ ...CARD, background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Your Stripe account is connected!
        </div>
      )}

      {/* ── Stripe Connect Card ── */}
      {loading ? (
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#AAA", fontSize: 13 }}>
            <SpinIcon /> Loading account status…
          </div>
        </div>
      ) : !status?.connected ? (
        <div style={CARD}>
          {error === "CONNECT_NOT_ENABLED" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", marginBottom: 4 }}>Create or connect a Stripe account</div>
                <div style={{ fontSize: 13, color: "#888" }}>Sign up for Stripe — it only takes a few minutes.</div>
              </div>
              <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#2563EB", color: "#fff", textDecoration: "none", width: "fit-content" }}>
                Sign up for Stripe
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              <div style={{ fontSize: 12, color: "#AAA" }}>
                Already have an account?{" "}
                <button onClick={() => { setError(null); startOnboarding(); }} style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: "#888", cursor: "pointer", textDecoration: "underline" }}>
                  Try connecting again
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EEEDE9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", marginBottom: 4 }}>Connect your Stripe account</div>
                <div style={{ fontSize: 13, color: "#888" }}>Accept payments directly. Volcity takes a <strong style={{ color: "#1A1A1A" }}>1% platform fee</strong> per sale.</div>
              </div>
              <button onClick={startOnboarding} disabled={onboarding} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#2563EB", color: "#fff", border: "none", cursor: onboarding ? "not-allowed" : "pointer", opacity: onboarding ? 0.6 : 1, width: "fit-content" }}>
                {onboarding ? <><SpinIcon /> Redirecting…</> : "Connect Stripe Account"}
              </button>
            </div>
          )}
        </div>
      ) : !status.charges_enabled ? (
        <div style={{ ...CARD, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", marginBottom: 4 }}>Finish setting up your account</div>
              <div style={{ fontSize: 13, color: "#888" }}>Complete Stripe onboarding to start receiving payments.</div>
            </div>
            <button onClick={startOnboarding} disabled={onboarding} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#D97706", color: "#fff", border: "none", cursor: onboarding ? "not-allowed" : "pointer", opacity: onboarding ? 0.6 : 1, width: "fit-content" }}>
              {onboarding ? <><SpinIcon /> Redirecting…</> : "Complete Setup"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ ...CARD, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Connected to Stripe</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>Your account is active and ready to accept payments.</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Account ID", value: status.connected_account_id, mono: true },
                { label: "Payments", value: "Enabled", green: true },
                { label: "Payouts", value: status.payouts_enabled ? "Enabled" : "Pending", green: status.payouts_enabled, yellow: !status.payouts_enabled },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.7)", border: "1px solid #D1FAE5" }}>
                  <span style={{ fontSize: 13, color: "#555" }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, fontFamily: row.mono ? "monospace" : "inherit", color: row.green ? "#16a34a" : row.yellow ? "#D97706" : "#1A1A1A" }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <a href="https://dashboard.stripe.com/express" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#1A1A1A", color: "#fff", textDecoration: "none", width: "fit-content" }}>
              Manage Account
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {loadingOrders ? (
          [1, 2, 3].map((i) => (
            <div key={i} style={{ ...CARD, marginBottom: 0, height: 86 }} />
          ))
        ) : (
          <>
            {[
              { label: "Total Earned", value: fmt(stats?.totalRevenue ?? 0), sub: `${stats?.totalOrders ?? 0} orders all time` },
              { label: "This Month", value: String(ordersThisMonth), sub: `orders in ${new Date().toLocaleDateString("en-US", { month: "long" })}` },
              { label: "Avg Order", value: fmt(stats?.avgOrderValue ?? 0), sub: "per transaction" },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ ...CARD, marginBottom: 0 }}>
                <div style={SECTION_LABEL}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1A", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: 12, color: "#AAA", marginTop: 4 }}>{sub}</div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Sales Chart ── */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Sales — Last 7 Days</div>
        {loadingOrders ? (
          <div style={{ height: 128, background: "#EEEDE9", borderRadius: 8 }} />
        ) : (
          <SalesChart orders={orders} />
        )}
      </div>

      {/* ── Best Sellers ── */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Best Sellers</div>
        {loadingOrders ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => <div key={i} style={{ height: 44, background: "#EEEDE9", borderRadius: 8 }} />)}
          </div>
        ) : topProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EEEDE9", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <p style={{ fontSize: 13, color: "#AAA", margin: 0 }}>Your best sellers will appear here once you start getting sales.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topProducts.map(([name, data], i) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "#FAFAF8", border: "1px solid #EEEDE9" }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#AAA", width: 18, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                <span style={{ fontSize: 12, color: "#888" }}>{data.count} sold</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{fmt(data.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Activity ── */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Recent Activity</div>
        {loadingOrders ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4].map((i) => <div key={i} style={{ height: 32, background: "#EEEDE9", borderRadius: 8 }} />)}
          </div>
        ) : recentOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EEEDE9", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p style={{ fontSize: 13, color: "#AAA", margin: 0 }}>Activity will appear here once you start getting orders.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentOrders.map((o) => {
              const name = o.customer_name || o.customer_email?.split("@")[0] || "a customer";
              return (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: "#555" }}>
                    New order from <strong style={{ color: "#1A1A1A", fontWeight: 500 }}>{name}</strong>
                    {" "}— <strong style={{ color: "#1A1A1A", fontWeight: 500 }}>{fmt(o.total)}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: "#AAA", flexShrink: 0 }}>{timeAgo(o.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
