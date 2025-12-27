// Business Type Configuration - Single Source of Truth
// All behavior must be derived from the tenant's selected business_type

export type BusinessType = 'distribution' | 'retail' | 'school' | 'ngo' | 'services';

export interface InventoryConfig {
  enabled: boolean;
  seedProfile?: 'lifestraw' | 'generic' | 'services';
  allowVariants?: boolean;
}

export interface TerminologyConfig {
  product: string;
  products: string;
  customer: string;
  customers: string;
  customerId: string;
  sale: string;
  sales: string;
  revenue: string;
  invoice: string;
  invoices: string;
  inventory: string;
  community: string;
  communities: string;
}

export interface ImpactConfig {
  enabled: boolean;
  unitLabel?: string;
  beneficiariesLabel?: string;
  description?: string;
}

export interface BusinessTypeConfig {
  label: string;
  description: string;
  inventory: InventoryConfig;
  terminology: TerminologyConfig;
  impact: ImpactConfig;
}

export const BUSINESS_TYPE_CONFIG: Record<BusinessType, BusinessTypeConfig> = {
  distribution: {
    label: 'Distribution Business',
    description: 'Distribute products through agent networks',
    inventory: {
      enabled: true,
      seedProfile: 'lifestraw',
      allowVariants: true,
    },
    terminology: {
      product: 'Product',
      products: 'Products',
      customer: 'Agent',
      customers: 'Agents',
      customerId: 'Agent ID',
      sale: 'Distribution',
      sales: 'Distributions',
      revenue: 'Sales Revenue',
      invoice: 'Invoice',
      invoices: 'Invoices',
      inventory: 'Inventory',
      community: 'Community',
      communities: 'Communities',
    },
    impact: {
      enabled: true,
      unitLabel: 'Impact Units',
      beneficiariesLabel: 'Lives Impacted',
      description: 'Track your distribution impact',
    },
  },

  retail: {
    label: 'Retail Business',
    description: 'Sell products directly to customers',
    inventory: {
      enabled: true,
      seedProfile: 'generic',
      allowVariants: true,
    },
    terminology: {
      product: 'Product',
      products: 'Products',
      customer: 'Customer',
      customers: 'Customers',
      customerId: 'Customer ID',
      sale: 'Sale',
      sales: 'Sales',
      revenue: 'Revenue',
      invoice: 'Invoice',
      invoices: 'Invoices',
      inventory: 'Inventory',
      community: 'Community',
      communities: 'Communities',
    },
    impact: {
      enabled: false,
    },
  },

  school: {
    label: 'School / Institution',
    description: 'Manage student fees and resources',
    inventory: {
      enabled: false,
    },
    terminology: {
      product: 'Resource',
      products: 'Resources',
      customer: 'Student',
      customers: 'Students',
      customerId: 'Student ID',
      sale: 'Fee Payment',
      sales: 'Fee Payments',
      revenue: 'Fee Collections',
      invoice: 'Fee Statement',
      invoices: 'Fee Statements',
      inventory: 'Resources',
      community: 'School',
      communities: 'Schools',
    },
    impact: {
      enabled: true,
      unitLabel: 'Students Served',
      beneficiariesLabel: 'Students Impacted',
      description: 'Track student outcomes',
    },
  },

  ngo: {
    label: 'NGO / Foundation',
    description: 'Manage donations and track beneficiaries',
    inventory: {
      enabled: true,
      seedProfile: 'generic',
    },
    terminology: {
      product: 'Item',
      products: 'Items',
      customer: 'Donor',
      customers: 'Donors',
      customerId: 'Donor ID',
      sale: 'Contribution',
      sales: 'Contributions',
      revenue: 'Donations',
      invoice: 'Pledge',
      invoices: 'Pledges',
      inventory: 'Items',
      community: 'Community',
      communities: 'Communities',
    },
    impact: {
      enabled: true,
      unitLabel: 'Beneficiaries Reached',
      beneficiariesLabel: 'Lives Changed',
      description: 'Track your social impact',
    },
  },

  services: {
    label: 'Service Business',
    description: 'Manage client services and billing',
    inventory: {
      enabled: true,
      seedProfile: 'services',
    },
    terminology: {
      product: 'Service',
      products: 'Services',
      customer: 'Client',
      customers: 'Clients',
      customerId: 'Client ID',
      sale: 'Invoice',
      sales: 'Invoices',
      revenue: 'Revenue',
      invoice: 'Invoice',
      invoices: 'Invoices',
      inventory: 'Services',
      community: 'Partner',
      communities: 'Partners',
    },
    impact: {
      enabled: false,
      unitLabel: 'Hours Delivered',
      description: 'Track service delivery',
    },
  },
} as const;

/**
 * Get full business type configuration
 */
export function getBusinessTypeConfig(businessType: string | null | undefined): BusinessTypeConfig {
  const type = (businessType as BusinessType) || 'retail';
  return BUSINESS_TYPE_CONFIG[type] || BUSINESS_TYPE_CONFIG.retail;
}

/**
 * Get all business type options for selection
 */
export function getBusinessTypeOptions(): Array<{ value: BusinessType; label: string; description: string }> {
  return Object.entries(BUSINESS_TYPE_CONFIG).map(([value, config]) => ({
    value: value as BusinessType,
    label: config.label,
    description: config.description,
  }));
}

/**
 * Check if a feature is enabled for a business type
 */
export function isInventoryEnabledForType(businessType: string | null | undefined): boolean {
  const config = getBusinessTypeConfig(businessType);
  return config.inventory.enabled;
}

export function isImpactEnabledForType(businessType: string | null | undefined): boolean {
  const config = getBusinessTypeConfig(businessType);
  return config.impact.enabled;
}

// Finch Investments specific configuration (distribution tenant)
export const FINCH_TENANT_CONFIG = {
  business_type: 'distribution' as BusinessType,
  seedProfile: 'lifestraw',
  company_name: 'Finch Investments Limited',
  tagline: 'LifeStraw Distributor - Zambia',
  impact: {
    enabled: true,
    unitLabel: 'Liters Filtered',
    beneficiariesLabel: 'Lives Impacted',
  },
};
