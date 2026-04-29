"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function StartPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "build" ? "build" : "discover";

  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
      // Delay autofocus until animations settle
      setTimeout(() => inputRef.current?.focus(), 700);
    }, 50);
    return () => clearTimeout(t);
  }, []);

  const config =
    mode === "build"
      ? {
          question: "What are you building?",
          placeholder: "I want to build...",
          secondaryLabel: "Not sure yet? Help me figure it out →",
          secondaryHref: "/start",
        }
      : {
          question: "What are you passionate about?",
          placeholder: "Music, cooking, fitness, design...",
          secondaryLabel: "I already know what I'm building →",
          secondaryHref: "/start?mode=build",
        };

  async function submit() {
    const text = input.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      // Save to sessionStorage for post-signup continuation
      const storageKey = mode === "build" ? "volcity_initial_intent" : "volcity_discovery_seed";
      sessionStorage.setItem(storageKey, text);
      sessionStorage.setItem("volcity_flow_mode", mode);

      // Check auth state
      const res = await fetch("/api/auth/check");
      const { loggedIn, hasProject } = await res.json().catch(() => ({ loggedIn: false, hasProject: false }));

      if (!loggedIn) {
        const returnUrl = `/start/continue?mode=${mode}`;
        router.push(`/auth/signup?return=${encodeURIComponent(returnUrl)}`);
        return;
      }

      // Already has projects — they're a returning user
      if (hasProject) {
        router.push("/dashboard");
        return;
      }

      if (mode === "build") {
        const createRes = await fetch("/api/projects/create-from-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: text }),
        });
        const data = await createRes.json().catch(() => ({}));
        if (data.projectId) {
          router.push(`/builder?project=${data.projectId}&idea=${encodeURIComponent(text)}`);
        } else {
          setError("Something went wrong. Try again.");
          setSubmitting(false);
        }
      } else {
        router.push(`/discovery?seed=${encodeURIComponent(text)}`);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0c0a09",
        color: "#fafaf9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: "clamp(80px, 18vh, 160px)",
        paddingLeft: 24,
        paddingRight: 24,
        paddingBottom: 48,
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Ambient background glow */}
      <div className="bg-aura" aria-hidden="true" />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 600,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
            transitionDelay: "0ms",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "linear-gradient(135deg, #6366f1, #334155)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "#fafaf9" }}>
            Volcity
          </span>
        </div>

        {/* Question */}
        <h1
          key={config.question}
          style={{
            fontSize: "clamp(28px, 6vw, 40px)",
            fontWeight: 500,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            textAlign: "center",
            color: "#fafaf9",
            margin: 0,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
            transitionDelay: "200ms",
          }}
        >
          {config.question}
        </h1>

        {/* Input */}
        <div
          style={{
            width: "100%",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
            transitionDelay: "400ms",
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            style={{ position: "relative" }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={config.placeholder}
              disabled={submitting}
              autoComplete="off"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: "20px 64px 20px 24px",
                fontSize: 18,
                color: "#fafaf9",
                outline: "none",
                transition: "border-color 0.2s, background 0.2s",
                boxSizing: "border-box",
                opacity: submitting ? 0.5 : 1,
                fontFamily: "inherit",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || submitting}
              aria-label="Send"
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "none",
                background: !input.trim() || submitting ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)",
                color: !input.trim() || submitting ? "rgba(255,255,255,0.3)" : "#fafaf9",
                cursor: !input.trim() || submitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (input.trim() && !submitting) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                }
              }}
              onMouseLeave={(e) => {
                if (input.trim() && !submitting) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                }
              }}
            >
              {submitting ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </form>
          {error && (
            <p style={{ fontSize: 13, color: "#f87171", marginTop: 8, textAlign: "center" }}>{error}</p>
          )}
        </div>

        {/* Secondary link */}
        <a
          href={config.secondaryHref}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#78716c",
            textDecoration: "none",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.6s ease-out, transform 0.6s ease-out, color 0.15s",
            transitionDelay: "600ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#a8a29e")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#78716c")}
        >
          {config.secondaryLabel}
        </a>

        {/* Already have an account link */}
        <a
          href="/auth/login"
          style={{
            fontSize: 12,
            color: "#57534e",
            textDecoration: "none",
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.6s ease-out, color 0.15s",
            transitionDelay: "800ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#78716c")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#57534e")}
        >
          Already have an account? Sign in
        </a>
      </div>

      <style>{`
        input::placeholder { color: #57534e; }
        input::-webkit-input-placeholder { color: #57534e; }
        @media (prefers-reduced-motion: reduce) {
          * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0c0a09" }} />
    }>
      <StartPageInner />
    </Suspense>
  );
}
