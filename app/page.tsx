import React, { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");

  const handleNext = () => {
    if (step === 0 && answer.trim() === "") return; // prevent empty
    setStep(step + 1);
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem' }}>
      {step === 0 && (
        <>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>What do you want to build?</h1>
          <input
            type="text"
            placeholder="Describe your idea..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            style={{ padding: '1rem', fontSize: '1rem', width: '300px', marginBottom: '1rem' }}
          />
          <button
            onClick={handleNext}
            style={{ padding: '1rem 2rem', fontSize: '1rem', backgroundColor: '#4f46e5', color: 'white', borderRadius: '8px', cursor: 'pointer' }}
          >
            Next
          </button>
        </>
      )}
      {step === 1 && (
        <h2 style={{ fontSize: '2rem' }}>Amazing! You want to build: "{answer}"</h2>
      )}
    </main>
  );
}
