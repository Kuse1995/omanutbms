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
      return getLifeStrawProducts();
    case 'services':
      return getServiceTemplates();
    default:
      return [];
  }
}

/**
 * LifeStraw products - Only for distribution business type
 */
function getLifeStrawProducts(): SeedProduct[] {
  return [
    {
      sku: 'LS-PERSONAL-001',
      name: 'LifeStraw Personal',
      description: 'Award-winning personal water filter for hiking, camping, and emergency preparedness',
      category: 'personal',
      unit_price: 450,
      original_price: 500,
      current_stock: 0,
      reorder_level: 20,
      liters_per_unit: 4000,
      features: [
        'Filters up to 4,000 liters of water',
        'Removes 99.99% of bacteria and parasites',
        'No batteries or electrical power needed',
        'Weighs only 57 grams',
      ],
      certifications: ['NSF P231', 'EPA Guide Standard'],
      highlight: 'Best Seller',
    },
    {
      sku: 'LS-GO-001',
      name: 'LifeStraw Go',
      description: 'Water filter bottle for everyday use and outdoor adventures',
      category: 'portable',
      unit_price: 650,
      original_price: 750,
      current_stock: 0,
      reorder_level: 15,
      liters_per_unit: 4000,
      features: [
        'Integrated filter in 650ml bottle',
        'BPA-free Tritan plastic',
        'Replaceable carbon filter',
        'Leak-proof design',
      ],
      certifications: ['NSF P231', 'BPA Free'],
      highlight: 'Popular Choice',
    },
    {
      sku: 'LS-FAMILY-001',
      name: 'LifeStraw Family 2.0',
      description: 'High-volume water purifier for family and group use',
      category: 'family',
      unit_price: 1200,
      original_price: 1400,
      current_stock: 0,
      reorder_level: 10,
      liters_per_unit: 18000,
      features: [
        'Filters 18,000 liters of water',
        'Gravity-fed system - no pumping',
        'Removes viruses, bacteria, and parasites',
        'Ideal for 5+ person households',
      ],
      certifications: ['NSF P231', 'NSF P248', 'US EPA'],
      highlight: 'Family Favorite',
    },
    {
      sku: 'LS-COMMUNITY-001',
      name: 'LifeStraw Community',
      description: 'High-capacity purifier for schools, health centers, and community settings',
      category: 'community',
      unit_price: 4500,
      original_price: 5000,
      current_stock: 0,
      reorder_level: 5,
      liters_per_unit: 100000,
      features: [
        'Filters 100,000 liters of water',
        'Serves up to 100 people daily',
        'Includes educational materials',
        'Durable design for institutional use',
      ],
      certifications: ['NSF P231', 'NSF P248', 'US EPA'],
      highlight: 'High Impact',
    },
    {
      sku: 'LS-MAX-001',
      name: 'LifeStraw Max',
      description: 'High-flow portable water filter for groups and base camps',
      category: 'portable',
      unit_price: 2800,
      original_price: 3200,
      current_stock: 0,
      reorder_level: 8,
      liters_per_unit: 10000,
      features: [
        'High-flow rate for groups',
        'Removes heavy metals including lead',
        'Backflush cleaning system',
        'Compact and portable',
      ],
      certifications: ['NSF P231', 'NSF 53'],
      highlight: 'Premium',
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
