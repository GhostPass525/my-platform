export default function TermsPage() {
  return (
    <main style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif", color: "#1A1A1A" }}>
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(245,244,240,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #EBEBEB",
          padding: "0 32px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#1A1A1A", letterSpacing: "-0.3px" }}>Volcity</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/auth/login" style={{ fontSize: 14, fontWeight: 500, color: "#6B7280", textDecoration: "none" }}>
            Sign in
          </a>
          <a
            href="/auth/signup"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: "#2563EB",
              padding: "8px 18px",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Get started free
          </a>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────────── */}
      <section style={{ background: "#F5F4F0", padding: "64px 24px 80px" }}>
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #EBEBEB",
            padding: "48px 56px",
            boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                display: "inline-block",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: "#2563EB",
                marginBottom: 12,
              }}
            >
              Legal
            </div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: "-0.6px",
                color: "#1A1A1A",
                margin: "0 0 12px",
              }}
            >
              Terms of Service
            </h1>
            <p style={{ fontSize: 14, color: "#9CA3AF", margin: 0 }}>
              Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

          {/* Intro */}
          <p style={{ fontSize: 16, color: "#374151", lineHeight: 1.7, marginBottom: 40 }}>
            Volcity is a SaaS platform that helps users build and launch online businesses. By accessing or using Volcity, you agree to the following terms. Please read them carefully.
          </p>

          <div style={{ display: "flex", flexDirection: "column" as const, gap: 36 }}>
            {/* Section 1 */}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginBottom: 12, letterSpacing: "-0.2px" }}>
                1. Subscription &amp; Billing
              </h2>
              <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                Volcity offers a free trial period. After your free trial ends, your account will be charged <strong>$14.99/month</strong> unless you cancel before the trial period expires. Subscriptions renew automatically each month. You can cancel at any time from your account settings.
              </p>
            </div>

            {/* Section 2 */}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginBottom: 12, letterSpacing: "-0.2px" }}>
                2. Acceptable Use
              </h2>
              <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                You agree not to use Volcity for any illegal activities, including but not limited to fraud, money laundering, selling prohibited goods or services, or any activity that violates applicable local, state, or federal laws. We reserve the right to suspend or terminate accounts engaged in illegal activity without notice.
              </p>
            </div>

            {/* Section 3 */}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginBottom: 12, letterSpacing: "-0.2px" }}>
                3. Your Content
              </h2>
              <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                You are solely responsible for all content you publish on your store through Volcity, including product descriptions, images, and pricing. You represent that you have all necessary rights to publish such content and that it does not infringe on any third-party rights.
              </p>
            </div>

            {/* Section 4 */}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginBottom: 12, letterSpacing: "-0.2px" }}>
                4. Account Termination
              </h2>
              <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                Volcity reserves the right to suspend or permanently terminate any account that violates these Terms of Service. Decisions regarding termination are made at our sole discretion. You may also delete your account at any time from your account settings.
              </p>
            </div>

            {/* Section 5 */}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginBottom: 12, letterSpacing: "-0.2px" }}>
                5. Disclaimer of Warranties
              </h2>
              <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                Volcity is provided <strong>&ldquo;as-is&rdquo;</strong> without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the platform will be error-free or uninterrupted.
              </p>
            </div>

            {/* Section 6 */}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginBottom: 12, letterSpacing: "-0.2px" }}>
                6. Limitation of Liability
              </h2>
              <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                Volcity is not liable for any lost revenue, lost profits, or business outcomes arising from your use of the platform. In no event shall our total liability to you exceed the amounts you paid to us in the three months preceding the claim.
              </p>
            </div>

            {/* Section 7 */}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginBottom: 12, letterSpacing: "-0.2px" }}>
                7. Governing Law
              </h2>
              <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                These Terms are governed by and construed in accordance with the laws of <strong>[your state]</strong>, without regard to its conflict of law provisions.
              </p>
            </div>

            {/* Section 8 */}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A", marginBottom: 12, letterSpacing: "-0.2px" }}>
                8. Contact
              </h2>
              <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: 0 }}>
                If you have any questions about these Terms, please contact us at{" "}
                <a href="mailto:[your email]" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>
                  [your email]
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid #EBEBEB",
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap" as const,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span style={{ fontSize: 13, color: "#6B7280" }}>© {new Date().getFullYear()} Volcity</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Contact", href: "#" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{
                fontSize: 13,
                color: label === "Terms" ? "#2563EB" : "#9CA3AF",
                textDecoration: "none",
                fontWeight: label === "Terms" ? 500 : 400,
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </footer>
    </main>
  );
}
