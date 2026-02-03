"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/idea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea: input,
        }),
      });

      const data = await res.json();
      setResponse(data.result || "Something went wrong.");
    } catch (error) {
      setResponse("Error generating response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold mb-4">
        What do you want to build?
      </h1>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Describe your idea…"
        className="w-full max-w-md px-4 py-3 border rounded-lg mb-4"
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`px-6 py-3 rounded-lg font-medium transition ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-black text-white hover:opacity-80"
        }`}
      >
        {loading ? "Thinking…" : "Get Started"}
      </button>

      {response && (
        <div className="mt-8 max-w-xl text-left whitespace-pre-line">
          {response}
        </div>
      )}
    </main>
  );
}
