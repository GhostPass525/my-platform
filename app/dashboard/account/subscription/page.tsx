"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type SubDetail = {
  active: boolean;
  status: string;
  plan_id: string | null;
  billing_period: string | null;
  amount: number | null;
  is_legacy: boolean;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  current_period_end: string | null;
};

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    monthly: 19,
    annualTotal: 189,
    annualMonthly: 15.75,
    features: [
      "1 store",
      "AI mentor chat",
      "Proactive AI check-ins",
      "Discovery flow",
      "Store builder + templates",
      "Stripe payments",
      "Printful integration",
      "Unlimited orders",
      "Email support",
    ],
    popular: false,
  },
  {
    id: "founder",
    name: "Founder",
    monthly: 39,
    annualTotal: 389,
    annualMonthly: 32.42,
    features: [
      "Everything in Starter, plus:",
      "3 stores",
      "Custom domain",
      "Analytics dashboard",
      "AI image generation",
      "Marketing content generator",
      "Email automation",
      "A/B testing tools",
      "Launch day plan generator",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "empire",
    name: "Empire",
    monthly: 99,
    annualTotal: 987,
    annualMonthly: 82.25,
    features: [
      "Everything in Founder, plus:",
      "Unlimited stores",
      "Marketplace access (coming soon)",
      "Business valuation widget",
      "Competitor teardown",
      "1-on-1 AI strategy sessions",
      "White-label option",
      "API access",
      "Dedicated success manager",
    ],
    popular: false,
  },
];

const PLAN_NAMES: Record<string, string> = { starter: "Starter", founder: "Founder", empire: "Empire", legacy: "Legacy" };

type ModalState =
  | { type: "upgrade"; planId: string; billing: string }
  | { type: "downgrade"; planId: string; billing: string }
  | { type: "billing_change"; planId: string; billing: string }
  | null;

export default function SubscriptionPage() {
  const router = useRouter();
  const [sub, setSub] = useState<SubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [modal, setModal] = useState<ModalState>(null);
  const [changing, setChanging] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "info" | "error"; msg: string } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const showToast = useCallback((type: "success" | "info" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 6000);
  }, []);

  const fetchSub = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch("/api/subscription/detail").then((r) => r.json());
      setSub(d);
      if (d.billing_period) setBilling(d.billing_period as "monthly" | "annual");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSub(); }, [fetchSub]);

  const handlePlanClick = (planId: string, selectedBilling: string) => {
    if (!sub?.active) return;
    if (sub.is_legacy) {
      showToast("info", "You're on a legacy plan. Changing will move you to current pricing.");
    }

    const currentPlanId = sub.plan_id ?? "starter";
    const currentBilling = sub.billing_period ?? "monthly";

    const RANK: Record<string, number> = { starter: 1, founder: 2, empire: 3, legacy: 2 };
    const currentRank = RANK[currentPlanId] ?? 1;
    const newRank = RANK[planId] ?? 1;

    const isUpgrade = newRank > currentRank || (newRank === currentRank && selectedBilling === "annual" && currentBilling === "monthly");
    const isDowngrade = newRank < currentRank || (newRank === currentRank && selectedBilling === "monthly" && currentBilling === "annual");

    if (isUpgrade) {
      setModal({ type: "upgrade", planId, billing: selectedBilling });
    } else if (isDowngrade) {
      setModal({ type: "downgrade", planId, billing: selectedBilling });
    } else {
      setModal({ type: "billing_change", planId, billing: selectedBilling });
    }
  };

  const handleConfirmChange = async () => {
    if (!modal) return;
    setChanging(true);
    try {
      const res = await fetch("/api/subscription/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: modal.planId, billing: modal.billing }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast("error", data.error || "Something went wrong.");
      } else {
        if (modal.type === "upgrade") {
          const plan = PLANS.find((p) => p.id === modal.planId);
          const value = plan ? (modal.billing === "annual" ? plan.annualTotal : plan.monthly) : 0;
          if (typeof window !== 'undefined' && (window as any).fbq) {
            (window as any).fbq('track', 'Subscribe', { value, currency: 'USD' });
          }
        }
        showToast(modal.type === "upgrade" ? "success" : "info", data.message);
        setModal(null);
        await fetchSub();
      }
    } finally {
      setChanging(false);
    }
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    const res = await fetch("/api/billing-portal", { method: "POST" });
    const data = await res.json();
    setPortalLoading(false);
    if (data.url) window.location.href = data.url;
    else showToast("error", data.error || "Could not open billing portal.");
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const currentPlanId = sub?.plan_id ?? null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <style>{`
        @keyframes subFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <button
          onClick={() => router.push("/dashboard/account")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: "2px 0", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Account
        </button>
        <span style={{ color: "#D1D5DB", fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Manage Subscription</span>
      </div>

      {/* Current plan summary */}
      {loading ? (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: 28, marginBottom: 20, color: "#9CA3AF", fontSize: 14 }}>Loading…</div>
      ) : sub?.active ? (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: 28, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 16 }}>
            Current Plan
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
                  {sub.is_legacy ? "Legacy" : PLAN_NAMES[sub.plan_id ?? ""] ?? "Volcity"}
                </span>
                {sub.is_legacy && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>
                    Legacy Plan
                  </span>
                )}
                {!sub.is_legacy && sub.plan_id && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" }}>
                    Current Plan
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#6B7280" }}>
                {sub.billing_period === "annual" ? "Billed annually" : "Billed monthly"}
                {sub.amount != null && ` · $${sub.amount.toFixed(2)}`}
              </div>
              {sub.cancel_at_period_end && (
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: "#DC2626" }}>
                  Cancels on {formatDate(sub.current_period_end)}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              {sub.current_period_end && !sub.cancel_at_period_end && (
                <div style={{ fontSize: 13, color: "#6B7280" }}>
                  Next billing: <strong style={{ color: "#374151" }}>{formatDate(sub.current_period_end)}</strong>
                </div>
              )}
              {sub.trial_end && sub.status === "trialing" && (
                <div style={{ fontSize: 13, color: "#D97706", fontWeight: 500 }}>
                  Trial ends {formatDate(sub.trial_end)}
                </div>
              )}
            </div>
          </div>
          {sub.is_legacy && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
              You're on a grandfathered legacy plan with Founder-tier features. If you change plans, you'll move to current pricing and lose legacy rates.
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: 28, marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>
            No active subscription.{" "}
            <a href="/dashboard" style={{ color: "#0f172a", fontWeight: 500 }}>Go to dashboard</a>
          </p>
        </div>
      )}

      {/* Billing toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => setBilling("monthly")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: billing === "monthly" ? 700 : 400, color: billing === "monthly" ? "#111827" : "#9CA3AF", padding: "4px 0" }}
        >
          Monthly
        </button>
        <div
          onClick={() => setBilling(b => b === "monthly" ? "annual" : "monthly")}
          style={{ width: 48, height: 26, borderRadius: 999, background: billing === "annual" ? "#0f172a" : "#D1D5DB", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
        >
          <div style={{ position: "absolute", top: 3, left: billing === "annual" ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </div>
        <button
          onClick={() => setBilling("annual")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: billing === "annual" ? 700 : 400, color: billing === "annual" ? "#111827" : "#9CA3AF", padding: "4px 0", display: "flex", alignItems: "center", gap: 6 }}
        >
          Annual
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 999, background: "#DCFCE7", color: "#166534" }}>Save 17%</span>
        </button>
      </div>

      {/* Plan comparison cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        {PLANS.map((plan) => {
          const isCurrent = currentPlanId === plan.id || (sub?.is_legacy && plan.id === "founder");
          const price = billing === "annual" ? plan.annualMonthly : plan.monthly;
          const RANK: Record<string, number> = { starter: 1, founder: 2, empire: 3, legacy: 2 };
          const currentRank = RANK[currentPlanId ?? "starter"] ?? 1;
          const planRank = RANK[plan.id];
          const isUpgrade = !isCurrent && planRank > currentRank;
          const isDowngrade = !isCurrent && planRank < currentRank;
          const isBillingChange = !isCurrent && planRank === currentRank;

          return (
            <div
              key={plan.id}
              style={{
                background: "#fff",
                borderRadius: 14,
                border: plan.popular ? "2px solid #0f172a" : "1px solid #E5E7EB",
                padding: 22,
                position: "relative",
                animation: "subFadeIn 0.3s ease-out both",
              }}
            >
              {plan.popular && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#fff", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
                  Most Popular
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>${billing === "annual" ? plan.annualTotal : plan.monthly}</span>
                  <span style={{ fontSize: 13, color: "#9CA3AF" }}>{billing === "annual" ? "/yr" : "/mo"}</span>
                </div>
                {billing === "annual" && (
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>${price.toFixed(2)}/mo billed annually</div>
                )}
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: f.startsWith("Everything") ? "#9CA3AF" : "#374151" }}>
                    {!f.startsWith("Everything") && (
                      <svg width="13" height="13" style={{ flexShrink: 0, marginTop: 1, color: "#16A34A" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div style={{ width: "100%", padding: "8px 0", borderRadius: 8, background: "#F3F4F6", fontSize: 13, fontWeight: 600, color: "#6B7280", textAlign: "center" }}>
                  Current Plan
                </div>
              ) : !sub?.active ? null : (
                <button
                  onClick={() => handlePlanClick(plan.id, billing)}
                  style={{
                    width: "100%",
                    padding: "8px 0",
                    borderRadius: 8,
                    border: isDowngrade ? "1px solid #FCA5A5" : "none",
                    background: isDowngrade ? "#FFF5F5" : isUpgrade ? "#0f172a" : "#F3F4F6",
                    fontSize: 13,
                    fontWeight: 600,
                    color: isDowngrade ? "#DC2626" : isUpgrade ? "#fff" : "#374151",
                    cursor: "pointer",
                  }}
                >
                  {isUpgrade ? "Upgrade" : isDowngrade ? "Downgrade" : "Switch"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Manage subscription section */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 16 }}>
          Manage Subscription
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={openBillingPortal}
            disabled={portalLoading}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", opacity: portalLoading ? 0.6 : 1 }}
          >
            {portalLoading ? "Opening…" : "Update Payment Method"}
          </button>
          <button
            onClick={openBillingPortal}
            disabled={portalLoading}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", opacity: portalLoading ? 0.6 : 1 }}
          >
            {portalLoading ? "Opening…" : "Billing History"}
          </button>
          <a
            href="/dashboard/account"
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #FECACA", background: "#FFF5F5", fontSize: 13, fontWeight: 600, color: "#DC2626", textDecoration: "none", display: "inline-block" }}
          >
            Cancel Subscription
          </a>
        </div>
        <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 12, marginBottom: 0, lineHeight: 1.6 }}>
          To cancel, go to Account settings. Cancelling keeps your access until the end of your billing period.
        </p>
      </div>

      {/* Change confirmation modal */}
      {modal && (
        <div
          onClick={() => !changing && setModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 440, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}
          >
            {modal.type === "upgrade" && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 12 }}>
                  Upgrade to {PLAN_NAMES[modal.planId]}?
                </h2>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>
                  You'll be upgraded immediately. A prorated charge for the remainder of your billing period will appear on your next invoice.
                </p>
              </>
            )}
            {modal.type === "downgrade" && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 12 }}>
                  Downgrade to {PLAN_NAMES[modal.planId]}?
                </h2>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 12 }}>
                  Your plan will change to <strong>{PLAN_NAMES[modal.planId]}</strong> at the end of your current billing period. You'll keep your current features until then.
                </p>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#DC2626", marginBottom: 24 }}>
                  You may lose access to features not included in {PLAN_NAMES[modal.planId]}.
                </p>
              </>
            )}
            {modal.type === "billing_change" && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 12 }}>
                  Switch to {modal.billing === "annual" ? "annual" : "monthly"} billing?
                </h2>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>
                  {modal.billing === "annual"
                    ? "Switching to annual saves you 17%. The change applies immediately with proration."
                    : "Switching to monthly increases your per-month cost. This will take effect at the end of your current billing period."}
                </p>
              </>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setModal(null)}
                disabled={changing}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmChange}
                disabled={changing}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                  background: modal.type === "downgrade" ? "#DC2626" : "#0f172a",
                  fontSize: 14, fontWeight: 600, color: "#fff",
                  cursor: changing ? "default" : "pointer", opacity: changing ? 0.7 : 1,
                }}
              >
                {changing ? "Processing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 200,
          background: toast.type === "error" ? "#DC2626" : toast.type === "success" ? "#0f172a" : "#0369A1",
          color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 14, fontWeight: 500,
          boxShadow: "0 8px 32px rgba(0,0,0,0.28)", maxWidth: 480, textAlign: "center",
          animation: "subFadeIn 0.2s ease-out both", whiteSpace: "nowrap",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
