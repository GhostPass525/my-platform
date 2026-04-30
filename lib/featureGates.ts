// TODO: Fetch the user's tier from the `subscriptions` table (plan_id column) and pass it
// into hasFeature/getStoreLimit at every enforcement point listed below.
// Enforcement points that need wiring up:
//   - Store creation limit: dashboard-client.tsx createProject() — block if projects.length >= getStoreLimit(tier)
//   - Custom domain: builder/page.tsx or domain settings UI — gate behind hasFeature(tier, 'custom_domain')
//   - Analytics dashboard: app/dashboard/* analytics tab — gate behind hasFeature(tier, 'analytics')
//   - AI image generation: builder — gate behind hasFeature(tier, 'image_generation')
//   - Marketing tools: dashboard marketing tab — gate behind hasFeature(tier, 'marketing_tools')
//   - Email automation: any email flow UI — gate behind hasFeature(tier, 'email_automation')
//   - A/B testing: any A/B UI — gate behind hasFeature(tier, 'ab_testing')
//   - Marketplace: marketplace tab — gate behind hasFeature(tier, 'marketplace')
//   - Business valuation widget — gate behind hasFeature(tier, 'valuations')
//   - Competitor teardown — gate behind hasFeature(tier, 'competitor_teardown')
//   - API access — gate behind hasFeature(tier, 'api_access')

export type Tier = 'starter' | 'founder' | 'empire' | 'legacy';

export type Feature =
  | 'multiple_stores'
  | 'custom_domain'
  | 'analytics'
  | 'image_generation'
  | 'marketing_tools'
  | 'email_automation'
  | 'ab_testing'
  | 'marketplace'
  | 'unlimited_stores'
  | 'valuations'
  | 'competitor_teardown'
  | 'api_access';

const TIER_FEATURES: Record<Tier, Feature[]> = {
  starter: [],
  founder: [
    'multiple_stores',
    'custom_domain',
    'analytics',
    'image_generation',
    'marketing_tools',
    'email_automation',
    'ab_testing',
  ],
  empire: [
    'multiple_stores',
    'custom_domain',
    'analytics',
    'image_generation',
    'marketing_tools',
    'email_automation',
    'ab_testing',
    'marketplace',
    'unlimited_stores',
    'valuations',
    'competitor_teardown',
    'api_access',
  ],
  // Legacy ($14.99) users are grandfathered at Founder tier features
  legacy: [
    'multiple_stores',
    'custom_domain',
    'analytics',
    'image_generation',
    'marketing_tools',
    'email_automation',
    'ab_testing',
  ],
};

export function hasFeature(tier: Tier, feature: Feature): boolean {
  return TIER_FEATURES[tier]?.includes(feature) ?? false;
}

export function getStoreLimit(tier: Tier): number {
  switch (tier) {
    case 'starter':  return 1;
    case 'founder':  return 3;
    case 'empire':   return Infinity;
    case 'legacy':   return 3;
    default:         return 1;
  }
}
