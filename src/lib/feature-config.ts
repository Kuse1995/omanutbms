// Feature flags and configuration utilities for multi-tenant feature toggling
// Module registry (modules-config.ts) is the source of truth for module definitions
// Business type defaults come from business-type-config.ts

import { getBusinessTypeConfig, BusinessType } from './business-type-config';

export type FeatureKey = 
  | 'inventory' 
  | 'payroll' 
  | 'agents' 
  | 'impact' 
  | 'website' 
  | 'advanced_accounting' 
  | 'whatsapp' 
  | 'warehouse'
  | 'ai_teaching'
  | 'ai_reports'
  | 'document_import'
  | 'white_label'
  | 'multi_branch';

export interface FeatureConfig {
  inventory: boolean;
  payroll: boolean;
  agents: boolean;
  impact: boolean;
  website: boolean;
  advanced_accounting: boolean;
  whatsapp: boolean;
  warehouse: boolean;
  ai_teaching: boolean;
  ai_reports: boolean;
  document_import: boolean;
  white_label: boolean;
  multi_branch: boolean;
}

export interface BusinessProfile {
  inventory_enabled?: boolean | null;
  payroll_enabled?: boolean | null;
  agents_enabled?: boolean | null;
  impact_enabled?: boolean | null;
  website_enabled?: boolean | null;
  advanced_accounting_enabled?: boolean | null;
  whatsapp_enabled?: boolean | null;
  warehouse_enabled?: boolean | null;
  white_label_enabled?: boolean | null;
  multi_branch_enabled?: boolean | null;
  business_type?: string | null;
}

/**
 * Get feature configuration from business profile
 * Uses business type defaults when tenant hasn't explicitly set a value
 * Explicit tenant overrides (true/false) always take precedence
 */
export function getFeatureConfig(businessProfile: BusinessProfile | null): FeatureConfig {
  // Get business type defaults
  const businessType = (businessProfile?.business_type as BusinessType) || 'retail';
  const typeDefaults = getBusinessTypeConfig(businessType).defaultFeatures;

  return {
    // Use explicit tenant setting if set, otherwise fall back to business type default
    inventory: businessProfile?.inventory_enabled ?? typeDefaults.inventory,
    payroll: businessProfile?.payroll_enabled ?? typeDefaults.payroll,
    agents: businessProfile?.agents_enabled ?? typeDefaults.agents,
    impact: businessProfile?.impact_enabled ?? typeDefaults.impact,
    website: businessProfile?.website_enabled ?? typeDefaults.website,
    advanced_accounting: businessProfile?.advanced_accounting_enabled ?? typeDefaults.advanced_accounting,
    whatsapp: businessProfile?.whatsapp_enabled ?? typeDefaults.whatsapp,
    warehouse: businessProfile?.warehouse_enabled ?? typeDefaults.warehouse,
    // New AI/premium features - default to false unless explicitly enabled
    ai_teaching: false,
    ai_reports: false,
    document_import: false,
    white_label: businessProfile?.white_label_enabled ?? false,
    multi_branch: businessProfile?.multi_branch_enabled ?? false,
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
  returns: 'inventory',
  agents: 'agents',
  communities: 'impact',
  messages: 'impact',
  website: 'website',
  contacts: 'website',
  warehouse: 'warehouse',
  'stock-transfers': 'warehouse',
  locations: 'warehouse',
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
