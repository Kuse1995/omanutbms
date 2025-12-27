// Business type terminology mapping for dynamic UI labels
// Standardized for multi-industry support
// NOTE: This file is maintained for backward compatibility
// New code should use business-type-config.ts as the single source of truth

export type BusinessType = 'distribution' | 'retail' | 'school' | 'ngo' | 'services';

export interface TerminologyMap {
  // Sales/Transaction-related (unified internally as "transactions")
  salesLabel: string;
  salesDescription: string;
  transactionLabel: string;
  transactionsLabel: string;
  revenueLabel: string;
  
  // Customer-related (unified internally as "customers")
  customerLabel: string;
  customersLabel: string;
  customerIdLabel: string;
  
  // Product/Inventory-related (supports physical, service, asset types)
  inventoryLabel: string;
  productLabel: string;
  productsLabel: string;
  itemTypeLabel: string;
  
  // Invoice-related
  invoiceLabel: string;
  invoicesLabel: string;
  
  // Impact-related (configurable per tenant)
  impactLabel: string;
  impactUnitLabel: string;
  impactDescription: string;
  
  // Community/Outreach-related
  communityLabel: string;
  communitiesLabel: string;
}

const terminologyMaps: Record<BusinessType, TerminologyMap> = {
  distribution: {
    salesLabel: 'Distributions',
    salesDescription: 'Record and manage agent distributions',
    transactionLabel: 'Distribution',
    transactionsLabel: 'Distributions',
    revenueLabel: 'Sales Revenue',
    customerLabel: 'Agent',
    customersLabel: 'Agents',
    customerIdLabel: 'Agent ID',
    inventoryLabel: 'Inventory',
    productLabel: 'Product',
    productsLabel: 'Products',
    itemTypeLabel: 'Product Type',
    invoiceLabel: 'Invoice',
    invoicesLabel: 'Invoices',
    impactLabel: 'Impact',
    impactUnitLabel: 'Impact Units',
    impactDescription: 'Track your distribution impact',
    communityLabel: 'Community',
    communitiesLabel: 'Communities',
  },
  retail: {
    salesLabel: 'Sales',
    salesDescription: 'Record and manage sales transactions',
    transactionLabel: 'Sale',
    transactionsLabel: 'Sales',
    revenueLabel: 'Revenue',
    customerLabel: 'Customer',
    customersLabel: 'Customers',
    customerIdLabel: 'Customer ID',
    inventoryLabel: 'Inventory',
    productLabel: 'Product',
    productsLabel: 'Products',
    itemTypeLabel: 'Product Type',
    invoiceLabel: 'Invoice',
    invoicesLabel: 'Invoices',
    impactLabel: 'Impact',
    impactUnitLabel: 'Units',
    impactDescription: 'Track your business impact',
    communityLabel: 'Community',
    communitiesLabel: 'Communities',
  },
  school: {
    salesLabel: 'Fees',
    salesDescription: 'Record and manage student fee payments',
    transactionLabel: 'Fee Payment',
    transactionsLabel: 'Fee Payments',
    revenueLabel: 'Fee Collections',
    customerLabel: 'Student',
    customersLabel: 'Students',
    customerIdLabel: 'Student ID',
    inventoryLabel: 'Resources',
    productLabel: 'Resource',
    productsLabel: 'Resources',
    itemTypeLabel: 'Resource Type',
    invoiceLabel: 'Fee Statement',
    invoicesLabel: 'Fee Statements',
    impactLabel: 'Student Impact',
    impactUnitLabel: 'Students Served',
    impactDescription: 'Track student outcomes',
    communityLabel: 'School',
    communitiesLabel: 'Schools',
  },
  ngo: {
    salesLabel: 'Contributions',
    salesDescription: 'Record and manage donor contributions',
    transactionLabel: 'Contribution',
    transactionsLabel: 'Contributions',
    revenueLabel: 'Donations',
    customerLabel: 'Donor',
    customersLabel: 'Donors',
    customerIdLabel: 'Donor ID',
    inventoryLabel: 'Items',
    productLabel: 'Item',
    productsLabel: 'Items',
    itemTypeLabel: 'Item Type',
    invoiceLabel: 'Pledge',
    invoicesLabel: 'Pledges',
    impactLabel: 'Impact',
    impactUnitLabel: 'Impact Units',
    impactDescription: 'Track your social impact',
    communityLabel: 'Community',
    communitiesLabel: 'Communities',
  },
  services: {
    salesLabel: 'Invoices',
    salesDescription: 'Record and manage client invoices',
    transactionLabel: 'Invoice',
    transactionsLabel: 'Invoices',
    revenueLabel: 'Revenue',
    customerLabel: 'Client',
    customersLabel: 'Clients',
    customerIdLabel: 'Client ID',
    inventoryLabel: 'Services',
    productLabel: 'Service',
    productsLabel: 'Services',
    itemTypeLabel: 'Service Type',
    invoiceLabel: 'Invoice',
    invoicesLabel: 'Invoices',
    impactLabel: 'Impact',
    impactUnitLabel: 'Hours Delivered',
    impactDescription: 'Track service delivery',
    communityLabel: 'Partner',
    communitiesLabel: 'Partners',
  },
};

/**
 * Get terminology map based on business type
 * Defaults to 'retail' terminology if not specified
 */
export function getTerminology(businessType: string | null | undefined): TerminologyMap {
  const type = (businessType as BusinessType) || 'retail';
  return terminologyMaps[type] || terminologyMaps.retail;
}

/**
 * Get a specific term based on business type
 */
export function getTerm(
  businessType: string | null | undefined,
  key: keyof TerminologyMap
): string {
  const terminology = getTerminology(businessType);
  return terminology[key];
}
