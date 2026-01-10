import { useTenant } from './useTenant';
import { 
  getBusinessTypeConfig, 
  BusinessTypeConfig, 
  BusinessType,
  TerminologyConfig,
  ImpactConfig,
  InventoryConfig,
  DashboardLayoutConfig 
} from '@/lib/business-type-config';

export interface UseBusinessConfigReturn {
  loading: boolean;
  businessType: BusinessType;
  config: BusinessTypeConfig;
  terminology: TerminologyConfig;
  impact: ImpactConfig;
  inventory: InventoryConfig;
  layout: DashboardLayoutConfig;
  // Tenant branding
  companyName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  currencySymbol: string;
  // Feature checks
  isImpactEnabled: boolean;
  isInventoryEnabled: boolean;
}

/**
 * Unified hook that provides all business type configuration and tenant branding
 * Single source of truth for business-type-driven behavior
 */
export function useBusinessConfig(): UseBusinessConfigReturn {
  const { businessProfile, loading } = useTenant();
  
  const businessType = (businessProfile?.business_type as BusinessType) || 'retail';
  const config = getBusinessTypeConfig(businessType);

  return {
    loading,
    businessType,
    config,
    terminology: config.terminology,
    impact: config.impact,
    inventory: config.inventory,
    layout: config.layout,
    // Tenant branding from business profile
    companyName: businessProfile?.company_name ?? null,
    tagline: businessProfile?.tagline ?? null,
    logoUrl: businessProfile?.logo_url ?? null,
    companyEmail: businessProfile?.company_email ?? null,
    companyPhone: businessProfile?.company_phone ?? null,
    companyAddress: businessProfile?.company_address ?? null,
    currencySymbol: businessProfile?.currency_symbol ?? 'K',
    // Feature checks
    isImpactEnabled: config.impact.enabled && (businessProfile?.impact_enabled !== false),
    isInventoryEnabled: config.inventory.enabled && (businessProfile?.inventory_enabled !== false),
  };
}
