"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

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
  stripe_customer_id: string | null;
};

type Invoice = {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  date: string | null;
  pdf_url: string | null;
  hosted_url: string | null;
};

const PLAN_NAMES: Record<string, string> = { starter: "Starter", founder: "Founder", empire: "Empire", legacy: "Legacy" };
const PLAN_FEATURES_LOST: Record<string, string[]> = {
  starter: ["AI mentor chat", "Stripe payments", "Printful integration", "Order management"],
  founder: ["AI mentor chat", "Stripe payments", "3 stores", "Analytics dashboard", "AI image generation", "Marketing tools"],
  empire: ["AI mentor chat", "Stripe payments", "Unlimited stores", "Analytics dashboard", "AI strategy sessions", "Dedicated success manager"],
  legacy: ["AI mentor chat", "Stripe payments", "3 stores (Founder-tier features)"],
};

const ONB_KEYS = ["onb:dashboard", "onb:builder", "onb:generated", "onb:publish_hint"];

type RetentionStep = "initial" | "confirm";

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const isDebug = process.env.NODE_ENV === "development" || searchParams.get("debug") === "true";
  const [onbReset, setOnbReset] = useState(false);

  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [sub, setSub] = useState<SubDetail | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);

  // Retention flow
  const [showRetention, setShowRetention] = useState(false);
  const [retentionStep, setRetentionStep] = useState<RetentionStep>("initial");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setEmail(user.email ?? "");
      setCreatedAt(user.created_at ?? null);
    });

    fetch("/api/subscription/detail")
      .then((r) => r.json())
      .then((d) => setSub(d))
      .finally(() => setLoadingSub(false));
  }, []);

  useEffect(() => {
    if (!sub?.active) return;
    setLoadingInvoices(true);
    fetch("/api/subscription/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(d?.invoices ?? []))
      .finally(() => setLoadingInvoices(false));
  }, [sub?.active]);

  const initials = email ? email.slice(0, 2).toUpperCase() : "??";

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount);

  const openBillingPortal = async () => {
    setPortalLoading(true);
    const res = await fetch("/api/billing-portal", { method: "POST" });
    const data = await res.json();
    setPortalLoading(false);
    if (data.url) window.location.href = data.url;
  };

  const handleChangePassword = async () => {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/login`,
    });
    if (!error) setPasswordSent(true);
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    const res = await fetch("/api/delete-account", { method: "DELETE" });
    if (res.ok) {
      await supabase.auth.signOut();
      router.push("/");
    } else {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      alert("Failed to delete account. Please try again.");
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    const res = await fetch("/api/subscription/cancel", { method: "POST" });
    const data = await res.json();
    setCancelling(false);
    if (res.ok && data.success) {
      setShowRetention(false);
      setRetentionStep("initial");
      // Refresh sub data
      fetch("/api/subscription/detail").then((r) => r.json()).then((d) => setSub(d));
    } else {
      alert(data.error || "Failed to cancel. Please try again.");
    }
  };

  const statusLabel = (status: string) => {
    if (status === "active") return { text: "Active", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" };
    if (status === "trialing") return { text: "Trial", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
    return { text: "Inactive", color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" };
  };

  const calUrl = `https://cal.com/charlie-coleman-at4pzd/30min?overlayCalendar=true${email ? `&email=${encodeURIComponent(email)}` : ""}`;
  const planId = sub?.plan_id ?? "starter";
  const lostFeatures = PLAN_FEATURES_LOST[planId] ?? PLAN_FEATURES_LOST.starter;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 28 }}>
        Account
      </h1>

      {/* Profile */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #4f46e5, #0f172a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{email}</div>
            {createdAt && (
              <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>
                Member since {formatDate(createdAt)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Overview */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: 28, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 16 }}>
          Subscription
        </div>

        {loadingSub ? (
          <div style={{ fontSize: 14, color: "#9CA3AF" }}>Loading…</div>
        ) : sub && (sub.status === "active" || sub.status === "trialing") ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
                    {sub.is_legacy ? "Legacy Plan" : `Volcity ${PLAN_NAMES[sub.plan_id ?? ""] ?? ""}`}
                  </span>
                  {sub.is_legacy && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>
                      Grandfathered
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>
                  {sub.billing_period === "annual" ? "Annual billing" : "Monthly billing"}
                  {sub.amount != null && ` · $${sub.amount.toFixed(2)}`}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusLabel(sub.status).color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: statusLabel(sub.status).color }}>
                  {statusLabel(sub.status).text}
                </span>
              </div>
            </div>

            {sub.cancel_at_period_end ? (
              <div style={{ padding: "10px 14px", background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, color: "#DC2626", fontWeight: 500, marginBottom: 14 }}>
                Your subscription will end on {formatDate(sub.current_period_end)}. You'll keep access until then.
              </div>
            ) : (
              <>
                {sub.current_period_end && (
                  <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>
                    Next billing: <strong style={{ color: "#374151" }}>{formatDate(sub.current_period_end)}</strong>
                  </div>
                )}
                {sub.trial_end && sub.status === "trialing" && (
                  <div style={{ fontSize: 13, color: "#D97706", fontWeight: 500, marginBottom: 4 }}>
                    Trial ends: {formatDate(sub.trial_end)}
                  </div>
                )}
              </>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <a
                href="/dashboard/account/subscription"
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#0f172a", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", textDecoration: "none", display: "inline-block" }}
              >
                {sub.plan_id === "empire" ? "Manage Plan" : "Upgrade Plan"}
              </a>
              <button
                onClick={openBillingPortal}
                disabled={portalLoading}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", opacity: portalLoading ? 0.6 : 1 }}
              >
                {portalLoading ? "Opening…" : "Manage Subscription"}
              </button>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>
            No active subscription.{" "}
            <a href="/dashboard" style={{ color: "#0f172a", textDecoration: "none", fontWeight: 500 }}>
              Publish your store
            </a>{" "}
            to get started.
          </p>
        )}
      </div>

      {/* Payment Method */}
      {sub?.active && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: 28, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 16 }}>
            Payment Method
          </div>
          <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 14, lineHeight: 1.6 }}>
            Manage your payment method and update billing details via the Stripe portal.
          </p>
          <button
            onClick={openBillingPortal}
            disabled={portalLoading}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", opacity: portalLoading ? 0.6 : 1 }}
          >
            {portalLoading ? "Opening…" : "Update Payment Method"}
          </button>
        </div>
      )}

      {/* Billing History */}
      {sub?.active && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: 28, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 16 }}>
            Billing History
          </div>
          {loadingInvoices ? (
            <div style={{ fontSize: 14, color: "#9CA3AF" }}>Loading invoices…</div>
          ) : invoices.length === 0 ? (
            <div style={{ fontSize: 14, color: "#6B7280" }}>No invoices yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {invoices.slice(0, 5).map((inv) => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                      {formatAmount(inv.amount, inv.currency)}
                    </div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{formatDate(inv.date)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {inv.pdf_url && (
                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#0f172a", fontWeight: 500, textDecoration: "none" }}>
                        PDF
                      </a>
                    )}
                    {inv.hosted_url && (
                      <a href={inv.hosted_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#0f172a", fontWeight: 500, textDecoration: "none" }}>
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {invoices.length > 5 && (
            <button
              onClick={openBillingPortal}
              style={{ marginTop: 12, fontSize: 13, fontWeight: 500, color: "#374151", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
            >
              View all invoices
            </button>
          )}
        </div>
      )}

      {/* Account Actions */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: 28, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 16 }}>
          Account Actions
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={handleChangePassword}
            disabled={passwordSent}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: passwordSent ? "default" : "pointer", opacity: passwordSent ? 0.7 : 1 }}
          >
            {passwordSent ? "Reset email sent ✓" : "Change Password"}
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #FECACA", background: "#FFF5F5", fontSize: 13, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      {sub?.active && !sub.cancel_at_period_end && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #FECACA", padding: 28, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#EF4444", marginBottom: 16 }}>
            Danger Zone
          </div>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 14 }}>
            Cancelling keeps your access until the end of your current billing period.
          </p>
          <button
            onClick={() => { setShowRetention(true); setRetentionStep("initial"); }}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #FECACA", background: "#FFF5F5", fontSize: 13, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}
          >
            Cancel Subscription
          </button>
        </div>
      )}

      {/* Onboarding Reset (dev only) */}
      {isDebug && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px dashed #D1D5DB", padding: 28, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 10 }}>
            Dev — Onboarding Reset
          </div>
          <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 14, lineHeight: 1.6 }}>
            Clear all onboarding tooltip localStorage keys to re-trigger the guided tour.
            {onbReset && <strong style={{ color: "#16A34A" }}> Reset done — refresh the builder.</strong>}
          </p>
          <button
            onClick={() => { ONB_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} }); setOnbReset(true); }}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#F9FAFB", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}
          >
            Reset Onboarding Tooltips
          </button>
        </div>
      )}

      {/* Retention Modal */}
      {showRetention && (
        <div
          onClick={() => !cancelling && (setShowRetention(false), setRetentionStep("initial"))}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 460, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}
          >
            {retentionStep === "initial" ? (
              <>
                <div style={{ fontSize: 28, marginBottom: 10 }}>👋</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 12 }}>
                  Wait, before you go — let us help you!
                </h2>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, marginBottom: 24 }}>
                  We'd love to understand what's not working and see if we can help. Book a quick 30-minute call with our team — we'll get you sorted. Or if you're sure, you can still cancel below.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <a
                    href={calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", textAlign: "center", padding: "12px 0", borderRadius: 10, background: "#0f172a", fontSize: 15, fontWeight: 600, color: "#fff", textDecoration: "none" }}
                  >
                    📅 Book a Support Call
                  </a>
                  <button
                    onClick={() => setRetentionStep("confirm")}
                    style={{ padding: "10px 0", borderRadius: 10, border: "1px solid #D1D5DB", background: "#fff", fontSize: 14, fontWeight: 500, color: "#6B7280", cursor: "pointer" }}
                  >
                    I still want to cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 12 }}>
                  Are you sure?
                </h2>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 10 }}>
                  Your subscription will end on <strong style={{ color: "#374151" }}>{formatDate(sub?.current_period_end ?? null)}</strong>. After that, you'll lose access to:
                </p>
                <ul style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.8, paddingLeft: 20, marginBottom: 20 }}>
                  {lostFeatures.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => { setShowRetention(false); setRetentionStep("initial"); }}
                    disabled={cancelling}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer" }}
                  >
                    Keep My Plan
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#DC2626", fontSize: 14, fontWeight: 600, color: "#fff", cursor: cancelling ? "default" : "pointer", opacity: cancelling ? 0.7 : 1 }}
                  >
                    {cancelling ? "Cancelling…" : "Cancel Subscription"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          onClick={() => !deleteLoading && setShowDeleteModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 440, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 12 }}>
              Delete your account?
            </h2>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, marginBottom: 16 }}>
              This will permanently delete:
            </p>
            <ul style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.8, paddingLeft: 20, marginBottom: 24 }}>
              <li>All your projects and stores</li>
              <li>Your order history</li>
              <li>Your subscription</li>
            </ul>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#DC2626", marginBottom: 24 }}>
              This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#DC2626", fontSize: 14, fontWeight: 600, color: "#fff", cursor: deleteLoading ? "default" : "pointer", opacity: deleteLoading ? 0.7 : 1 }}
              >
                {deleteLoading ? "Deleting…" : "Yes, delete my account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
