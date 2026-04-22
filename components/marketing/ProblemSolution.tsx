export default function ProblemSolution() {
  const XIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
  const CheckIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );

  return (
    <section style={{ padding: 'clamp(64px, 8vw, 100px) 24px', background: '#fff' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 16px' }}>
            Every other AI tool gives you a website.<br />
            Volcity gives you a <span style={{ background: 'linear-gradient(135deg, #2563EB, #4338CA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>business</span>.
          </h2>
          <p style={{ fontSize: 17, color: '#64748B', maxWidth: 540, margin: '0 auto', lineHeight: 1.6 }}>
            Most AI builders stop at the homepage. You're left with no payments, no products, no plan, no customers.
          </p>
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* Left — what others give */}
          <div style={{
            background: '#0F172A', borderRadius: 20, padding: '32px 36px',
            border: '1px solid #1E293B',
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 20px' }}>
              What other tools give you
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'A pretty website',
                'Zero payment setup',
                'No products to sell',
                'No marketing guidance',
                'No idea what to do next',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <XIcon />
                  </span>
                  <span style={{ fontSize: 15, color: '#94A3B8' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — what Volcity gives */}
          <div style={{
            background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #4338CA 100%)',
            borderRadius: 20, padding: '32px 36px',
            boxShadow: '0 8px 32px rgba(37,99,235,0.25)',
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 20px' }}>
              What Volcity gives you
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'A complete store, instantly',
                'Stripe payments built in',
                'Products ready to fulfill',
                'AI mentor guiding you daily',
                'A real business, not a brochure',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckIcon />
                  </span>
                  <span style={{ fontSize: 15, color: '#fff', fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
