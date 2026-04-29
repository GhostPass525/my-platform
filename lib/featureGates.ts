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
