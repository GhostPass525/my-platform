"use client";

import { useState } from "react";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function handleSubmit() {
    setLoading(true);
    setData(null);

    const res = await fetch("/api/idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea }),
    });

    const result = await res.json();
    setData(result);
    setLoading(false);
  }

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">
        What do you want to build?
      </h1>
      <p className="text-gray-600 mb-6">
        You don’t need a perfect idea. Just describe what you’re thinking.
      </p>

      <input
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="e.g. a gym clothing brand"
        className="w-full p-3 border rounded mb-4"
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-black text-white px-6 py-3 rounded"
      >
        {loading ? "Thinking..." : "Get Started"}
      </button>

      {data && (
        <div className="mt-10 space-y-6">
          <div>
            <p className="font-semibold">{data.hook.recognition}</p>
            <p>{data.hook.insight}</p>
            <p className="italic">{data.hook.momentum}</p>
          </div>

          <div>
            <h2 className="font-bold">Business Snapshot</h2>
            <ul className="list-disc ml-6">
              <li><strong>Type:</strong> {data.snapshot.businessType}</li>
              <li><strong>Edge:</strong> {data.snapshot.edge}</li>
              <li><strong>Main Risk:</strong> {data.snapshot.risk}</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold">Your First Moves</h2>
            <ol className="list-decimal ml-6">
              {data.actionPlan.map((step: string, i: number) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </main>
  );
}
