"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type PFProduct = {
  id: number;
  name: string;
  thumbnail_url?: string;
};

type UserProject = { id: string; name: string };

type PrintfulStatus = {
  connected: boolean;
  store_name?: string;
  store_id?: string;
  connected_at?: string;
};

type ConnectStatus = {
  connected: boolean;
  connected_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  blocked_checkout_count?: number;
};

type Order = {
  id: string;
  amount: number;
  product_name?: string;
  customer_email: string;
  customer_name?: string;
  created_at: string;
};

type OrdersData = {
  orders: Order[];
  stats: { totalRevenue: number; totalOrders: number; avgOrderValue: number };
};

function fmt(dollars: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
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
      .reduce((sum, o) => sum + (o.amount || 0), 0);
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
                {barH > 0 && <rect x={x} y={chartH - barH} width={barW} height={barH} rx={6} fill="#0f172a" />}
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
  border: "1px solid #e7e5e4",
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
  const printfulParam = searchParams.get("printful");

  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordersData, setOrdersData] = useState<OrdersData | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [printfulStatus, setPrintfulStatus] = useState<PrintfulStatus | null>(null);
  const [loadingPrintful, setLoadingPrintful] = useState(true);
  const [showPrintfulBanner, setShowPrintfulBanner] = useState(false);
  const [printfulError, setPrintfulError] = useState(false);
  const [showPrintfulPrompt, setShowPrintfulPrompt] = useState(false);

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [pfProducts, setPfProducts] = useState<PFProduct[]>([]);
  const [loadingPfProducts, setLoadingPfProducts] = useState(false);
  const [selectedPfIds, setSelectedPfIds] = useState<Set<number>>(new Set());
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [importProjectId, setImportProjectId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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

  const fetchPrintfulStatus = useCallback(async () => {
    setLoadingPrintful(true);
    try {
      const res = await fetch("/api/printful/status");
      const data = await res.json().catch(() => null);
      if (res.ok && data) setPrintfulStatus(data);
    } catch {
      // silently ignore
    } finally {
      setLoadingPrintful(false);
    }
  }, []);

  const openImportModal = useCallback(async () => {
    setShowImportModal(true);
    setSelectedPfIds(new Set());
    setImportResult(null);
    setImportError(null);

    // Fetch Printful sync products and user projects in parallel
    setLoadingPfProducts(true);
    const [pfRes, projRes] = await Promise.all([
      fetch("/api/printful/sync-products"),
      fetch("/api/projects"),
    ]);
    setLoadingPfProducts(false);

    if (pfRes.ok) {
      const d = await pfRes.json();
      setPfProducts(d.products ?? []);
    } else {
      setImportError("Failed to load Printful products. Check your connection.");
    }

    if (projRes.ok) {
      const projects = await projRes.json().catch(() => []);
      if (Array.isArray(projects)) {
        setUserProjects(projects as UserProject[]);
        if (projects.length > 0) setImportProjectId(projects[0].id);
      }
    }
  }, []);

  const doImport = useCallback(async () => {
    if (!importProjectId || selectedPfIds.size === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      const products = pfProducts
        .filter((p) => selectedPfIds.has(p.id))
        .map((p) => ({ printfulId: p.id, name: p.name, thumbnailUrl: p.thumbnail_url }));

      const res = await fetch("/api/printful/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: importProjectId, products }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult({ added: data.added ?? 0 });
      } else {
        setImportError(data?.error || "Import failed. Please try again.");
      }
    } catch {
      setImportError("Network error. Please try again.");
    } finally {
      setImporting(false);
    }
  }, [importProjectId, selectedPfIds, pfProducts]);

  useEffect(() => {
    fetchStatus();
    fetchPrintfulStatus();
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrdersData(d))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [fetchStatus, fetchPrintfulStatus]);

  useEffect(() => {
    if (printfulParam === "connected") {
      setShowPrintfulBanner(true);
      const t = setTimeout(() => setShowPrintfulBanner(false), 6000);
      fetchPrintfulStatus();
      return () => clearTimeout(t);
    }
    if (printfulParam === "error") {
      setPrintfulError(true);
    }
  }, [printfulParam, fetchPrintfulStatus]);

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

  // Show Printful prompt after Stripe connects (if Printful not yet connected)
  useEffect(() => {
    if (isConnected && !loadingPrintful && printfulStatus && !printfulStatus.connected) {
      const t = setTimeout(() => setShowPrintfulPrompt(true), 1200);
      return () => clearTimeout(t);
    }
  }, [isConnected, loadingPrintful, printfulStatus]);

  useEffect(() => {
    if (isRefresh && !loading && status && !status.charges_enabled) startOnboarding();
  }, [isRefresh, loading, status, startOnboarding]);

  const orders = ordersData?.orders ?? [];
  const stats = ordersData?.stats;

  const productMap = new Map<string, { count: number; revenue: number }>();
  for (const o of orders) {
    const name = o.product_name || "Unknown";
    const prev = productMap.get(name) ?? { count: 0, revenue: 0 };
    productMap.set(name, { count: prev.count + 1, revenue: prev.revenue + (o.amount || 0) });
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
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1A1A1A", margin: 0, letterSpacing: "-0.01em" }}>Payouts</h1>
        <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>Set up your bank details to receive payments from your customers</p>
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
          Payouts set up successfully!
        </div>
      )}

      {/* ── Empty state callout ── */}
      {!loading && !loadingPrintful && !status?.connected && !printfulStatus?.connected && (
        <div style={{ ...CARD, background: "#FAFAF9", border: "1px solid #E7E5E4", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, padding: "32px 24px", marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#EEEDE9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", marginBottom: 4 }}>No integrations connected</div>
            <div style={{ fontSize: 13, color: "#888" }}>Connect Stripe to accept payments, and Printful to sell physical products without holding inventory.</div>
          </div>
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
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f5f5f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#57534e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0c0a09", marginBottom: 4 }}>Create a Stripe account first</div>
                <div style={{ fontSize: 13, color: "#78716c" }}>You need a free Stripe account to receive payouts — it only takes a few minutes.</div>
              </div>
              <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#0f172a", color: "#fff", textDecoration: "none", width: "fit-content" }}>
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
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", marginBottom: 4 }}>Set up payouts</div>
                <div style={{ fontSize: 13, color: "#888" }}>Enter your bank details to receive payments from your customers. Volcity takes a <strong style={{ color: "#1A1A1A" }}>5% platform fee</strong> per sale.</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  "Customers can check out on your store",
                  "Funds go directly to your Stripe account",
                  "Volcity deducts 5% per transaction",
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#888" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#EEEDE9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, fontWeight: 600, color: "#AAA" }}>{i + 1}</div>
                    {step}
                  </div>
                ))}
              </div>
              {(status?.blocked_checkout_count ?? 0) > 0 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, background: "#FEF3C7", border: "1px solid #FDE68A", fontSize: 12, color: "#92400E", fontWeight: 500 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  {status?.blocked_checkout_count} {status?.blocked_checkout_count === 1 ? "person" : "people"} tried to buy while payments were disabled
                </div>
              )}
              <button onClick={startOnboarding} disabled={onboarding} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#0f172a", color: "#fff", border: "none", cursor: onboarding ? "not-allowed" : "pointer", opacity: onboarding ? 0.4 : 1, width: "fit-content" }}>
                {onboarding ? <><SpinIcon /> Redirecting…</> : "Set Up Payouts"}
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
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", marginBottom: 4 }}>Finish setting up payouts</div>
              <div style={{ fontSize: 13, color: "#888" }}>Complete your bank details to start receiving payments.</div>
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
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Payouts Active</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>Your bank account is connected and ready to receive payments.</div>
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

      {/* ── Printful Card ── */}
      {showPrintfulBanner && (
        <div style={{ ...CARD, background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Printful account connected!
        </div>
      )}
      {printfulError && (
        <div style={{ ...CARD, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Failed to connect Printful. Please try again.
        </div>
      )}

      <div style={CARD}>
        {loadingPrintful ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#AAA", fontSize: 13 }}>
            <SpinIcon /> Loading Printful status…
          </div>
        ) : printfulStatus?.connected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Printful Connected</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{printfulStatus.store_name || "Store connected"}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Store", value: printfulStatus.store_name || "—" },
                { label: "Store ID", value: printfulStatus.store_id || "—", mono: true },
                { label: "Fulfillment", value: "Active", green: true },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "#FAFAF8", border: "1px solid #EEEDE9" }}>
                  <span style={{ fontSize: 13, color: "#555" }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, fontFamily: row.mono ? "monospace" : "inherit", color: row.green ? "#16a34a" : "#1A1A1A" }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={openImportModal}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#4F46E5", color: "#fff", border: "none", cursor: "pointer", width: "fit-content" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Import Products
              </button>
              <a
                href={"/api/printful/connect"}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#1A1A1A", color: "#fff", textDecoration: "none", width: "fit-content" }}
              >
                Reconnect Printful
              </a>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EEEDE9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Printful</div>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 4, padding: "2px 6px" }}>Optional</span>
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>Automatically print and ship products when orders come in. Great for t-shirts, mugs, phone cases &mdash; no inventory needed.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                "Customer places an order on your store",
                "Printful auto-fulfills and ships directly to them",
                "You keep the profit margin",
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#888" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#EEEDE9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, fontWeight: 600, color: "#AAA" }}>{i + 1}</div>
                  {step}
                </div>
              ))}
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, background: "#EEEDE9", width: "fit-content" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#AAA" }} />
              <span style={{ fontSize: 12, color: "#888" }}>Not connected</span>
            </div>
            <a
              href={"/api/printful/connect"}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#1A1A1A", color: "#fff", textDecoration: "none", width: "fit-content" }}
            >
              Connect Printful Account
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        )}
      </div>

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

      {/* ── Printful Post-Stripe Prompt ── */}
      {showPrintfulPrompt && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}>
          <div style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.2)", padding: "28px 28px 24px", margin: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A", marginBottom: 8 }}>Sell physical products?</div>
            <p style={{ fontSize: 13, color: "#888", lineHeight: 1.65, marginBottom: 20 }}>
              Connect Printful to automatically print and ship products when orders come in — no inventory required. Perfect for t-shirts, mugs, phone cases, and more.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <a
                href={"/api/printful/connect"}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", gap: 6 }}
              >
                Connect Printful
              </a>
              <button
                onClick={() => setShowPrintfulPrompt(false)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #E7E5E4", background: "#fff", color: "#888", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                I&apos;ll handle fulfillment myself
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Printful Products Modal ── */}
      {showImportModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div style={{ width: "100%", maxWidth: 540, background: "#fff", borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.2)", margin: 16, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            {/* Modal header */}
            <div style={{ padding: "24px 24px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A" }}>Import Printful Products</div>
                <button onClick={() => setShowImportModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#AAA", padding: 4, display: "flex" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Select which products to add to your store</p>

              {/* Project selector */}
              {userProjects.length > 1 && !importResult && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", display: "block", marginBottom: 6 }}>Import to store</label>
                  <select
                    value={importProjectId}
                    onChange={(e) => setImportProjectId(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #E7E5E4", fontSize: 13, color: "#1A1A1A", background: "#fff", outline: "none" }}
                  >
                    {userProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
              {importResult ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F0FDF4", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", marginBottom: 6 }}>
                    {importResult.added === 0 ? "Already imported" : `${importResult.added} product${importResult.added === 1 ? "" : "s"} imported!`}
                  </div>
                  <p style={{ fontSize: 13, color: "#888" }}>
                    {importResult.added === 0
                      ? "These products were already in your store."
                      : "Open your store in the builder to set prices and publish."}
                  </p>
                </div>
              ) : loadingPfProducts ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, padding: "16px 0" }}>
                  {[1,2,3,4].map((i) => (
                    <div key={i} style={{ height: 100, background: "#F5F4F2", borderRadius: 10, animation: "pulse 1.5s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : importError && pfProducts.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: "#991B1B" }}>{importError}</div>
              ) : pfProducts.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "#AAA" }}>No products found in your Printful store.</p>
                  <a href="https://www.printful.com/dashboard/sync" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#4F46E5", textDecoration: "underline" }}>
                    Add products in Printful
                  </a>
                </div>
              ) : (
                <div style={{ padding: "8px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "#888" }}>{pfProducts.length} product{pfProducts.length !== 1 ? "s" : ""} in your Printful store</span>
                    <button
                      onClick={() => {
                        if (selectedPfIds.size === pfProducts.length) {
                          setSelectedPfIds(new Set());
                        } else {
                          setSelectedPfIds(new Set(pfProducts.map((p) => p.id)));
                        }
                      }}
                      style={{ fontSize: 12, color: "#4F46E5", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      {selectedPfIds.size === pfProducts.length ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                    {pfProducts.map((p) => {
                      const selected = selectedPfIds.has(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPfIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            });
                          }}
                          style={{
                            display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
                            padding: 10, borderRadius: 10, border: `2px solid ${selected ? "#4F46E5" : "#E7E5E4"}`,
                            background: selected ? "#EEF2FF" : "#FAFAF8", cursor: "pointer", textAlign: "left", transition: "border-color 0.15s, background 0.15s",
                          }}
                        >
                          {p.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.thumbnail_url} alt={p.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6 }} />
                          ) : (
                            <div style={{ width: "100%", aspectRatio: "1", background: "#EEEDE9", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
                              </svg>
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", width: "100%", gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: "#1A1A1A", lineHeight: 1.4, flex: 1 }}>{p.name}</span>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selected ? "#4F46E5" : "#CCC"}`, background: selected ? "#4F46E5" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {selected && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {importError && (
                    <div style={{ marginTop: 12, fontSize: 12, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px" }}>{importError}</div>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ padding: "16px 24px 24px", flexShrink: 0, borderTop: "1px solid #F0EFED" }}>
              {importResult ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setShowImportModal(false)}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Done
                  </button>
                  {importResult.added > 0 && (
                    <a
                      href={importProjectId ? `/?project=${importProjectId}` : "/"}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #E7E5E4", background: "#fff", color: "#1A1A1A", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                    >
                      Open in Builder
                    </a>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={doImport}
                    disabled={importing || selectedPfIds.size === 0 || !importProjectId}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#4F46E5", color: "#fff", fontSize: 13, fontWeight: 600, cursor: importing || selectedPfIds.size === 0 ? "not-allowed" : "pointer", opacity: importing || selectedPfIds.size === 0 ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    {importing && <SpinIcon />}
                    {importing ? "Importing…" : selectedPfIds.size === 0 ? "Select products" : `Import ${selectedPfIds.size} product${selectedPfIds.size === 1 ? "" : "s"}`}
                  </button>
                  <button
                    onClick={() => setShowImportModal(false)}
                    style={{ flex: 0, padding: "10px 16px", borderRadius: 10, border: "1px solid #E7E5E4", background: "#fff", color: "#888", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                    {" "}— <strong style={{ color: "#1A1A1A", fontWeight: 500 }}>{fmt(o.amount)}</strong>
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
