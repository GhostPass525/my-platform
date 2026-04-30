'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const PROMPTS = [
  'I want to sell handmade candles...',
  'I want to launch a fitness coaching service...',
  'I want to start a bamboo clothing brand...',
  'I want to sell digital illustration prints...',
];

function DemoInput() {
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase] = useState<'typing' | 'generating' | 'clearing'>('typing');
  const [promptIndex, setPromptIndex] = useState(0);
  const [dots, setDots] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useRef(true);
  const router = useRouter();

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { isVisible.current = e.isIntersecting; }, { threshold: 0.1 });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (phase === 'typing') {
      const target = PROMPTS[promptIndex];
      if (displayText.length < target.length) {
        const t = setTimeout(() => {
          if (isVisible.current) setDisplayText(target.slice(0, displayText.length + 1));
        }, 42);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase('generating'), 900);
        return () => clearTimeout(t);
      }
    }
    if (phase === 'generating') {
      const t = setTimeout(() => setPhase('clearing'), 2200);
      return () => clearTimeout(t);
    }
    if (phase === 'clearing') {
      const t = setTimeout(() => {
        setDisplayText('');
        setPromptIndex((i) => (i + 1) % PROMPTS.length);
        setPhase('typing');
      }, 400);
      return () => clearTimeout(t);
    }
  }, [phase, displayText, promptIndex]);

  useEffect(() => {
    if (phase !== 'generating') return;
    const t = setInterval(() => setDots((d) => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, [phase]);

  const isGenerating = phase === 'generating';

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 560, margin: '0 auto', position: 'relative' }}>
      <div style={{
        background: isGenerating ? 'rgba(37,99,235,0.06)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        border: `1.5px solid ${isGenerating ? 'rgba(37,99,235,0.3)' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: 16,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: isGenerating ? '0 0 0 4px rgba(37,99,235,0.1), 0 8px 32px rgba(37,99,235,0.12)' : '0 8px 32px rgba(0,0,0,0.08)',
        transition: 'all 0.4s ease',
        cursor: 'text',
      }}>
        <span style={{ flexShrink: 0, color: isGenerating ? '#2563EB' : '#94A3B8', display: 'flex', alignItems: 'center' }}>
          {isGenerating ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          )}
        </span>
        <span style={{
          flex: 1, fontSize: 15, color: isGenerating ? '#2563EB' : '#374151',
          fontWeight: isGenerating ? 500 : 400,
          minHeight: 22, display: 'flex', alignItems: 'center',
          transition: 'color 0.3s',
        }}>
          {isGenerating
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ animation: 'spinSlow 1s linear infinite', display: 'inline-flex' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                </span>
                <span>Generating your business{dots}</span>
              </span>
            : <span>
                {displayText}
                <span style={{
                  display: 'inline-block', width: 2, height: 18, background: '#2563EB',
                  marginLeft: 1, verticalAlign: 'middle',
                  animation: 'cursorBlink 1s ease-in-out infinite',
                  borderRadius: 1,
                }} />
              </span>
          }
        </span>
        <button
          onClick={() => router.push('/auth/signup')}
          style={{
            width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
            background: 'linear-gradient(135deg, #2563EB, #4338CA)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          aria-label="Start building"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
      <style>{`
        @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spinSlow { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function Hero() {
  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(180deg, #F0F4FF 0%, #FFFFFF 60%)',
      paddingTop: 120, paddingBottom: 80,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center',
    }}>
      {/* Background orbs - hidden on mobile via CSS */}
      <div className="hero-orbs" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%)', animation: 'orbDrift 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '0%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(67,56,202,0.08) 0%, transparent 70%)', animation: 'orbDrift 10s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', bottom: '-5%', left: '35%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,78,216,0.06) 0%, transparent 70%)', animation: 'orbDrift 12s ease-in-out infinite' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 720, padding: '0 20px' }}>
        {/* Eyebrow */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 50, padding: '6px 14px', marginBottom: 28 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#2563EB' }}>Your AI co-founder for your first business</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(38px, 7vw, 72px)', fontWeight: 800, color: '#0F172A',
          lineHeight: 1.05, letterSpacing: '-0.04em', margin: '0 0 20px',
        }}>
          Stop guessing.<br />
          Start building.<br />
          <span style={{ background: 'linear-gradient(135deg, #2563EB 0%, #4338CA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            With AI by your side.
          </span>
        </h1>

        {/* Subhead */}
        <p style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', color: '#475569', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.65, fontWeight: 400 }}>
          Stop staring at blank Shopify templates. Volcity&apos;s AI helps you figure out what to sell, builds your store, and guides you to your first sale.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Link href="/auth/signup" style={{
            fontSize: 17, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg, #2563EB, #4338CA)',
            padding: '16px 36px', borderRadius: 50, textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
            display: 'inline-block',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}>
            Start free — 7 days on us
          </Link>
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#2563EB', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            See how it works <span>→</span>
          </button>
        </div>

        {/* Trust micro-copy */}
        <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 52 }}>
          No credit card required · Cancel anytime
        </p>

        {/* Demo input */}
        <DemoInput />
      </div>

      <style>{`
        @keyframes orbDrift { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(20px,30px) scale(1.05);} }
        @media (max-width: 767px) { .hero-orbs { display: none !important; } }
      `}</style>
    </section>
  );
}
