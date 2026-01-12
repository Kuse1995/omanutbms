import { useTenant } from "./useTenant";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BILLING_PLANS, 
  BillingPlan, 
  BillingStatus, 
  BillingPlanConfig,
  PlanFeatures,
  PlanLimits,
  isStatusActive,
  getRequiredPlanForFeature
} from "@/lib/billing-plans";

interface PlanConfigOverride {
  label: string | null;
  description: string | null;
  tagline: string | null;
  monthly_price: number | null;
  annual_price: number | null;
  currency: string | null;
  trial_days: number | null;
  max_users: number | null;
  max_inventory_items: number | null;
  feature_inventory: boolean | null;
  feature_payroll: boolean | null;
  feature_agents: boolean | null;
  feature_impact: boolean | null;
  feature_advanced_accounting: boolean | null;
  feature_website: boolean | null;
  highlights: string[] | null;
  is_popular: boolean | null;
}

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
 * Merge database overrides with code defaults
 */
function mergePlanConfig(plan: BillingPlan, override: PlanConfigOverride | null): BillingPlanConfig {
  const defaults = BILLING_PLANS[plan];
  
  if (!override) return defaults;

  return {
    label: override.label ?? defaults.label,
    description: override.description ?? defaults.description,
    tagline: override.tagline ?? defaults.tagline,
    monthlyPrice: override.monthly_price ?? defaults.monthlyPrice,
    annualPrice: override.annual_price ?? defaults.annualPrice,
    currency: override.currency ?? defaults.currency,
    trialDays: override.trial_days ?? defaults.trialDays,
    popular: override.is_popular ?? defaults.popular,
    limits: {
      users: override.max_users === 0 ? Infinity : (override.max_users ?? defaults.limits.users),
      inventoryItems: override.max_inventory_items === 0 ? Infinity : (override.max_inventory_items ?? defaults.limits.inventoryItems),
    },
    features: {
      inventory: override.feature_inventory ?? defaults.features.inventory,
      payroll: override.feature_payroll ?? defaults.features.payroll,
      agents: override.feature_agents ?? defaults.features.agents,
      impact: override.feature_impact ?? defaults.features.impact,
      advanced_accounting: override.feature_advanced_accounting ?? defaults.features.advanced_accounting,
      website: override.feature_website ?? defaults.features.website,
    },
    highlights: override.highlights ?? defaults.highlights,
  };
}

/**
 * Hook for billing-aware feature resolution
 * Provides plan info, feature checks, and limits based on tenant's billing status
 * Merges database overrides with code defaults
 */
export function useBilling(): UseBillingReturn {
  const { businessProfile, loading: tenantLoading } = useTenant();

  const plan = (businessProfile?.billing_plan as BillingPlan) || "starter";
  const status = (businessProfile?.billing_status as BillingStatus) || "inactive";

  // Fetch plan config overrides from database
  const { data: planOverride, isLoading: configLoading } = useQuery({
    queryKey: ["billing-plan-config", plan],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_plan_configs")
        .select("*")
        .eq("plan_key", plan)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching plan config:", error);
      }
      return data as PlanConfigOverride | null;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const loading = tenantLoading || configLoading;
  const planConfig = mergePlanConfig(plan, planOverride);
  const isActive = isStatusActive(status);

  /**
   * Check if a specific feature is allowed based on plan AND billing status
   */
  function isFeatureAllowed(featureKey: keyof PlanFeatures): boolean {
    // If billing status is not active/trial, no features are allowed
    if (!isActive) return false;
    
    // Check if the plan includes this feature (uses merged config)
    return Boolean(planConfig.features[featureKey]);
  }

  /**
   * Get the limit for a specific resource (uses merged config)
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
