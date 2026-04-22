const testimonials = [
  {
    quote: "I'd tried Shopify twice and quit both times. Volcity got me to my first sale in 9 days.",
    name: 'Maya R.',
    business: 'Bamboo clothing founder',
    initials: 'MR',
    color: '#2563EB',
  },
  {
    quote: "I had an idea for three years but no clue how to start. Volcity walked me through everything and built my store while I answered questions.",
    name: 'James K.',
    business: 'Digital print seller',
    initials: 'JK',
    color: '#1D4ED8',
  },
  {
    quote: "The AI mentor is the part I didn't know I needed. It's like having a co-founder who actually knows business.",
    name: 'Priya S.',
    business: 'Wellness coaching',
    initials: 'PS',
    color: '#0369A1',
  },
];

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export default function Testimonials() {
  return (
    <section style={{ padding: 'clamp(64px, 8vw, 100px) 24px', background: '#F8FAFC' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
            Founders launching their first businesses, faster
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16 }}>
          {testimonials.map((t) => (
            <div key={t.name} style={{
              background: '#fff', borderRadius: 20, padding: '28px 28px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                {[0,1,2,3,4].map(i => <StarIcon key={i} />)}
              </div>
              <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic' }}>
                "{t.quote}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: t.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff',
                }}>
                  {t.initials}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{t.business}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
