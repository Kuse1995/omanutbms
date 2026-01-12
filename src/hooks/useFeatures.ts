import { useTenant } from "./useTenant";
import { useBilling } from "./useBilling";
import { getFeatureConfig, isFeatureEnabled, isTabAccessible, FeatureKey, FeatureConfig } from "@/lib/feature-config";
import { getTerminology, TerminologyMap } from "@/lib/terminology-config";

export interface UseFeaturesReturn {
  loading: boolean;
  features: FeatureConfig;
  terminology: TerminologyMap;
  isEnabled: (feature: FeatureKey) => boolean;
  canAccessTab: (tabId: string) => boolean;
  businessType: string | null;
  companyName: string | null;
  currencySymbol: string;
}

/**
 * Hook that combines tenant context with feature flags, billing plan, and terminology
 * A feature is only enabled if BOTH the billing plan allows it AND the tenant hasn't disabled it
 */
export function useFeatures(): UseFeaturesReturn {
  const { businessProfile, loading: tenantLoading } = useTenant();
  const { isFeatureAllowed, loading: billingLoading } = useBilling();

  const loading = tenantLoading || billingLoading;

  // Merge billing plan features with tenant profile overrides
  const getMergedFeatures = (): FeatureConfig => {
    const profileConfig = getFeatureConfig(businessProfile);
    
    return {
      inventory: isFeatureAllowed('inventory') && profileConfig.inventory,
      payroll: isFeatureAllowed('payroll') && profileConfig.payroll,
      agents: isFeatureAllowed('agents') && profileConfig.agents,
      impact: isFeatureAllowed('impact') && profileConfig.impact,
      website: isFeatureAllowed('website') && profileConfig.website,
      advanced_accounting: isFeatureAllowed('advanced_accounting') && profileConfig.advanced_accounting,
    };
  };

  const features = getMergedFeatures();

  // Check if feature is enabled (respects both billing plan and tenant settings)
  const isEnabled = (feature: FeatureKey) => 
    isFeatureAllowed(feature) && isFeatureEnabled(businessProfile, feature);

  // Check tab access using merged features
  const canAccessTab = (tabId: string) => {
    const featureMap: Record<string, FeatureKey | null> = {
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
    
    const requiredFeature = featureMap[tabId];
    if (!requiredFeature) return true;
    return features[requiredFeature];
  };

  return {
    loading,
    features,
    terminology: getTerminology(businessProfile?.business_type),
    isEnabled,
    canAccessTab,
    businessType: businessProfile?.business_type ?? null,
    companyName: businessProfile?.company_name ?? null,
    currencySymbol: businessProfile?.currency_symbol ?? 'K',
  };
}
