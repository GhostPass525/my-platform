'use client';

import React, { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (step === 0 && idea.trim() === '') return;

    setLoading(true);
    setStep(1);

    try {
      const res = await fetch('/api/idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      setOutput(data.output);
    } catch (err) {
      setOutput('Error generating idea. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center p-8">
      {step === 0 && (
        <>
          <h1 className="text-3xl mb-4">What do you want to build?</h1>
          <input
            type="text"
            placeholder="Describe your idea..."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            className="p-2 mb-4 border rounded w-80 text-lg"
          />
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg"
          >
            Get AI Plan
          </button>
        </>
      )}
      {step === 1 && (
        <div className="max-w-2xl text-left p-4 border rounded shadow mt-4">
          {loading ? <p>Generating your AI business plan...</p> : <pre>{output}</pre>}
        </div>
      )}
    </main>
  );
}
