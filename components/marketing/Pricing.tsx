import Link from 'next/link';

type Plan = {
  name: string;
  price: number;
  tagline: string;
  popular?: boolean;
  features: string[];
  cta: string;
};

const plans: Plan[] = [
  {
    name: 'Starter',
    price: 19,
    tagline: 'Everything you need to launch your first business',
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
    cta: 'Start free trial',
  },
  {
    name: 'Founder',
    price: 39,
    tagline: 'For builders who are growing',
    popular: true,
    features: [
      'Everything in Starter',
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
    cta: 'Start free trial',
  },
  {
    name: 'Empire',
    price: 99,
    tagline: 'For builders who are serious about scale',
    features: [
      'Everything in Founder',
      'Unlimited stores',
      'Remove Volcity branding',
      'Team members (3 seats)',
      'Dedicated account manager',
      '0% platform fee',
      'API access',
      'Custom integrations',
      'SLA support',
    ],
    cta: 'Start free trial',
  },
];

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function Pricing() {
  return (
    <section id="pricing" style={{ padding: 'clamp(64px, 8vw, 100px) 24px', background: '#F8F9FB' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
            Simple, honest pricing
          </h2>
          <p style={{ fontSize: 17, color: '#64748B', margin: 0 }}>
            Start free for 7 days. No credit card required.
          </p>
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
                border: plan.popular ? 'none' : '1px solid #E2E8F0',
                padding: '36px 32px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: plan.popular ? '0 24px 64px rgba(15,23,42,0.18)' : 'none',
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: -12,
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
                  Most Popular
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: plan.popular ? '#94A3B8' : '#94A3B8', marginBottom: 8 }}>
                  {plan.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, color: plan.popular ? '#fff' : '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    ${plan.price}
                  </span>
                  <span style={{ fontSize: 15, color: plan.popular ? '#64748B' : '#94A3B8' }}>/mo</span>
                </div>
                <p style={{ fontSize: 14, color: plan.popular ? '#94A3B8' : '#64748B', margin: 0, lineHeight: 1.5 }}>
                  {plan.tagline}
                </p>
              </div>

              <Link href="/auth/signup" style={{
                display: 'block',
                textAlign: 'center',
                padding: '13px 0',
                borderRadius: 50,
                fontSize: 15,
                fontWeight: 700,
                textDecoration: 'none',
                marginBottom: 28,
                background: plan.popular ? 'linear-gradient(135deg, #6366f1, #4338CA)' : '#0F172A',
                color: '#fff',
                boxShadow: plan.popular ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
              }}>
                {plan.cta}
              </Link>

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

        <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', marginTop: 28 }}>
          All plans include a 7-day free trial. Cancel anytime.{' '}
          <a href="#faq" style={{ color: '#6366f1', fontWeight: 500, textDecoration: 'none' }}>Questions? See FAQ.</a>
        </p>
      </div>
    </section>
  );
}
