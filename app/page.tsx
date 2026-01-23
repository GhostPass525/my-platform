"use client";

import { useState } from "react";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  const handleSubmit = async () => {
    if (!idea) return;

    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, count }),
      });

      const data = await res.json();
      setResult(data.result || data.error);
      setCount((c) => c + 1);
    } catch (err) {
      setResult("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 600, width: "100%" }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>
          What do you want to build?
        </h1>

        <p style={{ color: "#666", marginBottom: 20 }}>
          You don’t need a perfect idea. Just describe what you’re thinking.
        </p>

        <input
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="e.g. gym clothing brand, ai agency, supplement company"
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            marginBottom: 12,
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: "10px 18px",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          {loading ? "Thinking..." : "Get Started"}
        </button>

        {result && (
          <div
            style={{
              marginTop: 30,
              whiteSpace: "pre-line",
              lineHeight: 1.6,
            }}
          >
            {result}
          </div>
        )}
      </div>
    </main>
  );
}
