import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export type BusinessType = 'retail' | 'school' | 'ngo' | 'services';

export interface BusinessProfile {
  id: string;
  tenant_id: string;
  company_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  logo_url: string | null;
  tagline: string | null;
  currency: string | null;
  currency_symbol: string | null;
  country: string | null;
  tax_enabled: boolean | null;
  tax_rate: number | null;
  inventory_enabled: boolean | null;
  payroll_enabled: boolean | null;
  agents_enabled: boolean | null;
  impact_enabled: boolean | null;
  website_enabled: boolean | null;
  primary_color: string | null;
  secondary_color: string | null;
  business_type: BusinessType | null;
}

interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: "admin" | "manager" | "viewer";
  is_owner: boolean | null;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantUser: TenantUser | null;
  businessProfile: BusinessProfile | null;
  tenantId: string | null;
  loading: boolean;
  refetchTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTenantData = async () => {
    if (!user) {
      setTenant(null);
      setTenantUser(null);
      setBusinessProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch tenant_users entry for current user
      const { data: tenantUserData, error: tenantUserError } = await supabase
        .from("tenant_users")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tenantUserError) {
        console.error("Error fetching tenant user:", tenantUserError);
        setLoading(false);
        return;
      }

      if (!tenantUserData) {
        // User has no tenant association yet
        setTenant(null);
        setTenantUser(null);
        setBusinessProfile(null);
        setLoading(false);
        return;
      }

      setTenantUser(tenantUserData as TenantUser);

      // Fetch tenant details
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantUserData.tenant_id)
        .single();

      if (tenantError) {
        console.error("Error fetching tenant:", tenantError);
      } else {
        setTenant(tenantData as Tenant);
      }

      // Fetch business profile
      const { data: profileData, error: profileError } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("tenant_id", tenantUserData.tenant_id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching business profile:", profileError);
      } else if (profileData) {
        setBusinessProfile(profileData as BusinessProfile);
      }
    } catch (error) {
      console.error("Error fetching tenant data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchTenantData();
    }
  }, [user, authLoading]);

  const tenantId = tenantUser?.tenant_id ?? null;

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantUser,
        businessProfile,
        tenantId,
        loading: loading || authLoading,
        refetchTenant: fetchTenantData,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
