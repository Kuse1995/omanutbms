import { useTenant } from "./useTenant";
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
 * Hook that combines tenant context with feature flags and terminology
 * Provides a single interface for feature toggling and dynamic labels
 */
export function useFeatures(): UseFeaturesReturn {
  const { businessProfile, loading } = useTenant();

  return {
    loading,
    features: getFeatureConfig(businessProfile),
    terminology: getTerminology(businessProfile?.business_type),
    isEnabled: (feature: FeatureKey) => isFeatureEnabled(businessProfile, feature),
    canAccessTab: (tabId: string) => isTabAccessible(businessProfile, tabId),
    businessType: businessProfile?.business_type ?? null,
    companyName: businessProfile?.company_name ?? null,
    currencySymbol: businessProfile?.currency_symbol ?? 'K',
  };
}
