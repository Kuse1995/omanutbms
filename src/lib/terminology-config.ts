// Business type terminology mapping for dynamic UI labels

export type BusinessType = 'retail' | 'school' | 'ngo' | 'services';

export interface TerminologyMap {
  // Sales-related
  salesLabel: string;
  salesDescription: string;
  
  // Customer-related
  customerLabel: string;
  customersLabel: string;
  
  // Transaction-related
  transactionLabel: string;
  revenueLabel: string;
  
  // Product/Inventory-related
  inventoryLabel: string;
  productLabel: string;
  productsLabel: string;
  
  // Invoice-related
  invoiceLabel: string;
  invoicesLabel: string;
}

const terminologyMaps: Record<BusinessType, TerminologyMap> = {
  retail: {
    salesLabel: 'Sales',
    salesDescription: 'Record and manage sales transactions',
    customerLabel: 'Customer',
    customersLabel: 'Customers',
    transactionLabel: 'Sale',
    revenueLabel: 'Revenue',
    inventoryLabel: 'Inventory',
    productLabel: 'Product',
    productsLabel: 'Products',
    invoiceLabel: 'Invoice',
    invoicesLabel: 'Invoices',
  },
  school: {
    salesLabel: 'Fees',
    salesDescription: 'Record and manage student fee payments',
    customerLabel: 'Student',
    customersLabel: 'Students',
    transactionLabel: 'Fee Payment',
    revenueLabel: 'Fee Collections',
    inventoryLabel: 'Resources',
    productLabel: 'Resource',
    productsLabel: 'Resources',
    invoiceLabel: 'Fee Statement',
    invoicesLabel: 'Fee Statements',
  },
  ngo: {
    salesLabel: 'Contributions',
    salesDescription: 'Record and manage donor contributions',
    customerLabel: 'Donor',
    customersLabel: 'Donors',
    transactionLabel: 'Contribution',
    revenueLabel: 'Donations',
    inventoryLabel: 'Items',
    productLabel: 'Item',
    productsLabel: 'Items',
    invoiceLabel: 'Pledge',
    invoicesLabel: 'Pledges',
  },
  services: {
    salesLabel: 'Invoices',
    salesDescription: 'Record and manage client invoices',
    customerLabel: 'Client',
    customersLabel: 'Clients',
    transactionLabel: 'Invoice',
    revenueLabel: 'Revenue',
    inventoryLabel: 'Services',
    productLabel: 'Service',
    productsLabel: 'Services',
    invoiceLabel: 'Invoice',
    invoicesLabel: 'Invoices',
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
