// Billing plan definitions - Single source of truth for SaaS billing
// Plans determine feature availability and usage limits
// Payment processing is handled separately and only changes billing_status

export type BillingPlan = "starter" | "growth" | "enterprise";
export type BillingStatus = "inactive" | "active" | "suspended" | "trial";

export interface PlanLimits {
  users: number;
  inventoryItems: number;
}

export interface PlanFeatures {
  inventory: boolean;
  payroll: boolean;
  agents: boolean;
  impact: boolean;
  advanced_accounting: boolean;
  website: boolean;
}

export interface BillingPlanConfig {
  label: string;
  description: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  trialDays: number;
  popular: boolean;
  limits: PlanLimits;
  features: PlanFeatures;
  highlights: string[];
}

export const BILLING_PLANS: Record<BillingPlan, BillingPlanConfig> = {
  starter: {
    label: "Starter",
    description: "For small teams and early businesses",
    tagline: "Perfect for getting started",
    monthlyPrice: 499,
    annualPrice: 4790,
    currency: "ZMW",
    trialDays: 14,
    popular: false,
    limits: {
      users: 3,
      inventoryItems: 100,
    },
    features: {
      inventory: true,
      payroll: false,
      agents: false,
      impact: false,
      advanced_accounting: false,
      website: false,
    },
    highlights: [
      "Up to 3 team members",
      "100 inventory items",
      "Basic accounting",
      "Sales & invoicing",
      "Email support",
    ],
  },

  growth: {
    label: "Growth",
    description: "For growing organizations",
    tagline: "Most popular for scaling teams",
    monthlyPrice: 1299,
    annualPrice: 12470,
    currency: "ZMW",
    trialDays: 14,
    popular: true,
    limits: {
      users: 10,
      inventoryItems: 1000,
    },
    features: {
      inventory: true,
      payroll: true,
      agents: true,
      impact: true,
      advanced_accounting: false,
      website: true,
    },
    highlights: [
      "Up to 10 team members",
      "1,000 inventory items",
      "HR & Payroll",
      "Agent network",
      "Impact reporting",
      "Website management",
      "Priority support",
    ],
  },

  enterprise: {
    label: "Enterprise",
    description: "Custom solution for large organizations",
    tagline: "Full power, unlimited scale",
    monthlyPrice: 0, // Custom pricing
    annualPrice: 0,
    currency: "ZMW",
    trialDays: 30,
    popular: false,
    limits: {
      users: Infinity,
      inventoryItems: Infinity,
    },
    features: {
      inventory: true,
      payroll: true,
      agents: true,
      impact: true,
      advanced_accounting: true,
      website: true,
    },
    highlights: [
      "Unlimited team members",
      "Unlimited inventory",
      "Advanced accounting",
      "Custom integrations",
      "White-label options",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
} as const;

/**
 * Get all billing plan options for dropdowns
 */
export function getBillingPlanOptions(): Array<{ value: BillingPlan; label: string; description: string }> {
  return Object.entries(BILLING_PLANS).map(([value, config]) => ({
    value: value as BillingPlan,
    label: config.label,
    description: config.description,
  }));
}

/**
 * Get all billing status options for dropdowns
 */
export function getBillingStatusOptions(): Array<{ value: BillingStatus; label: string; description: string }> {
  return [
    { value: "inactive", label: "Inactive", description: "Billing not active - limited access" },
    { value: "trial", label: "Trial", description: "Trial period - full access" },
    { value: "active", label: "Active", description: "Paid and active subscription" },
    { value: "suspended", label: "Suspended", description: "Payment issues - access restricted" },
  ];
}

/**
 * Check if a billing status allows feature access
 */
export function isStatusActive(status: BillingStatus): boolean {
  return status === "active" || status === "trial";
}

/**
 * Get the required plan for a specific feature
 */
export function getRequiredPlanForFeature(featureKey: keyof PlanFeatures): BillingPlan | null {
  const plans: BillingPlan[] = ["starter", "growth", "enterprise"];
  
  for (const plan of plans) {
    if (BILLING_PLANS[plan].features[featureKey]) {
      return plan;
    }
  }
  
  return null;
}

/**
 * Calculate annual savings percentage
 */
export function getAnnualSavingsPercent(plan: BillingPlan): number {
  const config = BILLING_PLANS[plan];
  if (config.monthlyPrice === 0) return 0;
  const monthlyTotal = config.monthlyPrice * 12;
  const savings = ((monthlyTotal - config.annualPrice) / monthlyTotal) * 100;
  return Math.round(savings);
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = "ZMW"): string {
  if (amount === 0) return "Custom";
  return `K${amount.toLocaleString()}`;
}
