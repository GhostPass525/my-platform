"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, message, email: userEmail }),
    });
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
      setMessage("");
      setType("general");
    }, 2000);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 500,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: 999,
          background: "#2563EB",
          color: "#fff",
          border: "none",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
          transition: "transform 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
          (e.currentTarget as HTMLButtonElement).style.background = "#1D4ED8";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLButtonElement).style.background = "#2563EB";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Give feedback
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={() => !submitting && setOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 16, padding: 28,
              maxWidth: 440, width: "100%",
              boxShadow: "0 24px 80px rgba(0,0,0,0.16)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
                Share your feedback
              </h2>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 20, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {success ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: 0 }}>
                  Thanks for your feedback! We read every submission and use it to make Volcity better.
                </p>
              </div>
            ) : (
              <>
                {/* Type selector */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {[
                    { value: "bug", label: "Bug" },
                    { value: "feature", label: "Feature idea" },
                    { value: "general", label: "General" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setType(value)}
                      style={{
                        padding: "5px 12px", borderRadius: 6,
                        border: `1px solid ${type === value ? "#2563EB" : "#E5E7EB"}`,
                        background: type === value ? "#EFF6FF" : "#fff",
                        color: type === value ? "#2563EB" : "#6B7280",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                  style={{
                    width: "100%", padding: "10px 12px",
                    borderRadius: 8, border: "1px solid #E5E7EB",
                    fontSize: 14, color: "#111827", resize: "vertical",
                    outline: "none", fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                <p style={{ fontSize: 12, color: "#9CA3AF", margin: "6px 0 16px" }}>
                  We&apos;ll follow up if we need more info.
                </p>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !message.trim()}
                  style={{
                    width: "100%", padding: "11px 0", borderRadius: 8,
                    border: "none", background: "#2563EB", color: "#fff",
                    fontSize: 14, fontWeight: 600,
                    cursor: submitting || !message.trim() ? "default" : "pointer",
                    opacity: submitting || !message.trim() ? 0.6 : 1,
                  }}
                >
                  {submitting ? "Submitting…" : "Submit feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
