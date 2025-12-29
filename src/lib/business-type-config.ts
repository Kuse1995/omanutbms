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

export interface FormFieldConfig {
  skuPlaceholder: string;
  namePlaceholder: string;
  highlightPlaceholder: string;
  descriptionPlaceholder: string;
  featuresPlaceholder: string;
  categories: Array<{ value: string; label: string }>;
  certificationsLabel: string;
  certifications: Array<{ value: string; label: string }>;
  defaultSpecs: Array<{ label: string; value: string }>;
  hideStock?: boolean;
  hideLitersPerUnit?: boolean;
}

export interface BusinessTypeConfig {
  label: string;
  description: string;
  inventory: InventoryConfig;
  terminology: TerminologyConfig;
  impact: ImpactConfig;
  formFields: FormFieldConfig;
}

export const BUSINESS_TYPE_CONFIG: Record<BusinessType, BusinessTypeConfig> = {
  distribution: {
    label: 'Distribution Business',
    description: 'Distribute products through agent networks',
    inventory: {
      enabled: true,
      seedProfile: 'generic',
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
    formFields: {
      skuPlaceholder: 'e.g., DIST-001',
      namePlaceholder: 'e.g., Wholesale Item',
      highlightPlaceholder: 'e.g., Bulk Pack',
      descriptionPlaceholder: 'Product description for distribution...',
      featuresPlaceholder: 'Quality assured\nBulk packaging\nFast delivery',
      categories: [
        { value: 'primary', label: 'Primary' },
        { value: 'secondary', label: 'Secondary' },
        { value: 'bulk', label: 'Bulk' },
        { value: 'premium', label: 'Premium' },
        { value: 'wholesale', label: 'Wholesale' },
      ],
      certificationsLabel: 'Certifications',
      certifications: [
        { value: 'quality', label: 'Quality Certified' },
        { value: 'eco-friendly', label: 'Eco-Friendly' },
        { value: 'iso', label: 'ISO Certified' },
        { value: 'safety', label: 'Safety Tested' },
        { value: 'organic', label: 'Organic' },
        { value: 'fair-trade', label: 'Fair Trade' },
      ],
      defaultSpecs: [
        { label: 'Material', value: '' },
        { label: 'Dimensions', value: '' },
        { label: 'Weight', value: '' },
        { label: 'Warranty', value: '' },
      ],
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
    formFields: {
      skuPlaceholder: 'e.g., PROD-001',
      namePlaceholder: 'e.g., Product Name',
      highlightPlaceholder: 'e.g., Best Seller',
      descriptionPlaceholder: 'Product description for customers...',
      featuresPlaceholder: 'High quality materials\nDurable design\n1 year warranty',
      categories: [
        { value: 'electronics', label: 'Electronics' },
        { value: 'clothing', label: 'Clothing' },
        { value: 'food', label: 'Food & Beverage' },
        { value: 'household', label: 'Household' },
        { value: 'health', label: 'Health & Beauty' },
        { value: 'other', label: 'Other' },
      ],
      certificationsLabel: 'Certifications',
      certifications: [
        { value: 'quality', label: 'Quality Certified' },
        { value: 'eco-friendly', label: 'Eco-Friendly' },
        { value: 'iso', label: 'ISO Certified' },
        { value: 'safety', label: 'Safety Tested' },
        { value: 'organic', label: 'Organic' },
        { value: 'fair-trade', label: 'Fair Trade' },
      ],
      defaultSpecs: [
        { label: 'Material', value: '' },
        { label: 'Dimensions', value: '' },
        { label: 'Weight', value: '' },
        { label: 'Warranty', value: '' },
      ],
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
    formFields: {
      skuPlaceholder: 'e.g., FEE-001',
      namePlaceholder: 'e.g., Tuition Fee',
      highlightPlaceholder: 'e.g., Term 1',
      descriptionPlaceholder: 'Fee or resource description...',
      featuresPlaceholder: 'Includes textbooks\nLab access\nLibrary membership',
      categories: [
        { value: 'tuition', label: 'Tuition' },
        { value: 'supplies', label: 'Supplies' },
        { value: 'activity', label: 'Activity Fee' },
        { value: 'uniform', label: 'Uniform' },
        { value: 'other', label: 'Other' },
      ],
      certificationsLabel: 'Accreditations',
      certifications: [
        { value: 'accredited', label: 'Accredited' },
        { value: 'approved', label: 'Government Approved' },
        { value: 'certified', label: 'Certified Program' },
      ],
      defaultSpecs: [
        { label: 'Duration', value: '' },
        { label: 'Grade Level', value: '' },
        { label: 'Term', value: '' },
      ],
      hideStock: true,
      hideLitersPerUnit: true,
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
    formFields: {
      skuPlaceholder: 'e.g., AID-001',
      namePlaceholder: 'e.g., Relief Supplies',
      highlightPlaceholder: 'e.g., Emergency Kit',
      descriptionPlaceholder: 'Item description for donors...',
      featuresPlaceholder: 'Provides clean water\nSupports 1 family\nIncludes training',
      categories: [
        { value: 'relief', label: 'Relief Supplies' },
        { value: 'medical', label: 'Medical' },
        { value: 'education', label: 'Education' },
        { value: 'infrastructure', label: 'Infrastructure' },
        { value: 'emergency', label: 'Emergency' },
      ],
      certificationsLabel: 'Compliance',
      certifications: [
        { value: 'verified', label: 'Verified' },
        { value: 'audited', label: 'Audited' },
        { value: 'transparent', label: 'Transparent' },
        { value: 'sustainable', label: 'Sustainable' },
      ],
      defaultSpecs: [
        { label: 'Impact Per Unit', value: '' },
        { label: 'Beneficiaries', value: '' },
        { label: 'Duration', value: '' },
      ],
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
    formFields: {
      skuPlaceholder: 'e.g., SVC-001',
      namePlaceholder: 'e.g., Social Media Management',
      highlightPlaceholder: 'e.g., Full-Service Package',
      descriptionPlaceholder: 'Describe the service you provide...',
      featuresPlaceholder: 'Monthly reporting\n24/7 support\nDedicated manager',
      categories: [
        { value: 'consultation', label: 'Consultation' },
        { value: 'project', label: 'Project Work' },
        { value: 'retainer', label: 'Retainer' },
        { value: 'training', label: 'Training' },
        { value: 'support', label: 'Support' },
        { value: 'package', label: 'Package' },
      ],
      certificationsLabel: 'Qualifications',
      certifications: [
        { value: 'certified-partner', label: 'Certified Partner' },
        { value: 'industry-expert', label: 'Industry Expert' },
        { value: 'licensed', label: 'Licensed Professional' },
        { value: 'insured', label: 'Fully Insured' },
        { value: 'award-winning', label: 'Award Winning' },
        { value: 'verified', label: 'Verified Provider' },
      ],
      defaultSpecs: [
        { label: 'Delivery Time', value: '' },
        { label: 'Revisions Included', value: '' },
        { label: 'Support Hours', value: '' },
        { label: 'Service Guarantee', value: '' },
      ],
      hideStock: true,
      hideLitersPerUnit: true,
    },
  },
};

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
