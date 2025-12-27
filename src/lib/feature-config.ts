// Feature flags and configuration utilities for multi-tenant feature toggling
// Module registry (modules-config.ts) is the source of truth for module definitions

export type FeatureKey = 'inventory' | 'payroll' | 'agents' | 'impact' | 'website' | 'advanced_accounting';

export interface FeatureConfig {
  inventory: boolean;
  payroll: boolean;
  agents: boolean;
  impact: boolean;
  website: boolean;
  advanced_accounting: boolean;
}

export interface BusinessProfile {
  inventory_enabled?: boolean | null;
  payroll_enabled?: boolean | null;
  agents_enabled?: boolean | null;
  impact_enabled?: boolean | null;
  website_enabled?: boolean | null;
  advanced_accounting_enabled?: boolean | null;
  white_label_enabled?: boolean | null;
  business_type?: string | null;
}

/**
 * Get feature configuration from business profile
 * Core modules default to true, add-ons respect explicit flags
 */
export function getFeatureConfig(businessProfile: BusinessProfile | null): FeatureConfig {
  return {
    inventory: businessProfile?.inventory_enabled ?? true,
    payroll: businessProfile?.payroll_enabled ?? true,
    agents: businessProfile?.agents_enabled ?? true,
    impact: businessProfile?.impact_enabled ?? true,
    website: businessProfile?.website_enabled ?? true,
    advanced_accounting: businessProfile?.advanced_accounting_enabled ?? false,
  };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(
  businessProfile: BusinessProfile | null,
  feature: FeatureKey
): boolean {
  const config = getFeatureConfig(businessProfile);
  return config[feature];
}

/**
 * Map dashboard tabs to their required features
 * null means the feature is always available (core functionality)
 */
export const tabFeatureMap: Record<string, FeatureKey | null> = {
  dashboard: null,
  sales: null,
  receipts: null,
  accounts: null,
  settings: null,
  hr: 'payroll',
  inventory: 'inventory',
  shop: 'inventory',
  agents: 'agents',
  communities: 'impact',
  messages: 'impact',
  website: 'website',
  contacts: 'website',
};

/**
 * Check if a dashboard tab should be accessible based on feature flags
 */
export function isTabAccessible(
  businessProfile: BusinessProfile | null,
  tabId: string
): boolean {
  const requiredFeature = tabFeatureMap[tabId];
  if (!requiredFeature) return true;
  return isFeatureEnabled(businessProfile, requiredFeature);
}
