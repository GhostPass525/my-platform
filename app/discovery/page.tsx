"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string };

type Idea = {
  name: string;
  tagline: string;
  target: string;
  products: { name: string; price: number }[];
  positioning: string;
  whyFits: string;
};

type Phase = "chat" | "synthesis" | "confirm";

const OPENING = "Before we build anything — let's make sure we build the RIGHT thing. Tell me: what's something you find yourself caring about way more than most people do?";

function DiscoveryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seed = searchParams.get("seed");

  const [phase, setPhase] = useState<Phase>("chat");
  const [messages, setMessages] = useState<Message[]>(() => {
    // If seeded from /start, skip the opening question and treat seed as first user message
    if (seed) {
      return [{ role: "user", content: decodeURIComponent(seed) }];
    }
    return [{ role: "assistant", content: OPENING }];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [readyToSynthesize, setReadyToSynthesize] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState(0);
  const [confirmedIdea, setConfirmedIdea] = useState<Idea | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // If seeded from /start, auto-send the seed as first user message to get mentor's first response
  useEffect(() => {
    if (!seed) return;
    const seedText = decodeURIComponent(seed);
    const initialMessages: Message[] = [{ role: "user", content: seedText }];
    setLoading(true);
    fetch("/api/discovery/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: initialMessages }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.reply) {
          setMessages([
            { role: "user", content: seedText },
            { role: "assistant", content: data.reply },
          ]);
          if (data.readyToSynthesize) setReadyToSynthesize(true);
        }
      })
      .catch(() => {
        // If auto-send fails, fall back to showing the opening question
        setMessages([{ role: "assistant", content: OPENING }]);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/discovery/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        if (data.readyToSynthesize) setReadyToSynthesize(true);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const runSynthesis = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/discovery/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ideas && data.ideas.length > 0) {
        setIdeas(data.ideas);
        setPhase("synthesis");
        setSelectedIdeaIndex(0);
      } else {
        setError("Couldn't generate ideas. Please continue the conversation.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const refineIdea = async (idea: Idea) => {
    // Go back to chat with a refine prompt
    setPhase("chat");
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: `Let's refine "${idea.name}". What would you change or improve about this idea?` },
    ]);
  };

  const regenerate = async () => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Show me 3 completely different ideas." },
    ]);
    setPhase("chat");
    setLoading(true);
    setError("");
    try {
      const updated: Message[] = [
        ...messages,
        { role: "user", content: "Show me 3 completely different ideas." },
      ];
      const res = await fetch("/api/discovery/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ideas && data.ideas.length > 0) {
        setIdeas(data.ideas);
        setPhase("synthesis");
        setSelectedIdeaIndex(0);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const pickIdea = (idea: Idea) => {
    setConfirmedIdea(idea);
    setPhase("confirm");
  };

  const buildBusiness = async () => {
    if (!confirmedIdea || completing) return;
    setCompleting(true);
    setError("");
    try {
      const res = await fetch("/api/discovery/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: confirmedIdea, messages }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.projectId) {
        // Pre-fill the builder with the idea description
        const ideaDescription = encodeURIComponent(
          `Build me a store called "${confirmedIdea.name}" — ${confirmedIdea.tagline}. Target customer: ${confirmedIdea.target}. Initial products: ${confirmedIdea.products.map((p) => `${p.name} at $${p.price}`).join(", ")}. ${confirmedIdea.positioning}`
        );
        router.push(`/builder?project=${data.projectId}&idea=${ideaDescription}`);
      } else {
        setError("Something went wrong. Try again.");
        setCompleting(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setCompleting(false);
    }
  };

  if (phase === "confirm" && confirmedIdea) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#fafaf9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}>
        <div style={{
          maxWidth: 480,
          width: "100%",
          background: "white",
          borderRadius: 20,
          border: "1px solid #e7e5e4",
          padding: "48px 40px",
          textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56,
            background: "#0f172a",
            borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0c0a09", marginBottom: 10, lineHeight: 1.2 }}>
            Perfect. Let&apos;s build {confirmedIdea.name}.
          </h1>
          <p style={{ fontSize: 15, color: "#57534e", lineHeight: 1.65, marginBottom: 8 }}>
            {confirmedIdea.tagline}
          </p>
          <p style={{ fontSize: 14, color: "#a8a29e", lineHeight: 1.6, marginBottom: 32 }}>
            I&apos;ll set up the brand, generate {confirmedIdea.products.length} products, and write your copy. This takes about 90 seconds.
          </p>
          {error && (
            <p style={{ fontSize: 13, color: "#dc2626", marginBottom: 16 }}>{error}</p>
          )}
          <button
            onClick={buildBusiness}
            disabled={completing}
            style={{
              width: "100%",
              padding: "14px 24px",
              background: completing ? "#d6d3d1" : "#0f172a",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: completing ? "not-allowed" : "pointer",
              marginBottom: 12,
              transition: "opacity 0.15s",
            }}
          >
            {completing ? "Building your business…" : "Build my business"}
          </button>
          <button
            onClick={() => setPhase("synthesis")}
            disabled={completing}
            style={{
              width: "100%",
              padding: "12px 24px",
              background: "transparent",
              color: "#78716c",
              border: "1px solid #e7e5e4",
              borderRadius: 12,
              fontSize: 14,
              cursor: completing ? "not-allowed" : "pointer",
            }}
          >
            Not quite right? Adjust
          </button>
        </div>
      </div>
    );
  }

  if (phase === "synthesis") {
    const idea = ideas[selectedIdeaIndex];
    return (
      <div style={{
        minHeight: "100vh",
        background: "#fafaf9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px",
      }}>
        {/* Skip link */}
        <div style={{ position: "fixed", top: 20, right: 24, zIndex: 10 }}>
          <a href="/builder" style={{ fontSize: 13, color: "#a8a29e", textDecoration: "none" }}>
            skip — I know what I want →
          </a>
        </div>

        <div style={{ maxWidth: 520, width: "100%" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#a8a29e", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            Based on your answers
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0c0a09", marginBottom: 4, lineHeight: 1.2 }}>
            Here are 3 ideas for you
          </h1>
          <p style={{ fontSize: 14, color: "#78716c", marginBottom: 32 }}>
            Each is specific to what you shared. Pick one or ask for different ideas.
          </p>

          {/* Idea card */}
          <div style={{
            background: "white",
            borderRadius: 16,
            border: "1px solid #e7e5e4",
            padding: "28px 28px 24px",
            marginBottom: 16,
          }}>
            {/* Idea navigation */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: "#a8a29e", fontWeight: 600 }}>
                Idea {selectedIdeaIndex + 1} of {ideas.length}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {ideas.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIdeaIndex(i)}
                    style={{
                      width: 8, height: 8,
                      borderRadius: "50%",
                      border: "none",
                      background: i === selectedIdeaIndex ? "#0f172a" : "#e7e5e4",
                      cursor: "pointer",
                      padding: 0,
                      transition: "background 0.15s",
                    }}
                  />
                ))}
              </div>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0c0a09", marginBottom: 4 }}>
              {idea.name}
            </h2>
            <p style={{ fontSize: 14, color: "#57534e", marginBottom: 16, lineHeight: 1.5 }}>
              {idea.tagline}
            </p>

            <div style={{ borderTop: "1px solid #f5f5f4", paddingTop: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                Target customer
              </p>
              <p style={{ fontSize: 13, color: "#0c0a09", lineHeight: 1.55 }}>
                {idea.target}
              </p>
            </div>

            <div style={{ borderTop: "1px solid #f5f5f4", paddingTop: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                Sample products
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {idea.products.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#0c0a09" }}>• {p.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0c0a09" }}>${p.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid #f5f5f4", paddingTop: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                What makes it different
              </p>
              <p style={{ fontSize: 13, color: "#0c0a09", lineHeight: 1.55 }}>
                {idea.positioning}
              </p>
            </div>

            <div style={{ background: "#fafaf9", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                Why this fits you
              </p>
              <p style={{ fontSize: 13, color: "#57534e", lineHeight: 1.55 }}>
                {idea.whyFits}
              </p>
            </div>
          </div>

          {/* Actions */}
          {error && <p style={{ fontSize: 13, color: "#dc2626", marginBottom: 12 }}>{error}</p>}
          <button
            onClick={() => pickIdea(idea)}
            style={{
              width: "100%",
              padding: "14px 24px",
              background: "#0f172a",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 10,
            }}
          >
            Pick this one
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => refineIdea(idea)}
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "transparent",
                color: "#0c0a09",
                border: "1px solid #e7e5e4",
                borderRadius: 12,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Refine this idea
            </button>
            <button
              onClick={regenerate}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "transparent",
                color: "#0c0a09",
                border: "1px solid #e7e5e4",
                borderRadius: 12,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Thinking…" : "3 different ones"}
            </button>
          </div>
          <button
            onClick={() => router.push("/builder")}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 16px",
              background: "transparent",
              color: "#a8a29e",
              border: "none",
              borderRadius: 12,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            None of these — let me describe my own
          </button>
        </div>
      </div>
    );
  }

  // Chat phase
  return (
    <div style={{
      minHeight: "100vh",
      background: "#fafaf9",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "0 24px",
    }}>
      {/* Skip link */}
      <div style={{ position: "fixed", top: 20, right: 24, zIndex: 10 }}>
        <a href="/builder" style={{ fontSize: 13, color: "#a8a29e", textDecoration: "none" }}>
          skip — I know what I want →
        </a>
      </div>

      {/* Header */}
      <div style={{ maxWidth: 560, width: "100%", paddingTop: 48, paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 36, height: 36,
            background: "#0f172a",
            borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0c0a09" }}>Volcity Mentor</div>
            <div style={{ fontSize: 12, color: "#a8a29e" }}>Business discovery</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ maxWidth: 560, width: "100%", flex: 1, display: "flex", flexDirection: "column", gap: 16, paddingBottom: 200 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            {m.role === "assistant" && (
              <div style={{
                width: 28, height: 28,
                background: "#0f172a",
                borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: 2,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
            )}
            <div style={{
              maxWidth: "82%",
              fontSize: 15,
              lineHeight: 1.65,
              color: m.role === "assistant" ? "#0c0a09" : "#374151",
              background: m.role === "user" ? "rgba(0,0,0,0.06)" : "transparent",
              padding: m.role === "user" ? "10px 14px" : "0",
              borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "0",
              whiteSpace: "pre-line",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28,
              background: "#0f172a",
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2].map((d) => (
                <span key={d} style={{
                  width: 6, height: 6,
                  borderRadius: "50%",
                  background: "#a8a29e",
                  display: "inline-block",
                  animation: `dotPulse 1.4s ease-in-out ${d * 0.16}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area — fixed at bottom */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        background: "rgba(250,250,249,0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid #e7e5e4",
        padding: "16px 24px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        <div style={{ maxWidth: 560, width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          {error && <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>}

          {readyToSynthesize && (
            <button
              onClick={runSynthesis}
              disabled={loading}
              style={{
                padding: "12px 20px",
                background: "#15803d",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                marginBottom: 4,
              }}
            >
              {loading ? "Generating ideas…" : "Show me my business ideas →"}
            </button>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your answer…"
              rows={2}
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #e7e5e4",
                fontSize: 15,
                resize: "none",
                outline: "none",
                background: "white",
                color: "#0c0a09",
                lineHeight: 1.5,
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                width: 44, height: 44,
                borderRadius: 12,
                border: "none",
                background: !input.trim() || loading ? "#e7e5e4" : "#0f172a",
                color: !input.trim() || loading ? "#a8a29e" : "white",
                cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                alignSelf: "flex-end",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          <p style={{ fontSize: 12, color: "#a8a29e", textAlign: "center", margin: 0 }}>
            {messages.filter((m) => m.role === "user").length} / 6 questions
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DiscoveryPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#fafaf9" }} />}>
      <DiscoveryPageInner />
    </Suspense>
  );
}
