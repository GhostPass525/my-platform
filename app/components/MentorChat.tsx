"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

type Props = {
  /** The mentor's opening line — shown immediately, no API call needed */
  openingMessage: string;
  brandName: string;
  stage?: string;
  niche?: string;
  recentActions?: string[];
  onClose: () => void;
};

const STAGE_SUGGESTIONS: Record<string, string[]> = {
  launch: [
    "What's my first move to get sales?",
    "Help me make a TikTok about my store",
    "How do I find my first customers?",
  ],
  "first sale": [
    "How do I get my next 10 sales?",
    "Should I run ads yet?",
    "How do I find affiliates for my store?",
  ],
  growing: [
    "What's my highest leverage move right now?",
    "How do I build a content strategy?",
    "When should I start paid ads?",
  ],
};

function getStageSuggestions(stage: string): string[] {
  const s = stage.toLowerCase();
  for (const key of Object.keys(STAGE_SUGGESTIONS)) {
    if (s.includes(key)) return STAGE_SUGGESTIONS[key];
  }
  return [];
}

export default function MentorChat({ openingMessage, brandName, stage = "Launch", niche, recentActions, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: openingMessage },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated,
          mentorContext: {
            brandName: brandName || undefined,
            stage,
            niche: niche || undefined,
            recentActions: recentActions?.length ? recentActions : undefined,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data?.result || "Something went wrong. Try again." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        padding: "0 24px 24px",
        pointerEvents: "none",
      }}
    >
      {/* Backdrop — click to close */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 6, 23, 0.35)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          pointerEvents: "all",
          animation: "fadeIn 0.2s ease-out both",
        }}
        onClick={onClose}
      />

      {/* Chat panel */}
      <div
        data-mentor-chat
        style={{
          position: "relative",
          pointerEvents: "all",
          width: "100%",
          maxWidth: 380,
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 24px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "mentorSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
          maxHeight: "70vh",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "#0f172a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Your Mentor
            </p>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{brandName || "Volcity"}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              transition: "all 0.15s",
            }}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                animation: "fadeIn 0.15s ease-out both",
              }}
            >
              <div
                style={{
                  maxWidth: "88%",
                  padding: "10px 14px",
                  borderRadius:
                    m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: m.role === "user" ? "#1e40af" : "#334155",
                  background: m.role === "user" ? "#eff6ff" : "#f8fafc",
                  border: m.role === "user"
                    ? "1px solid #bfdbfe"
                    : "1px solid #e2e8f0",
                  whiteSpace: "pre-line",
                }}
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* Stage-based suggestion pills — only show when no user message yet */}
          {messages.length === 1 && getStageSuggestions(stage).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              {getStageSuggestions(stage).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    setTimeout(() => {
                      setInput("");
                      const userMsg: Message = { role: "user", content: suggestion };
                      const updated = [messages[0], userMsg];
                      setMessages(updated);
                      setLoading(true);
                      fetch("/api/idea", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          messages: updated,
                          mentorContext: {
                            brandName: brandName || undefined,
                            stage,
                            niche: niche || undefined,
                            recentActions: recentActions?.length ? recentActions : undefined,
                          },
                        }),
                      })
                        .then((r) => r.json().catch(() => ({})))
                        .then((data) => {
                          setMessages((prev) => [
                            ...prev,
                            { role: "assistant", content: data?.result || "Something went wrong. Try again." },
                          ]);
                        })
                        .catch(() => {
                          setMessages((prev) => [
                            ...prev,
                            { role: "assistant", content: "Something went wrong. Try again." },
                          ]);
                        })
                        .finally(() => setLoading(false));
                    }, 0);
                  }}
                  style={{
                    textAlign: "left",
                    padding: "9px 14px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#334155",
                    fontSize: 15,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    lineHeight: 1.4,
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = "#0f172a";
                    (e.target as HTMLButtonElement).style.color = "#1e40af";
                    (e.target as HTMLButtonElement).style.background = "#eff6ff";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = "#e2e8f0";
                    (e.target as HTMLButtonElement).style.color = "#334155";
                    (e.target as HTMLButtonElement).style.background = "#f8fafc";
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", gap: 4, padding: "4px 4px" }}>
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#cbd5e1",
                    display: "inline-block",
                    animation: `dotPulse 1.4s ease-in-out ${d * 0.16}s infinite`,
                  }}
                />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: "10px 12px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Reply…"
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: 15,
              outline: "none",
              background: "#f8fafc",
              color: "#0f172a",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#0f172a")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: loading || !input.trim() ? "#f1f5f9" : "#0f172a",
              color: loading || !input.trim() ? "#94a3b8" : "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || !input.trim() ? "default" : "pointer",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes mentorSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
