import { useTenant } from "./useTenant";
import { 
  BILLING_PLANS, 
  BillingPlan, 
  BillingStatus, 
  BillingPlanConfig,
  PlanFeatures,
  isStatusActive,
  getRequiredPlanForFeature
} from "@/lib/billing-plans";

export interface UseBillingReturn {
  loading: boolean;
  plan: BillingPlan;
  status: BillingStatus;
  planConfig: BillingPlanConfig;
  isActive: boolean;
  isFeatureAllowed: (featureKey: keyof PlanFeatures) => boolean;
  getLimit: (limitKey: "users" | "inventoryItems") => number;
  getRequiredPlan: (featureKey: keyof PlanFeatures) => BillingPlan | null;
  billingStartDate: string | null;
  billingEndDate: string | null;
  billingNotes: string | null;
}

// Extended business profile type with billing fields (auto-generated types may not include these yet)
interface ExtendedBusinessProfile {
  billing_plan?: string | null;
  billing_status?: string | null;
  billing_notes?: string | null;
  billing_start_date?: string | null;
  billing_end_date?: string | null;
}

/**
 * Hook for billing-aware feature resolution
 * Provides plan info, feature checks, and limits based on tenant's billing status
 */
export function useBilling(): UseBillingReturn {
  const { businessProfile, loading } = useTenant();
  
  // Cast to extended type to access billing fields
  const extendedProfile = businessProfile as (typeof businessProfile & ExtendedBusinessProfile) | null;

  const plan = (extendedProfile?.billing_plan as BillingPlan) || "starter";
  const status = (extendedProfile?.billing_status as BillingStatus) || "inactive";
  const planConfig = BILLING_PLANS[plan];
  const isActive = isStatusActive(status);

  /**
   * Check if a specific feature is allowed based on plan AND billing status
   */
  function isFeatureAllowed(featureKey: keyof PlanFeatures): boolean {
    // If billing status is not active/trial, no features are allowed
    if (!isActive) return false;
    
    // Check if the plan includes this feature
    return Boolean(planConfig.features[featureKey]);
  }

  /**
   * Get the limit for a specific resource
   */
  function getLimit(limitKey: "users" | "inventoryItems"): number {
    return planConfig.limits[limitKey];
  }

  return {
    loading,
    plan,
    status,
    planConfig,
    isActive,
    isFeatureAllowed,
    getLimit,
    getRequiredPlan: getRequiredPlanForFeature,
    billingStartDate: extendedProfile?.billing_start_date ?? null,
    billingEndDate: extendedProfile?.billing_end_date ?? null,
    billingNotes: extendedProfile?.billing_notes ?? null,
  };
}
