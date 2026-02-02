import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './useTenant';

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  manager_id: string | null;
  is_headquarters: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BranchContextType {
  branches: Branch[];
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch | null) => void;
  isMultiBranchEnabled: boolean;
  canAccessAllBranches: boolean;
  userBranchId: string | null;
  loading: boolean;
  refetchBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const BRANCH_STORAGE_KEY = 'omanut_selected_branch';

interface BranchProviderProps {
  children: ReactNode;
}

export const BranchProvider: React.FC<BranchProviderProps> = ({ children }) => {
  const { tenant, businessProfile, tenantUser } = useTenant();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranchState] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  const isMultiBranchEnabled = businessProfile?.multi_branch_enabled ?? false;
  const canAccessAllBranches = tenantUser?.can_access_all_branches ?? tenantUser?.role === 'admin';
  const userBranchId = tenantUser?.branch_id ?? null;

  const fetchBranches = useCallback(async () => {
    if (!tenant?.id || !isMultiBranchEnabled) {
      setBranches([]);
      setCurrentBranchState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('is_headquarters', { ascending: false })
        .order('name');

      if (error) throw error;

      const branchData = (data || []) as Branch[];
      setBranches(branchData);

      // Try to restore saved branch from localStorage
      const savedBranchId = localStorage.getItem(BRANCH_STORAGE_KEY);
      if (savedBranchId) {
        const savedBranch = branchData.find(b => b.id === savedBranchId);
        if (savedBranch) {
          setCurrentBranchState(savedBranch);
          setLoading(false);
          return;
        }
      }

      // Auto-select user's assigned branch if they have one and can't access all
      if (userBranchId && !canAccessAllBranches) {
        const userBranch = branchData.find(b => b.id === userBranchId);
        if (userBranch) {
          setCurrentBranchState(userBranch);
          localStorage.setItem(BRANCH_STORAGE_KEY, userBranch.id);
        }
      } else if (branchData.length === 1) {
        // If only one branch exists, auto-select it
        setCurrentBranchState(branchData[0]);
        localStorage.setItem(BRANCH_STORAGE_KEY, branchData[0].id);
      }
      // Otherwise leave as null (meaning "All Branches" for admins)
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, isMultiBranchEnabled, userBranchId, canAccessAllBranches]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const setCurrentBranch = useCallback((branch: Branch | null) => {
    setCurrentBranchState(branch);
    if (branch) {
      localStorage.setItem(BRANCH_STORAGE_KEY, branch.id);
    } else {
      localStorage.removeItem(BRANCH_STORAGE_KEY);
    }
  }, []);

  const contextValue = useMemo(() => ({
    branches,
    currentBranch,
    setCurrentBranch,
    isMultiBranchEnabled,
    canAccessAllBranches,
    userBranchId,
    loading,
    refetchBranches: fetchBranches,
  }), [branches, currentBranch, setCurrentBranch, isMultiBranchEnabled, canAccessAllBranches, userBranchId, loading, fetchBranches]);

  return (
    <BranchContext.Provider value={contextValue}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = (): BranchContextType => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};
