// Business type terminology mapping for dynamic UI labels
// Standardized for multi-industry support
// NOTE: This file is maintained for backward compatibility
// New code should use business-type-config.ts as the single source of truth

export type BusinessType = 'distribution' | 'retail' | 'school' | 'ngo' | 'services' | 'agriculture' | 'hospitality' | 'salon' | 'healthcare' | 'autoshop';

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
  
  // Item type value for database storage (aligns with business type)
  // This is the default item_type value when creating items/transactions
  defaultItemType: 'product' | 'service' | 'item' | 'resource';
  
  // Whether this business primarily deals with services (hides product/service toggle)
  isServiceBased: boolean;
  
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
    defaultItemType: 'product',
    isServiceBased: false,
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
    defaultItemType: 'product',
    isServiceBased: false,
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
    defaultItemType: 'resource',
    isServiceBased: false,
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
    defaultItemType: 'item',
    isServiceBased: false,
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
    defaultItemType: 'service',
    isServiceBased: true,
    invoiceLabel: 'Invoice',
    invoicesLabel: 'Invoices',
    impactLabel: 'Impact',
    impactUnitLabel: 'Hours Delivered',
    impactDescription: 'Track service delivery',
    communityLabel: 'Partner',
    communitiesLabel: 'Partners',
  },
  agriculture: {
    salesLabel: 'Sales',
    salesDescription: 'Record and manage produce sales',
    transactionLabel: 'Sale',
    transactionsLabel: 'Sales',
    revenueLabel: 'Farm Revenue',
    customerLabel: 'Buyer',
    customersLabel: 'Buyers',
    customerIdLabel: 'Buyer ID',
    inventoryLabel: 'Farm Inventory',
    productLabel: 'Produce',
    productsLabel: 'Produce',
    itemTypeLabel: 'Produce Type',
    defaultItemType: 'product',
    isServiceBased: false,
    invoiceLabel: 'Invoice',
    invoicesLabel: 'Invoices',
    impactLabel: 'Farm Impact',
    impactUnitLabel: 'Kg Produced',
    impactDescription: 'Track your farming impact',
    communityLabel: 'Cooperative',
    communitiesLabel: 'Cooperatives',
  },
  hospitality: {
    salesLabel: 'Orders',
    salesDescription: 'Record and manage guest orders',
    transactionLabel: 'Order',
    transactionsLabel: 'Orders',
    revenueLabel: 'Revenue',
    customerLabel: 'Guest',
    customersLabel: 'Guests',
    customerIdLabel: 'Guest ID',
    inventoryLabel: 'Stock',
    productLabel: 'Menu Item',
    productsLabel: 'Menu Items',
    itemTypeLabel: 'Item Type',
    defaultItemType: 'product',
    isServiceBased: false,
    invoiceLabel: 'Bill',
    invoicesLabel: 'Bills',
    impactLabel: 'Impact',
    impactUnitLabel: 'Guests Served',
    impactDescription: 'Track guest satisfaction',
    communityLabel: 'Venue',
    communitiesLabel: 'Venues',
  },
  salon: {
    salesLabel: 'Appointments',
    salesDescription: 'Record and manage client appointments',
    transactionLabel: 'Appointment',
    transactionsLabel: 'Appointments',
    revenueLabel: 'Revenue',
    customerLabel: 'Client',
    customersLabel: 'Clients',
    customerIdLabel: 'Client ID',
    inventoryLabel: 'Services & Products',
    productLabel: 'Service',
    productsLabel: 'Services',
    itemTypeLabel: 'Service Type',
    defaultItemType: 'service',
    isServiceBased: true,
    invoiceLabel: 'Receipt',
    invoicesLabel: 'Receipts',
    impactLabel: 'Impact',
    impactUnitLabel: 'Clients Served',
    impactDescription: 'Track client satisfaction',
    communityLabel: 'Partner',
    communitiesLabel: 'Partners',
  },
  healthcare: {
    salesLabel: 'Consultations',
    salesDescription: 'Record and manage patient consultations',
    transactionLabel: 'Consultation',
    transactionsLabel: 'Consultations',
    revenueLabel: 'Revenue',
    customerLabel: 'Patient',
    customersLabel: 'Patients',
    customerIdLabel: 'Patient ID',
    inventoryLabel: 'Pharmacy & Services',
    productLabel: 'Service',
    productsLabel: 'Services',
    itemTypeLabel: 'Service Type',
    defaultItemType: 'service',
    isServiceBased: true,
    invoiceLabel: 'Bill',
    invoicesLabel: 'Bills',
    impactLabel: 'Healthcare Impact',
    impactUnitLabel: 'Patients Served',
    impactDescription: 'Track healthcare impact',
    communityLabel: 'Facility',
    communitiesLabel: 'Facilities',
  },
  autoshop: {
    salesLabel: 'Job Cards',
    salesDescription: 'Record and manage repair job cards',
    transactionLabel: 'Job Card',
    transactionsLabel: 'Job Cards',
    revenueLabel: 'Revenue',
    customerLabel: 'Customer',
    customersLabel: 'Customers',
    customerIdLabel: 'Customer ID',
    inventoryLabel: 'Parts & Services',
    productLabel: 'Part',
    productsLabel: 'Parts',
    itemTypeLabel: 'Item Type',
    defaultItemType: 'product',
    isServiceBased: false,
    invoiceLabel: 'Invoice',
    invoicesLabel: 'Invoices',
    impactLabel: 'Impact',
    impactUnitLabel: 'Vehicles Serviced',
    impactDescription: 'Track service quality',
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
export function getTerm<K extends keyof TerminologyMap>(
  businessType: string | null | undefined,
  key: K
): TerminologyMap[K] {
  const terminology = getTerminology(businessType);
  return terminology[key];
}
