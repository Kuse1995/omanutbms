// Business Type Configuration - Single Source of Truth
// All behavior must be derived from the tenant's selected business_type

import type { DashboardTab } from '@/pages/Dashboard';

export type BusinessType = 'distribution' | 'retail' | 'school' | 'ngo' | 'services' | 'agriculture' | 'hospitality' | 'salon' | 'healthcare' | 'autoshop' | 'hybrid' | 'fashion';

export interface InventoryConfig {
  enabled: boolean;
  seedProfile?: 'water_filtration' | 'generic' | 'services';
  allowVariants?: boolean;
  showCollections?: boolean;
  showFashionFields?: boolean;
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
  // Impact units configuration (replaces hardcoded "liters per unit")
  impactUnitsField?: {
    enabled: boolean;
    label: string;
    placeholder?: string;
  };
  // Fashion-specific field options
  materials?: Array<{ value: string; label: string }>;
  genders?: Array<{ value: string; label: string }>;
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
  metric: 'inventory_value' | 'pending_invoices' | 'active_agents' | 'low_stock' | 'total_revenue' | 'today_sales' | 'active_clients' | 'students_enrolled' | 'donations_received' | 'bookings_today' | 'appointments_today' | 'patients_today' | 'jobs_in_progress' | 'harvest_value' | 'livestock_count';
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
      impactUnitsField: {
        enabled: true,
        label: 'Impact Units per Item',
        placeholder: 'e.g., 1000',
      },
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
      impactUnitsField: { enabled: false, label: 'Impact Units' },
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
        { id: 'today-sales', title: "Today's Sales", metric: 'today_sales', icon: 'DollarSign', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
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
      impactUnitsField: { enabled: false, label: 'Impact Units' },
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
      featuresPlaceholder: 'Provides essential support\nSupports 1 family\nIncludes training',
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
      impactUnitsField: {
        enabled: true,
        label: 'Beneficiaries per Unit',
        placeholder: 'e.g., 5',
      },
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
      impactUnitsField: { enabled: false, label: 'Impact Units' },
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

  agriculture: {
    label: 'Agriculture / Farming',
    description: 'Manage farming operations and produce sales',
    inventory: {
      enabled: true,
      seedProfile: 'generic',
      allowVariants: true,
    },
    terminology: {
      product: 'Produce',
      products: 'Produce',
      customer: 'Buyer',
      customers: 'Buyers',
      customerId: 'Buyer ID',
      sale: 'Sale',
      sales: 'Sales',
      revenue: 'Farm Revenue',
      invoice: 'Invoice',
      invoices: 'Invoices',
      inventory: 'Farm Inventory',
      community: 'Cooperative',
      communities: 'Cooperatives',
      defaultItemType: 'product',
      isServiceBased: false,
    },
    impact: {
      enabled: true,
      unitLabel: 'Kg Produced',
      beneficiariesLabel: 'Households Fed',
      description: 'Track your farming impact',
    },
    formFields: {
      skuPlaceholder: 'e.g., CROP-001',
      namePlaceholder: 'e.g., Maize - Grade A',
      highlightPlaceholder: 'e.g., Organic',
      descriptionPlaceholder: 'Describe your produce...',
      featuresPlaceholder: 'Organically grown\nNo pesticides\nFreshly harvested',
      categories: [
        { value: 'crops', label: 'Crops' },
        { value: 'livestock', label: 'Livestock' },
        { value: 'poultry', label: 'Poultry' },
        { value: 'dairy', label: 'Dairy' },
        { value: 'seeds', label: 'Seeds' },
        { value: 'feed', label: 'Animal Feed' },
        { value: 'fertilizer', label: 'Fertilizer' },
      ],
      certificationsLabel: 'Certifications',
      certifications: [
        { value: 'organic', label: 'Organic' },
        { value: 'fair-trade', label: 'Fair Trade' },
        { value: 'zabs', label: 'ZABS Certified' },
        { value: 'phytosanitary', label: 'Phytosanitary' },
      ],
      defaultSpecs: [
        { label: 'Weight/Volume', value: '' },
        { label: 'Harvest Date', value: '' },
        { label: 'Origin', value: '' },
        { label: 'Storage', value: '' },
      ],
      impactUnitsField: {
        enabled: true,
        label: 'Yield per Unit (kg)',
        placeholder: 'e.g., 50',
      },
    },
    layout: {
      defaultTab: 'dashboard',
      tabOrder: ['dashboard', 'sales', 'receipts', 'inventory', 'accounts', 'hr', 'contacts', 'website'],
      hiddenTabs: ['agents', 'communities', 'messages', 'shop'],
      quickActions: [
        { id: 'record-sale', label: 'Record Sale', icon: 'ShoppingCart', targetTab: 'sales', highlight: true },
        { id: 'view-produce', label: 'View Produce', icon: 'Package', targetTab: 'inventory' },
        { id: 'stock-update', label: 'Stock Update', icon: 'TrendingUp', targetTab: 'inventory' },
      ],
      kpiCards: [
        { id: 'harvest-revenue', title: 'Harvest Revenue', metric: 'total_revenue', icon: 'TrendingUp', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
        { id: 'livestock-count', title: 'Livestock Count', metric: 'livestock_count', icon: 'Users', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
        { id: 'produce-stock', title: 'Produce in Stock', metric: 'inventory_value', icon: 'Package', color: 'text-[#004B8D]', bgColor: 'bg-[#004B8D]/10' },
        { id: 'pending-orders', title: 'Pending Orders', metric: 'pending_invoices', icon: 'Clock', color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
      ],
      welcomeMessage: 'Manage your farm operations and produce sales',
      dashboardIcon: 'Wheat',
    },
  },

  hospitality: {
    label: 'Hospitality Business',
    description: 'Manage restaurant, lodge, or catering operations',
    inventory: {
      enabled: true,
      seedProfile: 'generic',
      allowVariants: true,
    },
    terminology: {
      product: 'Menu Item',
      products: 'Menu Items',
      customer: 'Guest',
      customers: 'Guests',
      customerId: 'Guest ID',
      sale: 'Order',
      sales: 'Orders',
      revenue: 'Revenue',
      invoice: 'Bill',
      invoices: 'Bills',
      inventory: 'Stock',
      community: 'Venue',
      communities: 'Venues',
      defaultItemType: 'product',
      isServiceBased: false,
    },
    impact: {
      enabled: false,
    },
    formFields: {
      skuPlaceholder: 'e.g., MENU-001',
      namePlaceholder: 'e.g., Nshima with Chicken',
      highlightPlaceholder: 'e.g., Chef Special',
      descriptionPlaceholder: 'Describe the menu item or room...',
      featuresPlaceholder: 'Freshly prepared\nLocal ingredients\nServed hot',
      categories: [
        { value: 'food_beverage', label: 'Food & Beverage' },
        { value: 'accommodation', label: 'Accommodation' },
        { value: 'events', label: 'Events' },
        { value: 'catering', label: 'Catering' },
        { value: 'bar', label: 'Bar' },
      ],
      certificationsLabel: 'Standards',
      certifications: [
        { value: 'health-certified', label: 'Health Certified' },
        { value: 'tourism-graded', label: 'Tourism Graded' },
        { value: 'halal', label: 'Halal' },
        { value: 'hygiene', label: 'Hygiene Certified' },
      ],
      defaultSpecs: [
        { label: 'Serving Size', value: '' },
        { label: 'Preparation Time', value: '' },
        { label: 'Allergens', value: '' },
      ],
      impactUnitsField: { enabled: false, label: 'Impact Units' },
    },
    layout: {
      defaultTab: 'sales',
      tabOrder: ['dashboard', 'sales', 'receipts', 'inventory', 'accounts', 'hr', 'contacts', 'website'],
      hiddenTabs: ['agents', 'communities', 'messages'],
      quickActions: [
        { id: 'new-order', label: 'New Order', icon: 'ShoppingCart', targetTab: 'sales', highlight: true },
        { id: 'room-booking', label: 'Room Booking', icon: 'Calendar', targetTab: 'accounts' },
        { id: 'menu-items', label: 'Menu Items', icon: 'UtensilsCrossed', targetTab: 'inventory' },
      ],
      kpiCards: [
        { id: 'todays-revenue', title: "Today's Revenue", metric: 'total_revenue', icon: 'DollarSign', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
        { id: 'bookings-today', title: 'Bookings Today', metric: 'bookings_today', icon: 'Calendar', color: 'text-[#004B8D]', bgColor: 'bg-[#004B8D]/10' },
        { id: 'food-stock', title: 'Food Stock Value', metric: 'inventory_value', icon: 'Package', color: 'text-teal-600', bgColor: 'bg-teal-500/10' },
        { id: 'pending-bills', title: 'Pending Bills', metric: 'pending_invoices', icon: 'Clock', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      ],
      welcomeMessage: 'Manage orders, bookings, and guest services',
      dashboardIcon: 'UtensilsCrossed',
    },
  },

  salon: {
    label: 'Salon / Beauty',
    description: 'Manage salon appointments and beauty services',
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
      sale: 'Appointment',
      sales: 'Appointments',
      revenue: 'Revenue',
      invoice: 'Receipt',
      invoices: 'Receipts',
      inventory: 'Services & Products',
      community: 'Partner',
      communities: 'Partners',
      defaultItemType: 'service',
      isServiceBased: true,
    },
    impact: {
      enabled: false,
    },
    formFields: {
      skuPlaceholder: 'e.g., SVC-001',
      namePlaceholder: 'e.g., Braiding - Full Head',
      highlightPlaceholder: 'e.g., Popular Style',
      descriptionPlaceholder: 'Describe the service or treatment...',
      featuresPlaceholder: 'Professional styling\nQuality products used\nComfortable experience',
      categories: [
        { value: 'hair', label: 'Hair' },
        { value: 'nails', label: 'Nails' },
        { value: 'skincare', label: 'Skincare' },
        { value: 'makeup', label: 'Makeup' },
        { value: 'massage', label: 'Massage' },
        { value: 'bridal', label: 'Bridal' },
        { value: 'barbering', label: 'Barbering' },
      ],
      certificationsLabel: 'Qualifications',
      certifications: [
        { value: 'licensed', label: 'Licensed' },
        { value: 'trained', label: 'Professionally Trained' },
        { value: 'certified', label: 'Certified Stylist' },
      ],
      defaultSpecs: [
        { label: 'Duration', value: '' },
        { label: 'Products Used', value: '' },
        { label: 'Aftercare', value: '' },
      ],
      hideStock: true,
      impactUnitsField: { enabled: false, label: 'Impact Units' },
    },
    layout: {
      defaultTab: 'sales',
      tabOrder: ['dashboard', 'sales', 'receipts', 'inventory', 'accounts', 'hr', 'contacts', 'website'],
      hiddenTabs: ['agents', 'communities', 'messages', 'shop'],
      quickActions: [
        { id: 'new-appointment', label: 'New Appointment', icon: 'Calendar', targetTab: 'sales', highlight: true },
        { id: 'service-list', label: 'Service List', icon: 'Scissors', targetTab: 'inventory' },
        { id: 'record-payment', label: 'Record Payment', icon: 'CreditCard', targetTab: 'receipts' },
      ],
      kpiCards: [
        { id: 'todays-revenue', title: "Today's Revenue", metric: 'total_revenue', icon: 'DollarSign', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
        { id: 'appointments-today', title: 'Appointments Today', metric: 'appointments_today', icon: 'Calendar', color: 'text-[#004B8D]', bgColor: 'bg-[#004B8D]/10' },
        { id: 'product-stock', title: 'Product Stock', metric: 'inventory_value', icon: 'Package', color: 'text-pink-600', bgColor: 'bg-pink-500/10' },
        { id: 'outstanding-bills', title: 'Outstanding Bills', metric: 'pending_invoices', icon: 'Clock', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      ],
      welcomeMessage: 'Manage appointments, services, and client beauty needs',
      dashboardIcon: 'Scissors',
    },
  },

  healthcare: {
    label: 'Healthcare / Clinic',
    description: 'Manage patient consultations and medical services',
    inventory: {
      enabled: true,
      seedProfile: 'generic',
    },
    terminology: {
      product: 'Service',
      products: 'Services',
      customer: 'Patient',
      customers: 'Patients',
      customerId: 'Patient ID',
      sale: 'Consultation',
      sales: 'Consultations',
      revenue: 'Revenue',
      invoice: 'Bill',
      invoices: 'Bills',
      inventory: 'Pharmacy & Services',
      community: 'Facility',
      communities: 'Facilities',
      defaultItemType: 'service',
      isServiceBased: true,
    },
    impact: {
      enabled: true,
      unitLabel: 'Patients Served',
      beneficiariesLabel: 'Lives Improved',
      description: 'Track healthcare impact',
    },
    formFields: {
      skuPlaceholder: 'e.g., MED-001',
      namePlaceholder: 'e.g., General Consultation',
      highlightPlaceholder: 'e.g., Specialist Service',
      descriptionPlaceholder: 'Describe the service or medication...',
      featuresPlaceholder: 'Professional care\nQualified staff\nConfidential',
      categories: [
        { value: 'consultation_fee', label: 'Consultation' },
        { value: 'medication', label: 'Medication' },
        { value: 'lab_test', label: 'Lab Test' },
        { value: 'procedure', label: 'Procedure' },
        { value: 'vaccination', label: 'Vaccination' },
      ],
      certificationsLabel: 'Accreditations',
      certifications: [
        { value: 'hpcz', label: 'HPCZ Registered' },
        { value: 'moh', label: 'MOH Approved' },
        { value: 'quality', label: 'Quality Certified' },
      ],
      defaultSpecs: [
        { label: 'Dosage', value: '' },
        { label: 'Duration', value: '' },
        { label: 'Instructions', value: '' },
      ],
      impactUnitsField: {
        enabled: true,
        label: 'Patients per Treatment',
        placeholder: 'e.g., 1',
      },
    },
    layout: {
      defaultTab: 'dashboard',
      tabOrder: ['dashboard', 'sales', 'receipts', 'inventory', 'accounts', 'hr', 'contacts', 'website'],
      hiddenTabs: ['agents', 'communities', 'messages', 'shop'],
      quickActions: [
        { id: 'new-consultation', label: 'New Consultation', icon: 'Stethoscope', targetTab: 'sales', highlight: true },
        { id: 'patient-records', label: 'Patient Records', icon: 'FileText', targetTab: 'accounts' },
        { id: 'dispense-medication', label: 'Dispense Medication', icon: 'Pill', targetTab: 'inventory' },
      ],
      kpiCards: [
        { id: 'daily-revenue', title: 'Daily Revenue', metric: 'total_revenue', icon: 'DollarSign', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
        { id: 'patients-today', title: 'Patients Today', metric: 'patients_today', icon: 'Stethoscope', color: 'text-[#004B8D]', bgColor: 'bg-[#004B8D]/10' },
        { id: 'pharmacy-stock', title: 'Pharmacy Stock', metric: 'inventory_value', icon: 'Package', color: 'text-teal-600', bgColor: 'bg-teal-500/10' },
        { id: 'pending-bills', title: 'Pending Bills', metric: 'pending_invoices', icon: 'Clock', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      ],
      welcomeMessage: 'Manage patient consultations and healthcare services',
      dashboardIcon: 'Stethoscope',
    },
  },

  autoshop: {
    label: 'Auto Shop / Garage',
    description: 'Manage vehicle repairs and parts inventory',
    inventory: {
      enabled: true,
      seedProfile: 'generic',
      allowVariants: true,
    },
    terminology: {
      product: 'Part',
      products: 'Parts',
      customer: 'Customer',
      customers: 'Customers',
      customerId: 'Customer ID',
      sale: 'Job Card',
      sales: 'Job Cards',
      revenue: 'Revenue',
      invoice: 'Invoice',
      invoices: 'Invoices',
      inventory: 'Parts & Services',
      community: 'Partner',
      communities: 'Partners',
      defaultItemType: 'product',
      isServiceBased: false,
    },
    impact: {
      enabled: false,
    },
    formFields: {
      skuPlaceholder: 'e.g., PART-001',
      namePlaceholder: 'e.g., Brake Pad Set - Toyota',
      highlightPlaceholder: 'e.g., OEM Quality',
      descriptionPlaceholder: 'Describe the part or service...',
      featuresPlaceholder: 'OEM quality\nWarranty included\nProfessional installation',
      categories: [
        { value: 'repair', label: 'Repair' },
        { value: 'service_auto', label: 'Service' },
        { value: 'parts', label: 'Parts' },
        { value: 'tyres', label: 'Tyres' },
        { value: 'accessories', label: 'Accessories' },
        { value: 'bodywork', label: 'Body Work' },
      ],
      certificationsLabel: 'Certifications',
      certifications: [
        { value: 'oem', label: 'OEM Quality' },
        { value: 'warranty', label: 'Warranty Provided' },
        { value: 'certified-mechanic', label: 'Certified Mechanics' },
      ],
      defaultSpecs: [
        { label: 'Compatibility', value: '' },
        { label: 'Warranty Period', value: '' },
        { label: 'Brand', value: '' },
      ],
      impactUnitsField: { enabled: false, label: 'Impact Units' },
    },
    layout: {
      defaultTab: 'sales',
      tabOrder: ['dashboard', 'sales', 'receipts', 'inventory', 'accounts', 'hr', 'contacts', 'website'],
      hiddenTabs: ['agents', 'communities', 'messages'],
      quickActions: [
        { id: 'new-job-card', label: 'New Job Card', icon: 'Wrench', targetTab: 'sales', highlight: true },
        { id: 'parts-inventory', label: 'Parts Inventory', icon: 'Package', targetTab: 'inventory' },
        { id: 'record-payment', label: 'Record Payment', icon: 'CreditCard', targetTab: 'receipts' },
      ],
      kpiCards: [
        { id: 'jobs-revenue', title: 'Jobs Revenue', metric: 'total_revenue', icon: 'DollarSign', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
        { id: 'jobs-in-progress', title: 'Jobs In Progress', metric: 'jobs_in_progress', icon: 'Wrench', color: 'text-[#004B8D]', bgColor: 'bg-[#004B8D]/10' },
        { id: 'parts-stock', title: 'Parts Stock', metric: 'inventory_value', icon: 'Package', color: 'text-teal-600', bgColor: 'bg-teal-500/10' },
        { id: 'pending-invoices', title: 'Pending Invoices', metric: 'pending_invoices', icon: 'Clock', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      ],
      welcomeMessage: 'Manage vehicle repairs, parts, and job cards',
      dashboardIcon: 'Wrench',
    },
  },

  hybrid: {
    label: 'Hybrid Business',
    description: 'Sell products and offer services',
    inventory: {
      enabled: true,
      seedProfile: 'generic',
      allowVariants: true,
    },
    terminology: {
      product: 'Item',
      products: 'Items',
      customer: 'Customer',
      customers: 'Customers',
      customerId: 'Customer ID',
      sale: 'Transaction',
      sales: 'Transactions',
      revenue: 'Revenue',
      invoice: 'Invoice',
      invoices: 'Invoices',
      inventory: 'Products & Services',
      community: 'Partner',
      communities: 'Partners',
      defaultItemType: 'item',
      isServiceBased: false,
    },
    impact: {
      enabled: false,
    },
    formFields: {
      skuPlaceholder: 'e.g., ITM-001',
      namePlaceholder: 'e.g., Product or Service Name',
      highlightPlaceholder: 'e.g., Best Seller',
      descriptionPlaceholder: 'Describe your product or service...',
      featuresPlaceholder: 'Professional quality\nExpert service\nCustomer satisfaction',
      categories: [
        { value: 'products', label: 'Products' },
        { value: 'services', label: 'Services' },
        { value: 'packages', label: 'Packages' },
        { value: 'bundles', label: 'Bundles' },
        { value: 'parts', label: 'Parts' },
        { value: 'accessories', label: 'Accessories' },
        { value: 'maintenance_service', label: 'Maintenance' },
        { value: 'repair', label: 'Repair' },
        { value: 'consultation', label: 'Consultation' },
      ],
      certificationsLabel: 'Certifications',
      certifications: [
        { value: 'quality', label: 'Quality Certified' },
        { value: 'warranty', label: 'Warranty Provided' },
        { value: 'licensed', label: 'Licensed Professional' },
        { value: 'insured', label: 'Insured Service' },
      ],
      defaultSpecs: [
        { label: 'Type', value: '' },
        { label: 'Duration/Quantity', value: '' },
        { label: 'Warranty', value: '' },
      ],
      impactUnitsField: { enabled: false, label: 'Impact Units' },
    },
    layout: {
      defaultTab: 'sales',
      tabOrder: ['dashboard', 'sales', 'receipts', 'inventory', 'accounts', 'hr', 'contacts', 'website'],
      hiddenTabs: ['agents', 'communities', 'messages'],
      quickActions: [
        { id: 'new-transaction', label: 'New Transaction', icon: 'ShoppingCart', targetTab: 'sales', highlight: true },
        { id: 'manage-catalog', label: 'Products & Services', icon: 'Package', targetTab: 'inventory' },
        { id: 'view-receipts', label: 'View Receipts', icon: 'Receipt', targetTab: 'receipts' },
      ],
      kpiCards: [
        { id: 'total-revenue', title: "Today's Revenue", metric: 'total_revenue', icon: 'DollarSign', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
        { id: 'inventory-value', title: 'Catalog Value', metric: 'inventory_value', icon: 'Package', color: 'text-[#004B8D]', bgColor: 'bg-[#004B8D]/10' },
        { id: 'pending-invoices', title: 'Pending Invoices', metric: 'pending_invoices', icon: 'FileText', color: 'text-[#0077B6]', bgColor: 'bg-[#0077B6]/10' },
        { id: 'low-stock', title: 'Low Stock Alerts', metric: 'low_stock', icon: 'AlertTriangle', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      ],
      welcomeMessage: 'Manage your products, services, and customer transactions',
      dashboardIcon: 'Layers',
    },
  },

  fashion: {
    label: 'Fashion & Boutique',
    description: 'Clothing stores, boutiques, fashion retail',
    inventory: {
      enabled: true,
      seedProfile: 'generic',
      allowVariants: true,
      showCollections: true,
      showFashionFields: true,
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
      skuPlaceholder: 'e.g., DRESS-001',
      namePlaceholder: 'e.g., Floral Maxi Dress',
      highlightPlaceholder: 'e.g., New Arrival',
      descriptionPlaceholder: 'Describe the style, fit, and occasion...',
      featuresPlaceholder: 'Premium fabric\nTrue to size\nMachine washable',
      categories: [
        { value: 'clothing', label: 'Clothing' },
        { value: 'dresses', label: 'Dresses' },
        { value: 'tops', label: 'Tops & Blouses' },
        { value: 'bottoms', label: 'Pants & Skirts' },
        { value: 'outerwear', label: 'Outerwear' },
        { value: 'accessories', label: 'Accessories' },
        { value: 'footwear', label: 'Footwear' },
        { value: 'bags', label: 'Bags & Purses' },
        { value: 'jewelry', label: 'Jewelry' },
        { value: 'swimwear', label: 'Swimwear' },
        { value: 'activewear', label: 'Activewear' },
        { value: 'lingerie', label: 'Lingerie' },
      ],
      certificationsLabel: 'Labels & Certifications',
      certifications: [
        { value: 'sustainable', label: 'Sustainable' },
        { value: 'organic', label: 'Organic' },
        { value: 'fair-trade', label: 'Fair Trade' },
        { value: 'vegan', label: 'Vegan' },
        { value: 'handmade', label: 'Handmade' },
        { value: 'designer', label: 'Designer' },
      ],
      defaultSpecs: [
        { label: 'Material', value: '' },
        { label: 'Care Instructions', value: '' },
        { label: 'Fit', value: '' },
        { label: 'Origin', value: '' },
      ],
      impactUnitsField: { enabled: false, label: 'Impact Units' },
      materials: [
        { value: 'cotton', label: 'Cotton' },
        { value: 'silk', label: 'Silk' },
        { value: 'polyester', label: 'Polyester' },
        { value: 'denim', label: 'Denim' },
        { value: 'leather', label: 'Leather' },
        { value: 'wool', label: 'Wool' },
        { value: 'linen', label: 'Linen' },
        { value: 'cashmere', label: 'Cashmere' },
        { value: 'velvet', label: 'Velvet' },
        { value: 'chiffon', label: 'Chiffon' },
        { value: 'satin', label: 'Satin' },
        { value: 'nylon', label: 'Nylon' },
        { value: 'spandex', label: 'Spandex' },
        { value: 'mixed', label: 'Mixed Fabric' },
        { value: 'other', label: 'Other' },
      ],
      genders: [
        { value: 'Women', label: 'Women' },
        { value: 'Men', label: 'Men' },
        { value: 'Unisex', label: 'Unisex' },
        { value: 'Kids', label: 'Kids' },
      ],
    },
    layout: {
      defaultTab: 'sales',
      tabOrder: ['dashboard', 'sales', 'receipts', 'inventory', 'shop', 'accounts', 'hr', 'contacts', 'website'],
      hiddenTabs: ['agents', 'communities', 'messages'],
      quickActions: [
        { id: 'new-sale', label: 'New Sale', icon: 'ShoppingBag', targetTab: 'sales', highlight: true },
        { id: 'manage-inventory', label: 'Browse Collection', icon: 'Shirt', targetTab: 'inventory' },
        { id: 'view-receipts', label: 'View Receipts', icon: 'Receipt', targetTab: 'receipts' },
      ],
      kpiCards: [
        { id: 'today-sales', title: "Today's Sales", metric: 'today_sales', icon: 'DollarSign', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
        { id: 'inventory-value', title: 'Inventory Value', metric: 'inventory_value', icon: 'ShoppingBag', color: 'text-[#004B8D]', bgColor: 'bg-[#004B8D]/10' },
        { id: 'pending-invoices', title: 'Pending Invoices', metric: 'pending_invoices', icon: 'FileText', color: 'text-[#0077B6]', bgColor: 'bg-[#0077B6]/10' },
        { id: 'low-stock', title: 'Low Stock Alerts', metric: 'low_stock', icon: 'AlertTriangle', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
      ],
      welcomeMessage: 'Manage your fashion collections and inventory',
      dashboardIcon: 'Shirt',
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
