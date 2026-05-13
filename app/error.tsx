"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAFAF9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #2563EB, #4338CA)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>
            Volcity
          </span>
        </Link>

        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#FEF2F2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: "clamp(20px, 4vw, 26px)",
            fontWeight: 700,
            color: "#0F172A",
            marginBottom: 12,
            letterSpacing: "-0.3px",
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "#64748B",
            lineHeight: 1.6,
            marginBottom: 36,
          }}
        >
          An unexpected error occurred. Try refreshing the page — if it keeps
          happening, reach out and we&apos;ll fix it fast.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{
              height: 44,
              padding: "0 24px",
              borderRadius: 8,
              background: "#2563EB",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            style={{
              height: 44,
              padding: "0 24px",
              borderRadius: 8,
              background: "#fff",
              color: "#374151",
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid #E5E7EB",
            }}
          >
            Go to dashboard
          </Link>
        </div>

        {error.digest && (
          <p style={{ marginTop: 24, fontSize: 12, color: "#94A3B8" }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
