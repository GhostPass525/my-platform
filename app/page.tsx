"use client";

import { useState } from "react";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setResult("");

    const count = Number(localStorage.getItem("ip_count") || 0);

    const res = await fetch("/api/idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, count }),
    });

    const data = await res.json();
    setResult(data.result);

    if (!data.locked) {
      localStorage.setItem("ip_count", String(count + 1));
    }

    setLoading(false);
  };

  return (
    <main>
      <h1>What do you want to build?</h1>
      <input
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Enter your idea"
      />
      <button onClick={handleSubmit} disabled={loading}>
        Get Started
      </button>
      <p>{result}</p>
    </main>
  );
}
