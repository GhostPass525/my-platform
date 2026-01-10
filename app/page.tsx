import React from 'react';

export default function Home() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Welcome to Your AI Business Partner</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        Start your online business in minutes. Answer a few questions, and we’ll create your first store.
      </p>
      <button style={{ padding: '1rem 2rem', fontSize: '1rem', backgroundColor: '#4f46e5', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>
        Get Started
      </button>
    </main>
  );
}
