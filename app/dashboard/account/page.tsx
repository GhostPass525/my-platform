"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type SubData = {
  active: boolean;
  status: string;
  trial_end: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [sub, setSub] = useState<SubData | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setEmail(user.email ?? "");
      setCreatedAt(user.created_at ?? null);
    });

    fetch("/api/subscription")
      .then((r) => r.json())
      .then((d) => setSub(d))
      .finally(() => setLoadingSub(false));
  }, []);

  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : "??";

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

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

  const statusLabel = (status: string) => {
    if (status === "active") return { text: "Active", color: "#16A34A" };
    if (status === "trialing") return { text: "Trial", color: "#D97706" };
    return { text: "Inactive", color: "#6B7280" };
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 28 }}>
        Account
      </h1>

      {/* Profile */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "linear-gradient(135deg, #4f46e5, #0f172a)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 700, flexShrink: 0,
          }}>
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

      {/* Subscription */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: 28, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 16 }}>
          Subscription
        </div>

        {loadingSub ? (
          <div style={{ fontSize: 14, color: "#9CA3AF" }}>Loading…</div>
        ) : sub && (sub.status === "active" || sub.status === "trialing") ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>Volcity</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusLabel(sub.status).color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: statusLabel(sub.status).color }}>
                  {statusLabel(sub.status).text}
                </span>
              </div>
            </div>

            {sub.current_period_end && (
              <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>
                Next billing date: <strong style={{ color: "#374151" }}>{formatDate(sub.current_period_end)}</strong>
              </div>
            )}
            {sub.trial_end && sub.status === "trialing" && (
              <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>
                Trial ends: <strong style={{ color: "#374151" }}>{formatDate(sub.trial_end)}</strong>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
              <button
                onClick={openBillingPortal}
                disabled={portalLoading}
                style={{
                  padding: "9px 18px", borderRadius: 8, border: "1px solid #D1D5DB",
                  background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151",
                  cursor: "pointer", opacity: portalLoading ? 0.6 : 1,
                }}
              >
                {portalLoading ? "Opening…" : "Manage Subscription"}
              </button>
              <button
                onClick={openBillingPortal}
                disabled={portalLoading}
                style={{
                  padding: "9px 18px", borderRadius: 8, border: "1px solid #FECACA",
                  background: "#FFF5F5", fontSize: 13, fontWeight: 600, color: "#DC2626",
                  cursor: "pointer", opacity: portalLoading ? 0.6 : 1,
                }}
              >
                Cancel Plan
              </button>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>
            You don&apos;t have an active subscription.{" "}
            <a href="/dashboard" style={{ color: "#0f172a", textDecoration: "none", fontWeight: 500 }}>
              Publish your store
            </a>{" "}
            to get started.
          </p>
        )}
      </div>

      {/* Account Actions */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 16 }}>
          Account Actions
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={handleChangePassword}
            disabled={passwordSent}
            style={{
              padding: "9px 18px", borderRadius: 8, border: "1px solid #D1D5DB",
              background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151",
              cursor: passwordSent ? "default" : "pointer",
              opacity: passwordSent ? 0.7 : 1,
            }}
          >
            {passwordSent ? "Reset email sent ✓" : "Change Password"}
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              padding: "9px 18px", borderRadius: 8, border: "1px solid #FECACA",
              background: "#FFF5F5", fontSize: 13, fontWeight: 600, color: "#DC2626",
              cursor: "pointer",
            }}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div
          onClick={() => !deleteLoading && setShowDeleteModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 16, padding: 32,
              maxWidth: 440, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
            }}
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
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8,
                  border: "1px solid #D1D5DB", background: "#fff",
                  fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8,
                  border: "none", background: "#DC2626",
                  fontSize: 14, fontWeight: 600, color: "#fff",
                  cursor: deleteLoading ? "default" : "pointer",
                  opacity: deleteLoading ? 0.7 : 1,
                }}
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
