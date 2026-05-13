import Link from "next/link";

export default function NotFound() {
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

        {/* 404 number */}
        <div
          style={{
            fontSize: "clamp(72px, 16vw, 120px)",
            fontWeight: 800,
            lineHeight: 1,
            background: "linear-gradient(135deg, #2563EB, #4338CA)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: 20,
            letterSpacing: "-4px",
          }}
        >
          404
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
          Page not found
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "#64748B",
            lineHeight: 1.6,
            marginBottom: 36,
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            style={{
              height: 44,
              padding: "0 24px",
              borderRadius: 8,
              background: "#2563EB",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
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
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
