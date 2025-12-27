import { useTenant } from './useTenant';
import { getBrandingFromProfile, BrandingConfig, DEFAULT_BRANDING, VENDOR_BRANDING } from '@/lib/branding-config';

export interface UseBrandingReturn extends BrandingConfig {
  loading: boolean;
  showPoweredBy: boolean;
  vendorName: string;
  vendorUrl: string;
}

/**
 * Hook to access tenant branding configuration
 * Provides a unified interface for all branding-related data
 */
export function useBranding(): UseBrandingReturn {
  const { businessProfile, loading } = useTenant();

  const branding = getBrandingFromProfile(businessProfile);

  return {
    ...branding,
    loading,
    showPoweredBy: !branding.isWhiteLabel,
    vendorName: VENDOR_BRANDING.name,
    vendorUrl: VENDOR_BRANDING.url,
  };
}

/**
 * Get static branding for SSR or non-React contexts
 * Always returns defaults since we can't access tenant data
 */
export function getStaticBranding(): BrandingConfig {
  return DEFAULT_BRANDING;
}
