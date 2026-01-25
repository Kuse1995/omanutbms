// Billing plan definitions - Single source of truth for SaaS billing
// Plans determine feature availability and usage limits
// Payment processing is handled separately and only changes billing_status

export type BillingPlan = "starter" | "growth" | "enterprise";
export type BillingStatus = "inactive" | "active" | "suspended" | "trial";

export interface PlanLimits {
  users: number;
  inventoryItems: number;
  whatsappMessages: number;
  aiQueriesDaily: number;
}

export interface PlanFeatures {
  inventory: boolean;
  payroll: boolean;
  agents: boolean;
  impact: boolean;
  advanced_accounting: boolean;
  website: boolean;
  whatsapp: boolean;
  warehouse: boolean;
  ai_teaching: boolean;
  ai_reports: boolean;
  document_import: boolean;
  white_label: boolean;
  multi_branch: boolean;
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
    description: "For solo entrepreneurs and micro businesses",
    tagline: "Perfect for getting started",
    monthlyPrice: 299,
    annualPrice: 3000,
    currency: "ZMW",
    trialDays: 14,
    popular: false,
    limits: {
      users: 1,
      inventoryItems: 100,
      whatsappMessages: 30,
      aiQueriesDaily: 10,
    },
    features: {
      inventory: true,
      payroll: false,
      agents: false,
      impact: false,
      advanced_accounting: false,
      website: false,
      whatsapp: true,
      warehouse: false,
      ai_teaching: false,
      ai_reports: false,
      document_import: false,
      white_label: false,
      multi_branch: false,
    },
    highlights: [
      "1 user account",
      "50 inventory items",
      "Sales & invoicing",
      "Payment receipts",
      "Basic accounting (Cashbook)",
      "WhatsApp assistant (30/month)",
      "AI Advisor (10 queries/day)",
      "Email support",
    ],
  },

  growth: {
    label: "Pro",
    description: "For growing teams and established businesses",
    tagline: "Most popular for scaling teams",
    monthlyPrice: 799,
    annualPrice: 9000,
    currency: "ZMW",
    trialDays: 14,
    popular: true,
    limits: {
      users: 10,
      inventoryItems: 1000,
      whatsappMessages: 500,
      aiQueriesDaily: 50,
    },
    features: {
      inventory: true,
      payroll: true,
      agents: true,
      impact: true,
      advanced_accounting: true,
      website: true,
      whatsapp: true,
      warehouse: false,
      ai_teaching: true,
      ai_reports: false,
      document_import: true,
      white_label: false,
      multi_branch: false,
    },
    highlights: [
      "Up to 10 team members",
      "1,000 inventory items",
      "HR & Payroll (NAPSA, PAYE, NHIMA)",
      "Agent network & distribution",
      "Impact reporting & certificates",
      "Website & CMS management",
      "Advanced accounting suite",
      "AI Teaching Mode",
      "Document import AI",
      "WhatsApp assistant (500/month)",
      "AI Advisor (50 queries/day)",
      "Priority support",
    ],
  },

  enterprise: {
    label: "Enterprise",
    description: "Full power for established organizations",
    tagline: "Unlimited scale, premium support",
    monthlyPrice: 1999,
    annualPrice: 22999,
    currency: "ZMW",
    trialDays: 30,
    popular: false,
    limits: {
      users: Infinity,
      inventoryItems: Infinity,
      whatsappMessages: Infinity,
      aiQueriesDaily: Infinity,
    },
    features: {
      inventory: true,
      payroll: true,
      agents: true,
      impact: true,
      advanced_accounting: true,
      website: true,
      whatsapp: true,
      warehouse: true,
      ai_teaching: true,
      ai_reports: true,
      document_import: true,
      white_label: true,
      multi_branch: true,
    },
    highlights: [
      "Unlimited team members",
      "Unlimited inventory items",
      "Multi-branch management",
      "Warehouse & stock transfers",
      "White-label branding",
      "AI Financial Report Generator",
      "Unlimited WhatsApp messages",
      "Unlimited AI Advisor queries",
      "Custom integrations",
      "Dedicated account manager",
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

/**
 * Check if a limit is unlimited
 */
export function isUnlimited(value: number): boolean {
  return value === Infinity || value === 0;
}

/**
 * Format limit for display
 */
export function formatLimit(value: number): string {
  if (isUnlimited(value)) return "Unlimited";
  return value.toLocaleString();
}
