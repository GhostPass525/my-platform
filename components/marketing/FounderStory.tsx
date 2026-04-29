export default function FounderStory() {
  return (
    <section style={{ padding: 'clamp(64px, 8vw, 100px) 24px', background: '#F8F9FB' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 40, height: 1, background: '#E2E8F0' }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A3B8' }}>
            Why I built this
          </span>
        </div>

        <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 32px', lineHeight: 1.2 }}>
          I tried to start 7 businesses before I figured it out.
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[
            "I built Shopify stores that never made a sale. I bought courses that taught me HOW but not WHAT. I watched gurus on TikTok promise easy money — and deliver nothing.",
            "The problem wasn't me. It wasn't the tools. It was that no one was answering the actual question: \"What should I sell?\"",
            "So I built Volcity. The AI co-founder I wish I had when I started. Something that doesn't just hand you templates — it actually thinks through the business with you.",
          ].map((text, i) => (
            <p key={i} style={{ fontSize: 'clamp(16px, 2vw, 18px)', color: '#475569', lineHeight: 1.75, margin: 0 }}>
              {text}
            </p>
          ))}
        </div>

        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #0f172a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 18, fontWeight: 700, flexShrink: 0,
          }}>
            C
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Conner</div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>Founder, Volcity</div>
          </div>
        </div>
      </div>
    </section>
  );
}
