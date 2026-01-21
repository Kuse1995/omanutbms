// Central module registry for Omanut BMS
// Defines core vs add-on modules for product standardization

import { FeatureKey } from "./feature-config";

export type ModuleCategory = 'core' | 'addon';
export type PricingTier = 'free' | 'starter' | 'professional' | 'enterprise';

export interface ModulePricing {
  tier: 'starter' | 'growth' | 'enterprise';
  monthlyPriceZMW?: number;
  description?: string;
}

export interface ModuleDefinition {
  moduleKey: string;
  displayName: string;
  description: string;
  category: ModuleCategory;
  requiredFeatures: FeatureKey[];
  icon: string;
  defaultEnabled: boolean;
  // Pricing readiness metadata (no billing logic)
  pricingTier: PricingTier;
  coreIncluded: boolean;
  futurePayment: boolean;
  // Display-only pricing info
  pricing?: ModulePricing;
}

/**
 * CORE MODULES - Always enabled, no feature flags required
 * These are essential for any business type
 */
export const coreModules: ModuleDefinition[] = [
  {
    moduleKey: 'dashboard',
    displayName: 'Dashboard',
    description: 'Central business overview and KPIs',
    category: 'core',
    requiredFeatures: [],
    icon: 'LayoutDashboard',
    defaultEnabled: true,
    pricingTier: 'free',
    coreIncluded: true,
    futurePayment: false,
  },
  {
    moduleKey: 'transactions',
    displayName: 'Transactions',
    description: 'Record and manage sales, fees, contributions, or invoices',
    category: 'core',
    requiredFeatures: [],
    icon: 'ShoppingCart',
    defaultEnabled: true,
    pricingTier: 'free',
    coreIncluded: true,
    futurePayment: false,
  },
  {
    moduleKey: 'receipts',
    displayName: 'Receipts',
    description: 'Payment receipts management and generation',
    category: 'core',
    requiredFeatures: [],
    icon: 'Receipt',
    defaultEnabled: true,
    pricingTier: 'free',
    coreIncluded: true,
    futurePayment: false,
  },
  {
    moduleKey: 'basic_accounting',
    displayName: 'Basic Accounting',
    description: 'Cashbook, expenses, and simple financial tracking',
    category: 'core',
    requiredFeatures: [],
    icon: 'Calculator',
    defaultEnabled: true,
    pricingTier: 'free',
    coreIncluded: true,
    futurePayment: false,
  },
  {
    moduleKey: 'customers',
    displayName: 'Customers',
    description: 'Manage customers, students, donors, or clients',
    category: 'core',
    requiredFeatures: [],
    icon: 'Users',
    defaultEnabled: true,
    pricingTier: 'free',
    coreIncluded: true,
    futurePayment: false,
  },
  {
    moduleKey: 'users_roles',
    displayName: 'Users & Roles',
    description: 'User management and access control',
    category: 'core',
    requiredFeatures: [],
    icon: 'Shield',
    defaultEnabled: true,
    pricingTier: 'free',
    coreIncluded: true,
    futurePayment: false,
  },
  {
    moduleKey: 'settings',
    displayName: 'Settings',
    description: 'System configuration and preferences',
    category: 'core',
    requiredFeatures: [],
    icon: 'Settings',
    defaultEnabled: true,
    pricingTier: 'free',
    coreIncluded: true,
    futurePayment: false,
  },
];

/**
 * ADD-ON MODULES - Feature-flag controlled
 * These can be enabled/disabled per tenant
 */
export const addonModules: ModuleDefinition[] = [
  {
    moduleKey: 'inventory',
    displayName: 'Inventory',
    description: 'Product, stock, and service management',
    category: 'addon',
    requiredFeatures: ['inventory'],
    icon: 'Package',
    defaultEnabled: true,
    pricingTier: 'starter',
    coreIncluded: false,
    futurePayment: true,
    pricing: {
      tier: 'starter',
      monthlyPriceZMW: 150,
      description: 'Track products, manage stock levels, and generate inventory reports',
    },
  },
  {
    moduleKey: 'agents',
    displayName: 'Agents & Distribution',
    description: 'Agent network and distribution management',
    category: 'addon',
    requiredFeatures: ['agents'],
    icon: 'Store',
    defaultEnabled: true,
    pricingTier: 'professional',
    coreIncluded: false,
    futurePayment: true,
    pricing: {
      tier: 'growth',
      monthlyPriceZMW: 350,
      description: 'Manage agent applications, inventory allocation, and sales tracking',
    },
  },
  {
    moduleKey: 'hr_payroll',
    displayName: 'HR & Payroll',
    description: 'Employee and payroll management',
    category: 'addon',
    requiredFeatures: ['payroll'],
    icon: 'Briefcase',
    defaultEnabled: true,
    pricingTier: 'starter',
    coreIncluded: false,
    futurePayment: true,
    pricing: {
      tier: 'starter',
      monthlyPriceZMW: 200,
      description: 'Employee records, attendance tracking, and payroll processing',
    },
  },
  {
    moduleKey: 'advanced_accounting',
    displayName: 'Advanced Accounting',
    description: 'General ledger, trial balance, balance sheet, P&L statements',
    category: 'addon',
    requiredFeatures: ['advanced_accounting'],
    icon: 'BookOpen',
    defaultEnabled: false,
    pricingTier: 'professional',
    coreIncluded: false,
    futurePayment: true,
    pricing: {
      tier: 'enterprise',
      monthlyPriceZMW: 500,
      description: 'Full double-entry accounting with financial statements and AI insights',
    },
  },
  {
    moduleKey: 'impact_community',
    displayName: 'Impact & Community',
    description: 'Impact metrics, community management, and reporting',
    category: 'addon',
    requiredFeatures: ['impact'],
    icon: 'Heart',
    defaultEnabled: true,
    pricingTier: 'professional',
    coreIncluded: false,
    futurePayment: true,
    pricing: {
      tier: 'growth',
      monthlyPriceZMW: 250,
      description: 'Track impact metrics, generate certificates, and manage community engagement',
    },
  },
  {
    moduleKey: 'website_cms',
    displayName: 'Website & CMS',
    description: 'Website content management and blog',
    category: 'addon',
    requiredFeatures: ['website'],
    icon: 'Globe',
    defaultEnabled: true,
    pricingTier: 'starter',
    coreIncluded: false,
    futurePayment: true,
    pricing: {
      tier: 'starter',
      monthlyPriceZMW: 100,
      description: 'Manage website content, blog posts, and announcements',
    },
  },
  {
    moduleKey: 'warehouse',
    displayName: 'Warehouse Management',
    description: 'Multi-location inventory with stock transfers and manager approvals',
    category: 'addon',
    requiredFeatures: ['warehouse'],
    icon: 'Warehouse',
    defaultEnabled: false,
    pricingTier: 'professional',
    coreIncluded: false,
    futurePayment: true,
    pricing: {
      tier: 'growth',
      monthlyPriceZMW: 300,
      description: 'Stock transfers, location management, and smart restock suggestions',
    },
  },
];

/**
 * All modules combined
 */
export const allModules: ModuleDefinition[] = [...coreModules, ...addonModules];

/**
 * Module key type for type-safe access
 */
export type ModuleKey = typeof allModules[number]['moduleKey'];

/**
 * Get module by key (alias for getModuleByKey)
 */
export function getModule(moduleKey: string): ModuleDefinition | undefined {
  return allModules.find((m) => m.moduleKey === moduleKey);
}

/**
 * Get module by key
 */
export function getModuleByKey(moduleKey: string): ModuleDefinition | undefined {
  return allModules.find((m) => m.moduleKey === moduleKey);
}

/**
 * Get all modules by category
 */
export function getModulesByCategory(category: ModuleCategory): ModuleDefinition[] {
  return allModules.filter((m) => m.category === category);
}

/**
 * Check if a module is a core module (always enabled)
 */
export function isCoreModule(moduleKey: string): boolean {
  return coreModules.some((m) => m.moduleKey === moduleKey);
}

/**
 * Check if a module requires specific features
 */
export function getRequiredFeatures(moduleKey: string): FeatureKey[] {
  const module = getModule(moduleKey);
  return module?.requiredFeatures || [];
}
