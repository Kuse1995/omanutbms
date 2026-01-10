// Business Type Configuration - Single Source of Truth
// All behavior must be derived from the tenant's selected business_type

import type { DashboardTab } from '@/pages/Dashboard';

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
  // Item type value for database storage (aligns with business type)
  defaultItemType: 'product' | 'service' | 'item' | 'resource';
  // Whether this business primarily deals with services (simplifies UI)
  isServiceBased: boolean;
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

// Quick Action configuration
export interface QuickActionConfig {
  id: string;
  label: string;
  icon: string;
  targetTab: DashboardTab;
  highlight?: boolean;
}

// KPI Card configuration
export interface KPICardConfig {
  id: string;
  title: string;
  metric: 'inventory_value' | 'pending_invoices' | 'active_agents' | 'low_stock' | 'total_revenue' | 'active_clients' | 'students_enrolled' | 'donations_received';
  icon: string;
  color: string;
  bgColor: string;
}

// Dashboard Layout configuration per business type
export interface DashboardLayoutConfig {
  defaultTab: DashboardTab;
  tabOrder: DashboardTab[];
  hiddenTabs: DashboardTab[];
  quickActions: QuickActionConfig[];
  kpiCards: KPICardConfig[];
  welcomeMessage: string;
  dashboardIcon: string;
}

export interface BusinessTypeConfig {
  label: string;
  description: string;
  inventory: InventoryConfig;
  terminology: TerminologyConfig;
  impact: ImpactConfig;
  formFields: FormFieldConfig;
  layout: DashboardLayoutConfig;
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
      defaultItemType: 'product',
      isServiceBased: false,
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
    layout: {
      defaultTab: 'dashboard',
      tabOrder: ['dashboard', 'agents', 'inventory', 'sales', 'receipts', 'accounts', 'communities', 'messages', 'hr', 'shop', 'contacts', 'website'],
      hiddenTabs: [],
      quickActions: [
        { id: 'new-distribution', label: 'New Distribution', icon: 'Truck', targetTab: 'sales', highlight: true },
        { id: 'manage-agents', label: 'Manage Agents', icon: 'Users', targetTab: 'agents' },
        { id: 'view-inventory', label: 'View Inventory', icon: 'Package', targetTab: 'inventory' },
      ],
      kpiCards: [
        { id: 'inventory-value', title: 'Total Inventory Value', metric: 'inventory_value', icon: 'Package', color: 'text-[#004B8D]', bgColor: 'bg-[#004B8D]/10' },
        { id: 'active-agents', title: 'Active Agents', metric: 'active_agents', icon: 'Users', color: 'text-teal-600', bgColor: 'bg-teal-500/10' },
        { id: 'pending-invoices', title: 'Pending Invoices', metric: 'pending_invoices', icon: 'DollarSign', color: 'text-[#0077B6]', bgColor: 'bg-[#0077B6]/10' },
        { id: 'low-stock', title: 'Low Stock Alerts', metric: 'low_stock', icon: 'AlertTriangle', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      ],
      welcomeMessage: 'Manage your distribution network and agent inventory',
      dashboardIcon: 'Truck',
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
      defaultItemType: 'product',
      isServiceBased: false,
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
    layout: {
      defaultTab: 'sales',
      tabOrder: ['dashboard', 'sales', 'receipts', 'inventory', 'shop', 'accounts', 'hr', 'contacts', 'website'],
      hiddenTabs: ['agents', 'communities', 'messages'],
      quickActions: [
        { id: 'new-sale', label: 'New Sale', icon: 'ShoppingCart', targetTab: 'sales', highlight: true },
        { id: 'browse-products', label: 'Browse Products', icon: 'Package', targetTab: 'inventory' },
        { id: 'view-receipts', label: 'View Receipts', icon: 'Receipt', targetTab: 'receipts' },
      ],
      kpiCards: [
        { id: 'total-revenue', title: "Today's Sales", metric: 'total_revenue', icon: 'DollarSign', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
        { id: 'inventory-value', title: 'Inventory Value', metric: 'inventory_value', icon: 'Package', color: 'text-[#004B8D]', bgColor: 'bg-[#004B8D]/10' },
        { id: 'pending-invoices', title: 'Pending Invoices', metric: 'pending_invoices', icon: 'FileText', color: 'text-[#0077B6]', bgColor: 'bg-[#0077B6]/10' },
        { id: 'low-stock', title: 'Low Stock Alerts', metric: 'low_stock', icon: 'AlertTriangle', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      ],
      welcomeMessage: 'Manage your retail sales and inventory',
      dashboardIcon: 'Store',
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
      defaultItemType: 'resource',
      isServiceBased: false,
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
    layout: {
      defaultTab: 'dashboard',
      tabOrder: ['dashboard', 'sales', 'receipts', 'accounts', 'hr', 'communities', 'contacts', 'website'],
      hiddenTabs: ['inventory', 'shop', 'agents', 'messages'],
      quickActions: [
        { id: 'collect-fee', label: 'Collect Fee', icon: 'CreditCard', targetTab: 'sales', highlight: true },
        { id: 'fee-statements', label: 'Fee Statements', icon: 'FileText', targetTab: 'accounts' },
        { id: 'view-students', label: 'Student Records', icon: 'GraduationCap', targetTab: 'communities' },
      ],
      kpiCards: [
        { id: 'fee-collections', title: 'Fee Collections', metric: 'total_revenue', icon: 'CreditCard', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
        { id: 'students-enrolled', title: 'Students Enrolled', metric: 'students_enrolled', icon: 'GraduationCap', color: 'text-[#004B8D]', bgColor: 'bg-[#004B8D]/10' },
        { id: 'pending-fees', title: 'Outstanding Fees', metric: 'pending_invoices', icon: 'Clock', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      ],
      welcomeMessage: 'Manage student fees and academic resources',
      dashboardIcon: 'GraduationCap',
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
      defaultItemType: 'item',
      isServiceBased: false,
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
    layout: {
      defaultTab: 'dashboard',
      tabOrder: ['dashboard', 'communities', 'sales', 'receipts', 'inventory', 'accounts', 'messages', 'hr', 'contacts', 'website'],
      hiddenTabs: ['shop', 'agents'],
      quickActions: [
        { id: 'record-donation', label: 'Record Contribution', icon: 'Heart', targetTab: 'sales', highlight: true },
        { id: 'donor-report', label: 'Donor Report', icon: 'FileText', targetTab: 'accounts' },
        { id: 'impact-tracking', label: 'Impact Tracking', icon: 'TrendingUp', targetTab: 'communities' },
      ],
      kpiCards: [
        { id: 'donations', title: 'Donations Received', metric: 'donations_received', icon: 'Heart', color: 'text-rose-600', bgColor: 'bg-rose-500/10' },
        { id: 'beneficiaries', title: 'Beneficiaries Reached', metric: 'active_clients', icon: 'Users', color: 'text-[#004B8D]', bgColor: 'bg-[#004B8D]/10' },
        { id: 'inventory-value', title: 'Relief Supplies', metric: 'inventory_value', icon: 'Package', color: 'text-teal-600', bgColor: 'bg-teal-500/10' },
        { id: 'pending', title: 'Pending Pledges', metric: 'pending_invoices', icon: 'Clock', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      ],
      welcomeMessage: 'Track donations, beneficiaries, and social impact',
      dashboardIcon: 'Heart',
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
      defaultItemType: 'service',
      isServiceBased: true,
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
    layout: {
      defaultTab: 'sales',
      tabOrder: ['dashboard', 'sales', 'receipts', 'accounts', 'inventory', 'hr', 'contacts', 'website'],
      hiddenTabs: ['shop', 'agents', 'communities', 'messages'],
      quickActions: [
        { id: 'new-invoice', label: 'Create Invoice', icon: 'FileText', targetTab: 'sales', highlight: true },
        { id: 'client-list', label: 'Client List', icon: 'Users', targetTab: 'accounts' },
        { id: 'service-catalog', label: 'Service Catalog', icon: 'Briefcase', targetTab: 'inventory' },
      ],
      kpiCards: [
        { id: 'revenue', title: 'Revenue MTD', metric: 'total_revenue', icon: 'TrendingUp', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
        { id: 'active-clients', title: 'Active Clients', metric: 'active_clients', icon: 'Users', color: 'text-[#004B8D]', bgColor: 'bg-[#004B8D]/10' },
        { id: 'pending-invoices', title: 'Pending Invoices', metric: 'pending_invoices', icon: 'Clock', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      ],
      welcomeMessage: 'Manage client projects, invoices, and service delivery',
      dashboardIcon: 'Briefcase',
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
