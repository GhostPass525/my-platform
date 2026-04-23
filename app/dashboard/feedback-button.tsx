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
          padding: "9px 16px",
          borderRadius: 999,
          background: "#0f172a",
          color: "#fff",
          border: "none",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(15,23,42,0.25)",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#1e293b";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#0f172a";
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Give feedback
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={() => !submitting && setOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(12,10,9,0.4)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 20, padding: 32,
              maxWidth: 440, width: "100%",
              boxShadow: "0 20px 60px rgba(12,10,9,0.16)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#0c0a09", margin: 0, letterSpacing: "-0.01em" }}>
                Share your feedback
              </h2>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#a8a29e", fontSize: 20, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {success ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
                <p style={{ fontSize: 14, color: "#57534e", lineHeight: 1.6, margin: 0 }}>
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
                        border: `1px solid ${type === value ? "#0f172a" : "#e7e5e4"}`,
                        background: type === value ? "#0f172a" : "#fff",
                        color: type === value ? "#fff" : "#78716c",
                        fontSize: 12, fontWeight: 500, cursor: "pointer",
                        transition: "all 0.15s",
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
                    borderRadius: 8, border: "1px solid #e7e5e4",
                    fontSize: 14, color: "#0c0a09", resize: "vertical",
                    outline: "none", fontFamily: "inherit",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0f172a"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e7e5e4"; }}
                />
                <p style={{ fontSize: 12, color: "#a8a29e", margin: "6px 0 16px" }}>
                  We&apos;ll follow up if we need more info.
                </p>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !message.trim()}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 8,
                    border: "none", background: "#0f172a", color: "#fff",
                    fontSize: 14, fontWeight: 500,
                    cursor: submitting || !message.trim() ? "default" : "pointer",
                    opacity: submitting || !message.trim() ? 0.4 : 1,
                    transition: "opacity 0.15s",
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
