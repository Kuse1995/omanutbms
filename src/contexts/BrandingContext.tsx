import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BrandingConfig, DEFAULT_BRANDING, getBrandingFromProfile } from '@/lib/branding-config';

interface BrandingContextValue extends BrandingConfig {
  loading: boolean;
  tenantSlug: string | null;
  applyBranding: (config: BrandingConfig) => void;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

/**
 * Convert hex color to HSL values for CSS variables
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Generate CSS variable string from hex color
 */
function hexToHSLString(hex: string): string {
  const { h, s, l } = hexToHSL(hex);
  return `${h} ${s}% ${l}%`;
}

/**
 * Apply branding colors as CSS custom properties to the document root
 */
function applyBrandingToDocument(config: BrandingConfig) {
  const root = document.documentElement;
  
  // Convert hex colors to HSL for CSS variables
  const primaryHSL = hexToHSLString(config.primaryColor);
  const secondaryHSL = hexToHSLString(config.secondaryColor);
  const accentHSL = hexToHSLString(config.accentColor);
  
  // Get HSL components for derived colors
  const primaryParts = hexToHSL(config.primaryColor);
  const secondaryParts = hexToHSL(config.secondaryColor);
  
  // Apply brand colors
  root.style.setProperty('--brand-primary', config.primaryColor);
  root.style.setProperty('--brand-secondary', config.secondaryColor);
  root.style.setProperty('--brand-accent', config.accentColor);
  
  // Apply HSL values for Tailwind
  root.style.setProperty('--brand-primary-hsl', primaryHSL);
  root.style.setProperty('--brand-secondary-hsl', secondaryHSL);
  root.style.setProperty('--brand-accent-hsl', accentHSL);
  
  // When white-label is enabled, override the entire color scheme
  if (config.isWhiteLabel) {
    // Override primary theme colors with tenant branding
    root.style.setProperty('--primary', primaryHSL);
    root.style.setProperty('--ring', primaryHSL);
    
    // Override accent
    root.style.setProperty('--accent', accentHSL);
    
    // Override sidebar colors
    root.style.setProperty('--sidebar-background', `${primaryParts.h} ${Math.min(primaryParts.s + 20, 100)}% ${Math.max(primaryParts.l - 18, 15)}%`);
    root.style.setProperty('--sidebar-primary', `${primaryParts.h} ${primaryParts.s}% ${Math.min(primaryParts.l + 10, 65)}%`);
    root.style.setProperty('--sidebar-accent', `${primaryParts.h} ${Math.max(primaryParts.s - 20, 40)}% ${Math.max(primaryParts.l - 10, 25)}%`);
    root.style.setProperty('--sidebar-border', `${primaryParts.h} ${Math.max(primaryParts.s - 30, 30)}% ${Math.max(primaryParts.l - 5, 25)}%`);
    root.style.setProperty('--sidebar-ring', `${primaryParts.h} ${primaryParts.s}% ${Math.min(primaryParts.l + 10, 65)}%`);
    
    // Override brand colors used in legacy styles
    root.style.setProperty('--brand-blue', primaryHSL);
    root.style.setProperty('--brand-blue-light', `${primaryParts.h} ${Math.max(primaryParts.s - 5, 50)}% ${Math.min(primaryParts.l + 10, 65)}%`);
    root.style.setProperty('--brand-blue-dark', `${primaryParts.h} ${Math.min(primaryParts.s + 5, 90)}% ${Math.max(primaryParts.l - 10, 25)}%`);
    root.style.setProperty('--brand-teal', accentHSL);
    
    // Update gradients
    const gradientHero = `linear-gradient(135deg, hsl(${primaryHSL}) 0%, hsl(${primaryParts.h} ${Math.min(primaryParts.s + 5, 90)}% ${Math.max(primaryParts.l - 10, 25)}%) 100%)`;
    const gradientBlue = `linear-gradient(135deg, hsl(${primaryHSL}) 0%, hsl(${primaryParts.h} ${Math.max(primaryParts.s - 5, 50)}% ${Math.min(primaryParts.l + 10, 65)}%) 100%)`;
    root.style.setProperty('--gradient-hero', gradientHero);
    root.style.setProperty('--gradient-blue', gradientBlue);
  }
}

/**
 * Reset branding to defaults
 */
function resetBrandingOnDocument() {
  const root = document.documentElement;
  
  // Remove custom properties to fall back to CSS defaults
  const propsToRemove = [
    '--brand-primary', '--brand-secondary', '--brand-accent',
    '--brand-primary-hsl', '--brand-secondary-hsl', '--brand-accent-hsl',
    '--primary', '--ring', '--accent',
    '--sidebar-background', '--sidebar-primary', '--sidebar-accent', '--sidebar-border', '--sidebar-ring',
    '--brand-blue', '--brand-blue-light', '--brand-blue-dark', '--brand-teal',
    '--gradient-hero', '--gradient-blue',
  ];
  
  propsToRemove.forEach(prop => root.style.removeProperty(prop));
}

interface BrandingProviderProps {
  children: React.ReactNode;
  tenantSlug?: string | null;
}

/**
 * BrandingProvider - Provides global branding context
 * Can load branding from a tenant slug (for public pages) or use the current user's tenant
 */
export function BrandingProvider({ children, tenantSlug }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(!!tenantSlug);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(tenantSlug || null);

  // Fetch branding by tenant slug (for login pages, public pages)
  useEffect(() => {
    if (!tenantSlug) {
      resetBrandingOnDocument();
      setBranding(DEFAULT_BRANDING);
      return;
    }

    const fetchBranding = async () => {
      setLoading(true);
      try {
        // First get tenant by slug
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .maybeSingle();

        if (tenant) {
          // Get business profile with branding
          const { data: profile } = await supabase
            .from('business_profiles')
            .select('company_name, logo_url, primary_color, secondary_color, accent_color, tagline, slogan, white_label_enabled')
            .eq('tenant_id', tenant.id)
            .maybeSingle();

          if (profile) {
            const config = getBrandingFromProfile(profile);
            setBranding(config);
            
            // Only apply white-label branding if enabled
            if (config.isWhiteLabel) {
              applyBrandingToDocument(config);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch tenant branding:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, [tenantSlug]);

  const applyBranding = (config: BrandingConfig) => {
    setBranding(config);
    if (config.isWhiteLabel) {
      applyBrandingToDocument(config);
    } else {
      resetBrandingOnDocument();
    }
  };

  const value = useMemo(() => ({
    ...branding,
    loading,
    tenantSlug: resolvedSlug,
    applyBranding,
  }), [branding, loading, resolvedSlug]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

/**
 * Hook to access branding context
 */
export function useBrandingContext() {
  const context = useContext(BrandingContext);
  if (!context) {
    // Return defaults if used outside provider
    return {
      ...DEFAULT_BRANDING,
      loading: false,
      tenantSlug: null,
      applyBranding: () => {},
    };
  }
  return context;
}

/**
 * Utility to apply branding from useBranding hook
 * Used in Dashboard to sync tenant branding
 */
export function useApplyTenantBranding() {
  const context = useContext(BrandingContext);
  
  return (config: BrandingConfig) => {
    if (context) {
      context.applyBranding(config);
    } else if (config.isWhiteLabel) {
      applyBrandingToDocument(config);
    }
  };
}

export { applyBrandingToDocument, resetBrandingOnDocument, hexToHSL, hexToHSLString };
