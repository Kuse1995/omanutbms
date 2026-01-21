import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BILLING_PLANS, 
  BillingPlan, 
  BillingPlanConfig 
} from "@/lib/billing-plans";

interface PlanConfigRow {
  plan_key: string;
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
  feature_whatsapp: boolean | null;
  highlights: string[] | null;
  is_popular: boolean | null;
  is_active: boolean | null;
}

/**
 * Merge database override with code defaults for a single plan
 */
function mergePlanConfig(planKey: BillingPlan, override: PlanConfigRow | null): BillingPlanConfig {
  const defaults = BILLING_PLANS[planKey];
  
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
      whatsapp: override.feature_whatsapp ?? defaults.features.whatsapp,
    },
    highlights: override.highlights ?? defaults.highlights,
  };
}

export interface UseBillingPlansReturn {
  loading: boolean;
  plans: Record<BillingPlan, BillingPlanConfig>;
  planKeys: BillingPlan[];
}

/**
 * Hook to fetch ALL billing plan configurations
 * Used for pricing pages, plan selectors, and anywhere that shows all plans
 * Merges database overrides with code defaults
 */
export function useBillingPlans(): UseBillingPlansReturn {
  const planKeys: BillingPlan[] = ["starter", "growth", "enterprise"];

  const { data: planConfigs, isLoading } = useQuery({
    queryKey: ["billing-plan-configs-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_plan_configs")
        .select("*")
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching plan configs:", error);
        return null;
      }
      return data as PlanConfigRow[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Build merged plans object
  const plans: Record<BillingPlan, BillingPlanConfig> = {} as Record<BillingPlan, BillingPlanConfig>;
  
  for (const planKey of planKeys) {
    const override = planConfigs?.find(c => c.plan_key === planKey) ?? null;
    plans[planKey] = mergePlanConfig(planKey, override);
  }

  return {
    loading: isLoading,
    plans,
    planKeys,
  };
}
