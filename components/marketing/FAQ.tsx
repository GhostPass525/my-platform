'use client';
import { useState } from 'react';

const faqs = [
  { q: 'Do I need any technical skills?', a: 'No. If you can describe what you want, Volcity can build it.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel in one click — no retention games, no "are you sure" popups.' },
  { q: 'What do I actually own?', a: 'Everything. Your store, your customer data, your revenue — 100% yours.' },
  { q: 'How is this different from Shopify?', a: 'Shopify assumes you know what you\'re selling. Volcity helps you figure that out AND builds the store around it.' },
  { q: 'How is this different from other AI website builders?', a: 'They build a website. We build a business — payments, products, marketing, and mentorship included.' },
  { q: 'What payment methods can I accept?', a: 'Cards, Apple Pay, Google Pay, Link — anything Stripe supports.' },
  { q: 'Can I use my own domain?', a: 'Yes. Connect any domain you own in a couple clicks.' },
  { q: 'What if I get stuck?', a: 'Your AI mentor is built for exactly that. Ask anything, anytime.' },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" style={{ padding: 'clamp(64px, 8vw, 100px) 24px', background: '#F8F7FF' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: 0 }}>
            Questions, answered
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                background: '#fff', borderRadius: 14,
                border: `1px solid ${open === i ? 'rgba(99,102,241,0.25)' : '#E5E7EB'}`,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
                boxShadow: open === i ? '0 4px 16px rgba(99,102,241,0.08)' : 'none',
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: '100%', padding: '18px 22px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', gap: 12,
                }}
                aria-expanded={open === i}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', lineHeight: 1.4 }}>{faq.q}</span>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: open === i ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#F1F5F9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.2s, transform 0.2s',
                  transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={open === i ? '#fff' : '#64748B'} strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </span>
              </button>
              {open === i && (
                <div style={{ padding: '0 22px 18px', animation: 'slideUp 0.2s ease-out both' }}>
                  <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
