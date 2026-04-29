'use client';

import { useState } from 'react';

type Plan = {
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  annualSavings: number;
  popular?: boolean;
  tier: string;
  cta: string;
  features: string[];
};

const plans: Plan[] = [
  {
    name: 'Starter',
    tagline: 'Everything you need to launch your first business',
    monthlyPrice: 19,
    annualPrice: 190,
    annualSavings: 38,
    tier: 'starter',
    cta: 'Start Building',
    features: [
      '1 store',
      'AI mentor chat (full access)',
      'Proactive AI check-ins',
      'Discovery flow (find your idea)',
      'Store builder + all templates',
      'Stripe payments',
      'Printful integration',
      'Unlimited orders',
      'Email support',
    ],
  },
  {
    name: 'Founder',
    tagline: 'For builders who are growing',
    monthlyPrice: 39,
    annualPrice: 390,
    annualSavings: 78,
    popular: true,
    tier: 'founder',
    cta: 'Become a Founder',
    features: [
      'Everything in Starter, plus:',
      '3 stores',
      'Custom domain',
      'Analytics dashboard',
      'AI image generation',
      'Marketing content generator',
      'Email automation',
      'A/B testing tools',
      'Launch day plan generator',
      'Priority support',
    ],
  },
  {
    name: 'Empire',
    tagline: 'For serial builders',
    monthlyPrice: 99,
    annualPrice: 990,
    annualSavings: 198,
    tier: 'empire',
    cta: 'Go Empire',
    features: [
      'Everything in Founder, plus:',
      'Unlimited stores',
      'Marketplace access (coming soon)',
      'Business valuations',
      'Competitor teardown',
      '1-on-1 AI strategy sessions',
      'White-label option',
      'API access',
      'Dedicated success manager',
    ],
  },
];

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function Pricing() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  return (
    <section id="pricing" style={{ padding: 'clamp(64px, 8vw, 100px) 24px', background: '#F8F9FB' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
            Choose your plan
          </h2>
          <p style={{ fontSize: 17, color: '#64748B', margin: '0 0 28px' }}>
            Start with a 7-day free trial. No credit card required.
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#E2E8F0', borderRadius: 50, padding: 4 }}>
            {(['monthly', 'annual'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setBilling(period)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 50,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: billing === period ? '#fff' : 'transparent',
                  color: billing === period ? '#0F172A' : '#64748B',
                  boxShadow: billing === period ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {period === 'monthly' ? 'Monthly' : (
                  <>Annual <span style={{ color: '#6366f1', marginLeft: 4, fontWeight: 600 }}>Save 17%</span></>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          alignItems: 'stretch',
        }}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.popular ? '#0F172A' : '#fff',
                borderRadius: 24,
                border: plan.popular ? '2px solid #6366f1' : '1px solid #E2E8F0',
                padding: '36px 32px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: plan.popular ? '0 24px 64px rgba(15,23,42,0.18)' : 'none',
                transform: plan.popular ? 'scale(1.03)' : 'none',
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: -13,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #6366f1, #4338CA)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '4px 14px',
                  borderRadius: 50,
                  whiteSpace: 'nowrap',
                }}>
                  ⭐ Most Popular
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>
                  {plan.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 52, fontWeight: 900, color: plan.popular ? '#fff' : '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    ${billing === 'monthly' ? plan.monthlyPrice : Math.floor(plan.annualPrice / 12)}
                  </span>
                  <span style={{ fontSize: 15, color: '#64748B' }}>/mo</span>
                </div>
                {billing === 'annual' && (
                  <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, marginBottom: 8 }}>
                    Save ${plan.annualSavings}/year
                  </div>
                )}
                <p style={{ fontSize: 14, color: plan.popular ? '#94A3B8' : '#64748B', margin: 0, lineHeight: 1.5 }}>
                  {plan.tagline}
                </p>
              </div>

              <button
                onClick={() => {
                  window.location.href = `/auth/signup?tier=${plan.tier}&billing=${billing}`;
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '13px 0',
                  borderRadius: 50,
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: 28,
                  background: plan.popular ? 'linear-gradient(135deg, #6366f1, #4338CA)' : '#0F172A',
                  color: '#fff',
                  boxShadow: plan.popular ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                {plan.cta}
              </button>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.features.map((feature) => (
                  <div key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: plan.popular ? 'rgba(99,102,241,0.2)' : 'rgba(15,23,42,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 1,
                      color: plan.popular ? '#818CF8' : '#0F172A',
                    }}>
                      <CheckIcon />
                    </span>
                    <span style={{ fontSize: 14, color: plan.popular ? '#CBD5E1' : '#374151', lineHeight: 1.5 }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', marginTop: 36 }}>
          All plans include a 7-day free trial. Cancel anytime.{' '}
          <a href="#faq" style={{ color: '#6366f1', fontWeight: 500, textDecoration: 'none' }}>Questions? See FAQ.</a>
        </p>
      </div>
    </section>
  );
}
