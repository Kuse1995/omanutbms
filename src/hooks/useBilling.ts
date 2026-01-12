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
  trialExpiresAt: string | null;
}

/**
 * Hook for billing-aware feature resolution
 * Provides plan info, feature checks, and limits based on tenant's billing status
 */
export function useBilling(): UseBillingReturn {
  const { businessProfile, loading } = useTenant();

  const plan = (businessProfile?.billing_plan as BillingPlan) || "starter";
  const status = (businessProfile?.billing_status as BillingStatus) || "inactive";
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
    billingStartDate: businessProfile?.billing_start_date ?? null,
    billingEndDate: businessProfile?.billing_end_date ?? null,
    billingNotes: businessProfile?.billing_notes ?? null,
    trialExpiresAt: (businessProfile as any)?.trial_expires_at ?? null,
  };
}
