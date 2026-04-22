'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          transition: 'background 0.2s, box-shadow 0.2s, backdrop-filter 0.2s',
          background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.06)' : 'none',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #2563EB, #4338CA)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.03em' }}>Volcity</span>
        </Link>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto' }} className="hide-mobile">
          {[['How it works', 'how-it-works'], ['Pricing', 'pricing'], ['FAQ', 'faq']].map(([label, id]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 14px', borderRadius: 8,
                fontSize: 14, fontWeight: 500, color: '#475569',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#0F172A'; (e.target as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = '#475569'; (e.target as HTMLElement).style.background = 'none'; }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Desktop right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }} className="hide-mobile">
          <Link href="/auth/login" style={{ fontSize: 14, fontWeight: 500, color: '#475569', textDecoration: 'none', padding: '6px 12px' }}>
            Log in
          </Link>
          <Link href="/auth/signup" style={{
            fontSize: 14, fontWeight: 600, color: '#fff',
            background: 'linear-gradient(135deg, #2563EB, #4338CA)',
            padding: '8px 20px', borderRadius: 50, textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            transition: 'opacity 0.15s, box-shadow 0.15s',
            display: 'inline-block',
          }}>
            Start free trial
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', padding: 6, color: '#0F172A' }}
          className="show-mobile"
          aria-label="Open menu"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
      </nav>

      {/* Mobile full-screen menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          animation: 'fadeIn 0.15s ease-out',
        }}>
          {[['How it works', 'how-it-works'], ['Pricing', 'pricing'], ['FAQ', 'faq']].map(([label, id]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 22, fontWeight: 600, color: '#0F172A', padding: '12px 32px',
              }}
            >{label}</button>
          ))}
          <div style={{ width: 1, height: 32 }} />
          <Link href="/auth/login" onClick={() => setMenuOpen(false)} style={{ fontSize: 18, color: '#64748B', textDecoration: 'none', padding: '10px 32px' }}>
            Log in
          </Link>
          <Link href="/auth/signup" onClick={() => setMenuOpen(false)} style={{
            fontSize: 16, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg, #2563EB, #4338CA)',
            padding: '14px 36px', borderRadius: 50, textDecoration: 'none',
            marginTop: 8,
          }}>
            Start free trial
          </Link>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) { .hide-mobile { display: flex !important; } .show-mobile { display: none !important; } }
        @media (max-width: 767px) { .hide-mobile { display: none !important; } .show-mobile { display: flex !important; } }
      `}</style>
    </>
  );
}
