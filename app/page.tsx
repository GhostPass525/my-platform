'use client';

import React, { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState('');

  const handleNext = () => {
    if (step === 0 && answer.trim() === '') return;
    setStep(step + 1);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center p-8">
      {step === 0 && (
        <>
          <h1 className="text-3xl mb-4">What do you want to build?</h1>
          <input
            type="text"
            placeholder="Describe your idea..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="p-2 mb-4 border rounded w-80 text-lg"
          />
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg"
          >
            Next
          </button>
        </>
      )}
      {step === 1 && (
        <h2 className="text-2xl">Amazing! You want to build: "{answer}"</h2>
      )}
    </main>
  );
}
