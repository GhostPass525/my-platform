"use client";

type Order = {
  total: number;
  customer_email: string;
  order_items?: { product_name: string }[];
};

type Props = {
  order: Order;
  brandName: string;
  onTalkToMentor: () => void;
  onClose: () => void;
};

export default function FirstSaleCelebration({ order, brandName, onTalkToMentor, onClose }: Props) {
  const amount = `$${Number(order.total).toFixed(2)}`;
  const productName = order.order_items?.[0]?.product_name;
  const customerLabel = order.customer_email
    ? order.customer_email.split("@")[0]
    : "Someone";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(2, 6, 23, 0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "fadeIn 0.2s ease-out both",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 22,
          boxShadow: "0 32px 64px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)",
          overflow: "hidden",
          animation: "launchSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient top bar */}
        <div
          style={{
            height: 3,
            background: "linear-gradient(90deg, #22c55e, #2563eb)",
          }}
        />

        <div style={{ padding: "26px 26px 22px" }}>
          {/* Icon + badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              🎉
            </div>
            <div>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#0f172a",
                  margin: "0 0 2px",
                  letterSpacing: "-0.01em",
                }}
              >
                You made your first sale!
              </p>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                {brandName ? `${brandName} just made money.` : "Your store just made money."}
              </p>
            </div>
          </div>

          {/* Order summary card */}
          <div
            style={{
              background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
              border: "1px solid #bbf7d0",
              borderRadius: 14,
              padding: "14px 16px",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <p style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, margin: "0 0 3px" }}>
                  {customerLabel} just bought
                </p>
                <p style={{ fontSize: 14, color: "#0f172a", fontWeight: 600, margin: 0 }}>
                  {productName || "your product"}
                </p>
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#16a34a",
                  letterSpacing: "-0.025em",
                  flexShrink: 0,
                }}
              >
                {amount}
              </div>
            </div>
          </div>

          {/* Mentor message */}
          <div
            style={{
              display: "flex",
              gap: 10,
              padding: "12px 14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>
              This is just the beginning. Let&apos;s talk about getting your next 10 sales.
            </p>
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 9 }}>
            <button
              onClick={onTalkToMentor}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 11,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Talk to your mentor
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 11,
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#64748b",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.color = "#0f172a";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.color = "#64748b";
              }}
            >
              Keep going
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes launchSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
