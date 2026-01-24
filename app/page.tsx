"use client";

import { useState } from "react";

export default function Page() {
  const [idea, setIdea] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"initial" | "followup">("initial");

  async function submitIdea(context?: string) {
    setLoading(true);

    try {
      const res = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          context,
        }),
      });

      const data = await res.json();
      setResult(data);
      setStep("followup");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 700, margin: "60px auto", padding: 20 }}>
      <h1>What do you want to build?</h1>
      <p>You don’t need a perfect idea. Just describe what you’re thinking.</p>

      {step === "initial" && (
        <>
          <input
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. a gym clothing brand"
            style={{ width: "100%", padding: 12, marginBottom: 12 }}
          />
          <button onClick={() => submitIdea()} disabled={loading}>
            {loading ? "Thinking..." : "Get Started"}
          </button>
        </>
      )}

      {result && (
        <>
          <div style={{ marginTop: 40 }}>
            {result.hook?.recognition && <p>{result.hook.recognition}</p>}
            {result.hook?.insight && <p>{result.hook.insight}</p>}
            {result.hook?.momentum && <p>{result.hook.momentum}</p>}

            <h3>Business Snapshot</h3>
            <p><strong>Type:</strong> {result.snapshot?.businessType}</p>
            <p><strong>Edge:</strong> {result.snapshot?.edge}</p>
            <p><strong>Main Risk:</strong> {result.snapshot?.risk}</p>

            <h3>Your First Moves</h3>
            <ul>
              {result.actionPlan?.map((step: string, i: number) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 40 }}>
            <h3>Want to refine this?</h3>
            <p>Add constraints, goals, or what you’re unsure about.</p>

            <input
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              placeholder="e.g. I only have $500 and want this to feel premium"
              style={{ width: "100%", padding: 12, marginBottom: 12 }}
            />

            <button onClick={() => submitIdea(followUp)} disabled={loading}>
              {loading ? "Refining..." : "Continue"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
