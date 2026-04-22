import Link from 'next/link';

export default function FinalCTA() {
  return (
    <section style={{
      padding: 'clamp(80px, 10vw, 120px) 24px',
      background: 'linear-gradient(135deg, #0F172A 0%, #0F2A5E 40%, #1E3A8A 70%, #0F172A 100%)',
      position: 'relative', overflow: 'hidden', textAlign: 'center',
    }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '15%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(67,56,202,0.15) 0%, transparent 70%)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{
          fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, color: '#fff',
          letterSpacing: '-0.04em', lineHeight: 1.08, margin: '0 0 20px',
        }}>
          Your first business is<br />
          <span style={{ background: 'linear-gradient(135deg, #93C5FD, #BFDBFE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            10 minutes away.
          </span>
        </h2>

        <p style={{ fontSize: 18, color: 'rgba(203,213,225,0.85)', margin: '0 0 40px', lineHeight: 1.6 }}>
          Stop reading landing pages. Start building.
        </p>

        <Link href="/auth/signup" style={{
          display: 'inline-block',
          fontSize: 18, fontWeight: 700, color: '#0F172A',
          background: '#fff',
          padding: '18px 44px', borderRadius: 50, textDecoration: 'none',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}>
          Start free — no credit card
        </Link>

        <p style={{ fontSize: 14, color: 'rgba(148,163,184,0.8)', marginTop: 20 }}>
          Join founders launching businesses with Volcity.
        </p>
      </div>
    </section>
  );
}
