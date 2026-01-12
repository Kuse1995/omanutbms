// Branding configuration for white-label multi-tenant SaaS
// This is the single source of truth for all branding defaults

export interface BrandingConfig {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  tagline: string | null;
  slogan: string | null;
  isWhiteLabel: boolean;
}

// Default neutral branding (used when no tenant branding is configured)
export const DEFAULT_BRANDING: BrandingConfig = {
  companyName: 'Omanut BMS',
  logoUrl: '/omanut-logo.png',
  primaryColor: '#004B8D',
  secondaryColor: '#0077B6',
  accentColor: '#10B981',
  tagline: 'Business Management System',
  slogan: null,
  isWhiteLabel: false,
};

// Vendor branding (shown in "Powered by" footer when not white-labeled)
export const VENDOR_BRANDING = {
  name: 'Omanut',
  url: 'https://omanut.com',
};

// Logo placeholder for tenants without a logo
export const DEFAULT_LOGO_PLACEHOLDER = '/placeholder.svg';

export interface BusinessProfileBranding {
  company_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  tagline?: string | null;
  slogan?: string | null;
  white_label_enabled?: boolean | null;
}

/**
 * Extract branding configuration from a business profile
 * Falls back to defaults for any missing values
 */
export function getBrandingFromProfile(profile: BusinessProfileBranding | null): BrandingConfig {
  if (!profile) {
    return DEFAULT_BRANDING;
  }

  return {
    companyName: profile.company_name || DEFAULT_BRANDING.companyName,
    logoUrl: profile.logo_url || null,
    primaryColor: profile.primary_color || DEFAULT_BRANDING.primaryColor,
    secondaryColor: profile.secondary_color || DEFAULT_BRANDING.secondaryColor,
    accentColor: profile.accent_color || DEFAULT_BRANDING.accentColor,
    tagline: profile.tagline || DEFAULT_BRANDING.tagline,
    slogan: profile.slogan || null,
    isWhiteLabel: profile.white_label_enabled ?? false,
  };
}

/**
 * Generate CSS custom properties from branding config
 * Can be used to apply tenant colors dynamically
 */
export function getBrandingCssVars(branding: BrandingConfig): Record<string, string> {
  return {
    '--brand-primary': branding.primaryColor,
    '--brand-secondary': branding.secondaryColor,
    '--brand-accent': branding.accentColor,
  };
}
