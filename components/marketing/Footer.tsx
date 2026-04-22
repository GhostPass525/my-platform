'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ background: '#0F172A', color: '#94A3B8', padding: 'clamp(48px, 6vw, 72px) 24px 32px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '32px 40px', marginBottom: 48 }}>
          {/* Col 1: Logo + tagline */}
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #2563EB, #4338CA)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Volcity</span>
            </Link>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 16px', color: '#64748B' }}>
              The AI mentor for first-time founders.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'X / Twitter', href: '#', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.261 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                { label: 'TikTok', href: '#', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.93a8.16 8.16 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z"/></svg> },
                { label: 'Instagram', href: '#', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
              ].map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label} style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#64748B', textDecoration: 'none',
                  transition: 'background 0.15s, color 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.2)'; (e.currentTarget as HTMLElement).style.color = '#93C5FD'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Product */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>Product</p>
            {[['How it works', '#how-it-works'], ['Pricing', '#pricing'], ['FAQ', '#faq']].map(([label, href]) => (
              <a key={label} href={href} style={{ display: 'block', fontSize: 14, color: '#64748B', textDecoration: 'none', padding: '5px 0', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = '#fff'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = '#64748B'}
              >{label}</a>
            ))}
          </div>

          {/* Col 3: Company */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>Company</p>
            {[['About', '#'], ['Blog', '#'], ['Contact', '#']].map(([label, href]) => (
              <a key={label} href={href} style={{ display: 'block', fontSize: 14, color: '#64748B', textDecoration: 'none', padding: '5px 0', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = '#fff'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = '#64748B'}
              >{label}</a>
            ))}
          </div>

          {/* Col 4: Legal */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>Legal</p>
            {[['Terms', '/terms'], ['Privacy', '/privacy'], ['Refund policy', '#']].map(([label, href]) => (
              <Link key={label} href={href} style={{ display: 'block', fontSize: 14, color: '#64748B', textDecoration: 'none', padding: '5px 0', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = '#fff'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = '#64748B'}
              >{label}</Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: '#334155' }}>© 2026 Volcity · Built by founders, for founders.</span>
        </div>
      </div>
    </footer>
  );
}
