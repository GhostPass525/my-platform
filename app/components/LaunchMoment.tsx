"use client";

import { useState, useEffect, useCallback } from "react";

type SiteSpec = {
  brandName: string;
  tagline?: string;
  products?: { id: string; name: string; price: string }[];
  logoDataUrl?: string;
  audience?: string;
  offer?: string;
  firstProductOrService?: string;
  theme?: { accent: string; [key: string]: string };
};

type Props = {
  storeUrl: string;
  site: SiteSpec;
  projectCreatedAt: string | null;
  onContinue: () => void;
};

export default function LaunchMoment({ storeUrl, site, projectCreatedAt, onContinue }: Props) {
  const [copied, setCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [launchKit, setLaunchKit] = useState<{ instagramCaption: string; firstMove: string } | null>(null);
  const [loadingKit, setLoadingKit] = useState(true);

  const daysBuilding = projectCreatedAt
    ? Math.max(1, Math.ceil((Date.now() - new Date(projectCreatedAt).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const productCount = site.products?.length ?? 0;
  const accent = site.theme?.accent ?? "#2563eb";

  useEffect(() => {
    fetch("/api/launch-kit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site }),
    })
      .then((r) => r.json())
      .then((d) => setLaunchKit(d))
      .catch(() => setLaunchKit({ instagramCaption: "", firstMove: "" }))
      .finally(() => setLoadingKit(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyUrl = useCallback(() => {
    navigator.clipboard.writeText(storeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [storeUrl]);

  const copyCaption = useCallback(() => {
    if (!launchKit?.instagramCaption) return;
    navigator.clipboard.writeText(launchKit.instagramCaption).then(() => {
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    });
  }, [launchKit]);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: `${site.brandName} is live!`, url: storeUrl }).catch(() => {});
    } else {
      copyUrl();
    }
  };

  const skeletonStyle: React.CSSProperties = {
    borderRadius: 8,
    background: "linear-gradient(90deg, #f1f5f9 25%, #e9eef5 50%, #f1f5f9 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.6s ease-in-out infinite",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(2, 6, 23, 0.82)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        animation: "fadeIn 0.25s ease-out both",
        padding: "16px",
      }}
    >
      {/* Ambient glow behind card */}
      <div
        style={{
          position: "absolute",
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}22 0%, transparent 68%)`,
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          background: "#ffffff",
          borderRadius: 24,
          boxShadow: "0 40px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)",
          overflow: "hidden",
          animation: "launchSlideUp 0.42s cubic-bezier(0.16, 1, 0.3, 1) both",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        {/* Top accent line */}
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

        <div style={{ padding: "28px 28px 24px" }}>

          {/* Live badge */}
          <div style={{ marginBottom: 18 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 100,
                padding: "4px 11px",
                fontSize: 11,
                fontWeight: 700,
                color: "#16a34a",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#22c55e",
                  display: "inline-block",
                  animation: "livePulse 2s ease-in-out infinite",
                }}
              />
              Live
            </span>
          </div>

          {/* Store name hero */}
          <h1
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
              marginBottom: 6,
            }}
          >
            {site.brandName}
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 22, lineHeight: 1.5 }}>
            Your business is live. The world can find you now.
          </p>

          {/* Live URL row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 11,
              padding: "9px 12px",
              marginBottom: 20,
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 12,
                color: "#475569",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {storeUrl}
            </span>
            <button
              onClick={copyUrl}
              style={{
                flexShrink: 0,
                padding: "4px 11px",
                borderRadius: 7,
                border: "1px solid #e2e8f0",
                background: copied ? "#f0fdf4" : "#fff",
                color: copied ? "#16a34a" : "#475569",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flexShrink: 0,
                padding: "4px 11px",
                borderRadius: 7,
                border: `1px solid ${accent}44`,
                background: `${accent}08`,
                color: accent,
                fontSize: 11,
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              View ↗
            </a>
          </div>

          {/* Recap */}
          <div
            style={{
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              border: "1px solid #e2e8f0",
              borderRadius: 13,
              padding: "14px 16px",
              marginBottom: 22,
            }}
          >
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65, margin: 0 }}>
              You built a brand
              {productCount > 0 && (
                <>, created{" "}
                  <strong style={{ color: "#0f172a" }}>
                    {productCount} product{productCount !== 1 ? "s" : ""}
                  </strong>
                </>
              )}
              , and launched
              {daysBuilding ? (
                <> in{" "}
                  <strong style={{ color: "#0f172a" }}>
                    {daysBuilding} day{daysBuilding !== 1 ? "s" : ""}
                  </strong>
                </>
              ) : " today"}
              . Most people never get here.
            </p>
          </div>

          {/* Launch Kit */}
          <div style={{ marginBottom: 24 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#94a3b8",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Launch Kit
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>

              {/* Brand mark */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 13px",
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                }}
              >
                {site.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={site.logoDataUrl}
                    alt="Logo"
                    style={{ width: 30, height: 30, objectFit: "contain", borderRadius: 6, flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {site.brandName?.[0]?.toUpperCase() ?? "B"}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", margin: 0 }}>Brand Mark</p>
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: "1px 0 0" }}>Your logo & visual identity</p>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    background: "#f0fdf4",
                    borderRadius: 6,
                    color: "#16a34a",
                    fontWeight: 600,
                    border: "1px solid #bbf7d0",
                  }}
                >
                  Ready
                </span>
              </div>

              {/* Instagram caption */}
              <div
                style={{
                  padding: "11px 13px",
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: loadingKit ? 8 : 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        background: "linear-gradient(135deg, #f59e0b 0%, #ec4899 55%, #8b5cf6 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle cx="17.5" cy="6.5" r="0.8" fill="white" stroke="none" />
                      </svg>
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", margin: 0 }}>Instagram Caption</p>
                  </div>
                  <button
                    onClick={copyCaption}
                    disabled={loadingKit || !launchKit?.instagramCaption}
                    style={{
                      fontSize: 10,
                      padding: "3px 9px",
                      background: captionCopied ? "#f0fdf4" : "#f8fafc",
                      border: `1px solid ${captionCopied ? "#bbf7d0" : "#e2e8f0"}`,
                      borderRadius: 6,
                      color: captionCopied ? "#16a34a" : "#64748b",
                      fontWeight: 600,
                      cursor: loadingKit ? "default" : "pointer",
                      transition: "all 0.15s",
                      opacity: loadingKit ? 0.5 : 1,
                    }}
                  >
                    {captionCopied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                {loadingKit ? (
                  <div style={{ ...skeletonStyle, height: 36 }} />
                ) : (
                  <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                    {launchKit?.instagramCaption || "Your personalized caption will appear here."}
                  </p>
                )}
              </div>

              {/* First move */}
              <div
                style={{
                  padding: "11px 13px",
                  background: `${accent}06`,
                  border: `1px solid ${accent}28`,
                  borderRadius: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", margin: 0 }}>Your First Move</p>
                </div>
                {loadingKit ? (
                  <div style={{ ...skeletonStyle, height: 32 }} />
                ) : (
                  <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                    {launchKit?.firstMove || "Share your store link with 5 people you trust today."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 9 }}>
            <button
              onClick={handleShare}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 11,
                border: "none",
                background: accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "opacity 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share Store
            </button>
            <button
              onClick={onContinue}
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
              Continue Building
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes launchSlideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
