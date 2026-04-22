'use client';

const features = [
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    title: 'AI Mentor',
    desc: 'Get a business coach in your pocket. Ask anything, 24/7.',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    title: 'Store Builder',
    desc: 'Beautiful stores designed around your brand in minutes.',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    title: 'Stripe Payments',
    desc: 'Accept money the moment you launch. No setup headaches.',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    title: 'Products & Fulfillment',
    desc: 'Printful integration means products ship themselves.',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    title: 'Marketing Playbooks',
    desc: 'AI-generated content, ad copy, and launch plans.',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    title: 'Business Insights',
    desc: "See what's working. Fix what isn't. All in one place.",
  },
];

export default function Features() {
  return (
    <section style={{ padding: 'clamp(64px, 8vw, 100px) 24px', background: '#fff' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
            Everything you need.<br />Nothing you don't.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: '#fff', border: '1px solid #E2E8F0',
                borderRadius: 20, padding: '28px 28px',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(37,99,235,0.1)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(37,99,235,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#2563EB', marginBottom: 16,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
