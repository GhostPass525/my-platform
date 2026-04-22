import Link from 'next/link';

const includes = [
  'AI mentor (unlimited)',
  'AI store generation',
  'Stripe payments',
  'Printful products',
  'Custom domain',
  'Marketing playbooks',
  'Analytics dashboard',
  'Cancel anytime',
];

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ZapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

export default function Pricing() {
  return (
    <section id="pricing" style={{ padding: 'clamp(64px, 8vw, 100px) 24px', background: '#fff' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
          One plan. Everything included.
        </h2>
        <p style={{ fontSize: 17, color: '#64748B', margin: '0 0 52px' }}>
          No upsells. No locked features. Start free for 7 days.
        </p>

        <div style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #2563EB, #4338CA)',
          borderRadius: 26, padding: 2,
          maxWidth: 480, width: '100%',
        }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: '40px 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24, color: '#2563EB' }}>
              <ZapIcon />
              <span style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>Volcity Pro</span>
            </div>

            <div style={{ marginBottom: 28 }}>
              <span style={{ fontSize: 54, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.05em', lineHeight: 1 }}>$14.98</span>
              <span style={{ fontSize: 16, color: '#94A3B8', marginLeft: 4 }}>/month</span>
            </div>

            <Link href="/auth/signup" style={{
              display: 'block', width: '100%', textAlign: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff',
              background: 'linear-gradient(135deg, #2563EB, #4338CA)',
              padding: '15px 0', borderRadius: 50, textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
              marginBottom: 28,
            }}>
              Start 7-day free trial
            </Link>

            <div style={{ textAlign: 'left' }}>
              {includes.map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckIcon />
                  </span>
                  <span style={{ fontSize: 14, color: '#374151' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 20 }}>
          Questions about pricing?{' '}
          <a href="#faq" style={{ color: '#2563EB', fontWeight: 500, textDecoration: 'none' }}>Read our FAQ below.</a>
        </p>
      </div>
    </section>
  );
}
