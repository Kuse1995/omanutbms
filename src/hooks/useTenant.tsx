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
  slogan?: string | null;
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
  whatsapp_enabled?: boolean | null;
  advanced_accounting_enabled?: boolean | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color?: string | null;
  white_label_enabled?: boolean | null;
  multi_branch_enabled?: boolean | null;
  business_type: BusinessType | null;
  warehouse_enabled?: boolean | null;
  // Enterprise feature flags (JSONB array)
  enabled_features?: string[] | null;
  // Billing fields
  billing_plan: string | null;
  billing_status: string | null;
  billing_notes: string | null;
  billing_start_date: string | null;
  billing_end_date: string | null;
  trial_expires_at?: string | null;
  // TPIN and banking details
  tpin_number?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_branch?: string | null;
  bank_swift_code?: string | null;
}

import { AppRole } from "@/lib/role-config";

interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: AppRole;
  is_owner: boolean | null;
  branch_id: string | null;
  can_access_all_branches: boolean | null;
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

      // Auto-provision tenant membership from authorized_emails or invitations
      try {
        await supabase.rpc("ensure_tenant_membership");
      } catch (provisionError) {
        console.warn("Could not provision tenant membership:", provisionError);
      }

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

  // Subscribe to real-time updates on business_profiles for this tenant
  useEffect(() => {
    if (!tenantUser?.tenant_id) return;

    const channel = supabase
      .channel(`business_profile_${tenantUser.tenant_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'business_profiles',
          filter: `tenant_id=eq.${tenantUser.tenant_id}`,
        },
        (payload) => {
          console.log('Business profile updated:', payload);
          setBusinessProfile(payload.new as BusinessProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantUser?.tenant_id]);

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
