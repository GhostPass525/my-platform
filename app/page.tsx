"use client";

import { useState } from "react";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });

      const data = await res.json();
      setResult(data.result || data.error);
    } catch (err) {
      setResult("Something went wrong.");
    }

    setLoading(false);
  };

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>What do you want to build?</h1>

      <input
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Describe your business idea"
        style={{ padding: 10, width: 300 }}
      />

      <br /><br />

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Thinking..." : "Get Started"}
      </button>

      {result && (
        <p style={{ marginTop: 20 }}>
          <strong>Result:</strong> {result}
        </p>
      )}
    </main>
  );
}
