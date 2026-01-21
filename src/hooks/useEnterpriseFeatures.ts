import { useTenant } from './useTenant';

// Enterprise feature flag types
export type EnterpriseFeature = 
  | 'custom_designer_workflow'
  | 'production_tracking'
  | 'advanced_analytics'
  | 'multi_location_inventory'
  | 'custom_reporting';

export interface UseEnterpriseFeaturesReturn {
  loading: boolean;
  enabledFeatures: EnterpriseFeature[];
  hasFeature: (feature: EnterpriseFeature) => boolean;
  isCustomDesignerEnabled: boolean;
  isProductionTrackingEnabled: boolean;
}

/**
 * Hook to check enterprise feature flags from business_profiles.enabled_features
 * Used for conditional UI rendering based on enterprise client configurations
 */
export function useEnterpriseFeatures(): UseEnterpriseFeaturesReturn {
  const { businessProfile, loading } = useTenant();

  // Parse enabled_features from the business profile
  // Cast to any to handle the JSONB -> string[] type bridging
  const rawFeatures = (businessProfile as any)?.enabled_features;
  
  const enabledFeatures: EnterpriseFeature[] = (() => {
    if (!rawFeatures) return [];
    
    // Handle both array and JSONB formats
    if (Array.isArray(rawFeatures)) {
      return rawFeatures as EnterpriseFeature[];
    }
    
    return [];
  })();

  const hasFeature = (feature: EnterpriseFeature): boolean => {
    return enabledFeatures.includes(feature);
  };

  return {
    loading,
    enabledFeatures,
    hasFeature,
    // Convenience booleans for common features
    isCustomDesignerEnabled: hasFeature('custom_designer_workflow'),
    isProductionTrackingEnabled: hasFeature('production_tracking'),
  };
}
