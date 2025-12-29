// Inventory seeding functions for different business types
// Only seeds inventory when explicitly requested during tenant setup

import { BusinessType } from './business-type-config';

export interface SeedProduct {
  sku: string;
  name: string;
  description: string;
  category: string;
  unit_price: number;
  original_price?: number;
  current_stock: number;
  reorder_level: number;
  liters_per_unit?: number;
  features?: string[];
  certifications?: string[];
  highlight?: string;
}

/**
 * Get seed inventory based on business type
 */
export function getSeedInventory(businessType: BusinessType): SeedProduct[] {
  switch (businessType) {
    case 'distribution':
      return getDistributionProducts();
    case 'services':
      return getServiceTemplates();
    case 'retail':
      return getRetailProducts();
    default:
      return [];
  }
}

/**
 * Generic distribution products - adaptable for any product line
 */
function getDistributionProducts(): SeedProduct[] {
  return [
    {
      sku: 'DIST-001',
      name: 'Sample Product A',
      description: 'Primary distribution product',
      category: 'primary',
      unit_price: 450,
      original_price: 500,
      current_stock: 0,
      reorder_level: 20,
      features: [
        'High quality',
        'Durable design',
        'Easy to use',
      ],
      highlight: 'Best Seller',
    },
    {
      sku: 'DIST-002',
      name: 'Sample Product B',
      description: 'Secondary distribution product',
      category: 'secondary',
      unit_price: 650,
      original_price: 750,
      current_stock: 0,
      reorder_level: 15,
      features: [
        'Premium quality',
        'Extended warranty',
        'Customer favorite',
      ],
      highlight: 'Popular Choice',
    },
    {
      sku: 'DIST-003',
      name: 'Sample Product C',
      description: 'Bulk distribution product',
      category: 'bulk',
      unit_price: 1200,
      original_price: 1400,
      current_stock: 0,
      reorder_level: 10,
      features: [
        'Large capacity',
        'Commercial grade',
        'Ideal for businesses',
      ],
      highlight: 'Bulk Value',
    },
  ];
}

/**
 * Generic retail products
 */
function getRetailProducts(): SeedProduct[] {
  return [
    {
      sku: 'RET-001',
      name: 'Retail Item A',
      description: 'Standard retail product',
      category: 'general',
      unit_price: 100,
      current_stock: 50,
      reorder_level: 10,
      features: ['Everyday use', 'Good value'],
    },
    {
      sku: 'RET-002',
      name: 'Retail Item B',
      description: 'Premium retail product',
      category: 'premium',
      unit_price: 250,
      current_stock: 30,
      reorder_level: 5,
      features: ['Premium quality', 'Gift ready'],
    },
  ];
}

/**
 * Service templates - For service business type
 */
function getServiceTemplates(): SeedProduct[] {
  return [
    {
      sku: 'SVC-CONSULT-001',
      name: 'Consultation Hour',
      description: 'One hour of professional consultation',
      category: 'consultation',
      unit_price: 150,
      current_stock: 999,
      reorder_level: 0,
      features: ['1-hour session', 'Expert advice', 'Follow-up notes'],
    },
    {
      sku: 'SVC-PROJECT-001',
      name: 'Project Day Rate',
      description: 'Full day of project work',
      category: 'project',
      unit_price: 800,
      current_stock: 999,
      reorder_level: 0,
      features: ['8-hour day', 'Deliverables included', 'Progress report'],
    },
    {
      sku: 'SVC-SUPPORT-001',
      name: 'Support Package',
      description: 'Monthly support and maintenance',
      category: 'support',
      unit_price: 500,
      current_stock: 999,
      reorder_level: 0,
      features: ['Monthly retainer', 'Priority response', 'Regular check-ins'],
    },
  ];
}

/**
 * Seed inventory for a tenant
 * This should be called during tenant setup if seeding is requested
 */
export async function seedTenantInventory(
  supabase: any,
  tenantId: string,
  businessType: BusinessType
): Promise<{ success: boolean; count: number; error?: string }> {
  const products = getSeedInventory(businessType);
  
  if (products.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const inventoryItems = products.map((product) => ({
      ...product,
      tenant_id: tenantId,
      status: 'healthy',
    }));

    const { error } = await supabase
      .from('inventory')
      .insert(inventoryItems);

    if (error) throw error;

    return { success: true, count: products.length };
  } catch (error: any) {
    console.error('Error seeding inventory:', error);
    return { success: false, count: 0, error: error.message };
  }
}
