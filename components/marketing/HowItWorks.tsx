'use client';

export default function HowItWorks() {
  const steps = [
    {
      num: '01',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      title: 'Describe your business',
      desc: 'Tell Volcity what you want to sell — in plain English. It asks smart questions to shape your brand.',
      visual: (
        <div style={{ marginTop: 20, background: 'rgba(37,99,235,0.06)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(37,99,235,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #4338CA)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, margin: '0 0 4px' }}>Volcity AI</p>
              <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5 }}>What makes your candles unique? Scents, packaging, or a personal story?</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10, flexDirection: 'row-reverse' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5 }}>Hand-poured with botanical ingredients...</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: '02',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
      title: 'Watch it get built',
      desc: 'Your store, products, copy, and payment setup appear in under 3 minutes. No code. No dragging.',
      visual: (
        <div style={{ marginTop: 20 }}>
          <div style={{ background: '#F8F9FA', borderRadius: 10, padding: '10px 14px', border: '1px solid #E5E7EB', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>Building your store...</span>
              <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}>87%</span>
            </div>
            <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '87%', background: 'linear-gradient(90deg, #2563EB, #4338CA)', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
          {['Brand identity', 'Product catalog', 'Payment setup'].map((s) => (
            <div key={s} style={{ fontSize: 12, color: '#6B7280', padding: '3px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{s}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      num: '03',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
        </svg>
      ),
      title: 'Launch and grow',
      desc: 'Connect your domain, start marketing with AI-guided playbooks, and get your first sale.',
      visual: (
        <div style={{ marginTop: 20, background: '#F0FDF4', borderRadius: 12, padding: '14px 16px', border: '1px solid #BBF7D0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#15803D', fontWeight: 600 }}>Revenue this week</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#15803D' }}>$248</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36 }}>
            {[20, 35, 28, 55, 42, 70, 85].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 6 ? '#16A34A' : '#86EFAC', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#6B7280', margin: '6px 0 0', textAlign: 'right' }}>↑ 34% vs last week</p>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" style={{ padding: 'clamp(64px, 8vw, 100px) 24px', background: '#F8FAFC' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 14px' }}>
            From idea to launched business<br />in 3 steps
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20 }}>
          {steps.map((step) => (
            <div key={step.num} style={{
              background: '#fff', borderRadius: 20, padding: '28px 28px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(37,99,235,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={{
                  fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em',
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(67,56,202,0.15))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  color: '#2563EB',
                }}>{step.num}</span>
                <span style={{ color: '#2563EB', display: 'flex', alignItems: 'center' }}>{step.icon}</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
              {step.visual}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
