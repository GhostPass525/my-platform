export default function SocialProof() {
  return (
    <section style={{
      borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0',
      background: '#FAFBFF', padding: '20px 24px',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '12px 32px' }}>
        <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, textAlign: 'center' }}>
          Trusted by first-time founders building real businesses
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 1 }}>
            {'⭐⭐⭐⭐⭐'.split('').filter(Boolean).map((s, i) => (
              <span key={i} style={{ fontSize: 14 }}>{s}</span>
            ))}
          </div>
          <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>4.9/5</span>
          <span style={{ fontSize: 13, color: '#94A3B8' }}>· 200+ founders launching</span>
        </div>
      </div>
    </section>
  );
}
