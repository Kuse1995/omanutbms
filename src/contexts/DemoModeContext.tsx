import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BusinessType } from '@/lib/business-type-config';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';

export type DemoScenario = 
  | 'busy-sales-day'
  | 'month-end-closing'
  | 'low-stock-alert'
  | 'new-business'
  | 'overdue-invoices'
  | 'payroll-day'
  | 'custom-order-rush';

interface DemoModeState {
  isDemoMode: boolean;
  demoBusinessType: BusinessType | null;
  demoSessionId: string | null;
  activeScenario: DemoScenario | null;
  presentationMode: boolean;
  isSeeding: boolean;
  seedingProgress: number;
}

interface DemoModeContextValue extends DemoModeState {
  enableDemoMode: (businessType: BusinessType) => Promise<void>;
  disableDemoMode: () => Promise<void>;
  switchBusinessType: (businessType: BusinessType) => Promise<void>;
  loadScenario: (scenario: DemoScenario) => Promise<void>;
  togglePresentationMode: () => void;
  cleanupDemoData: () => Promise<void>;
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

const DEMO_MODE_KEY = 'omanut_demo_mode';
const SEEDING_TIMEOUT_MS = 60000; // 60 seconds timeout

interface StoredDemoState {
  isDemoMode: boolean;
  demoBusinessType: BusinessType | null;
  demoSessionId: string | null;
  activeScenario: DemoScenario | null;
  presentationMode: boolean;
}

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, user } = useAuth();
  const { tenantId } = useTenant();
  
  const [state, setState] = useState<DemoModeState>({
    isDemoMode: false,
    demoBusinessType: null,
    demoSessionId: null,
    activeScenario: null,
    presentationMode: false,
    isSeeding: false,
    seedingProgress: 0,
  });

  // Load persisted state on mount
  useEffect(() => {
    if (!isSuperAdmin) return;
    
    try {
      const stored = localStorage.getItem(DEMO_MODE_KEY);
      if (stored) {
        const parsed: StoredDemoState = JSON.parse(stored);
        setState(prev => ({
          ...prev,
          isDemoMode: parsed.isDemoMode,
          demoBusinessType: parsed.demoBusinessType,
          demoSessionId: parsed.demoSessionId,
          activeScenario: parsed.activeScenario,
          presentationMode: parsed.presentationMode,
        }));
      }
    } catch (e) {
      console.error('[DemoMode] Failed to load demo mode state:', e);
    }
  }, [isSuperAdmin]);

  // Persist state changes
  useEffect(() => {
    if (!isSuperAdmin) return;
    
    const toStore: StoredDemoState = {
      isDemoMode: state.isDemoMode,
      demoBusinessType: state.demoBusinessType,
      demoSessionId: state.demoSessionId,
      activeScenario: state.activeScenario,
      presentationMode: state.presentationMode,
    };
    localStorage.setItem(DEMO_MODE_KEY, JSON.stringify(toStore));
  }, [state.isDemoMode, state.demoBusinessType, state.demoSessionId, state.activeScenario, state.presentationMode, isSuperAdmin]);

  const seedDemoData = useCallback(async (businessType: BusinessType, sessionId: string) => {
    // Enhanced validation with detailed error messages
    if (!tenantId) {
      const errorMsg = 'Unable to seed demo data: No tenant found. Please reload the page.';
      toast.error(errorMsg);
      console.error('[DemoMode] Cannot seed demo data: tenantId is null');
      throw new Error('No tenant ID available for demo seeding');
    }

    if (!user?.id) {
      const errorMsg = 'Unable to seed demo data: Not authenticated. Please log in again.';
      toast.error(errorMsg);
      console.error('[DemoMode] Cannot seed demo data: user is not authenticated');
      throw new Error('User not authenticated');
    }

    console.log('[DemoMode] Starting demo seed with:', { 
      businessType, 
      tenantId, 
      sessionId,
      userId: user.id 
    });
    
    setState(prev => ({ ...prev, isSeeding: true, seedingProgress: 0 }));

    // Check user permissions before seeding
    try {
      const { data: membership, error: membershipError } = await supabase
        .from('tenant_users')
        .select('role')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .single();

      if (membershipError) {
        console.error('[DemoMode] Failed to check membership:', membershipError);
        throw new Error(`Permission check failed: ${membershipError.message}`);
      }

      if (!membership || !['admin', 'manager'].includes(membership.role)) {
        const errorMsg = `Insufficient permissions. You have role "${membership?.role || 'none'}" but need "admin" or "manager".`;
        toast.error(errorMsg);
        console.error('[DemoMode]', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[DemoMode] User has valid role:', membership.role);
    } catch (permError: any) {
      setState(prev => ({ ...prev, isSeeding: false }));
      throw permError;
    }
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Demo seeding timed out after 60 seconds')), SEEDING_TIMEOUT_MS)
    );

    try {
      console.log('[DemoMode] Importing demo-data-seeder...');
      
      // Import seeder dynamically to avoid circular dependencies
      const { seedDemoDataForBusinessType } = await import('@/lib/demo-data-seeder');
      
      console.log('[DemoMode] Starting seedDemoDataForBusinessType...');
      
      // Race between seeding and timeout
      await Promise.race([
        seedDemoDataForBusinessType({
          businessType,
          tenantId,
          sessionId,
          onProgress: (progress) => {
            console.log(`[DemoMode] Seeding progress: ${progress}%`);
            setState(prev => ({ ...prev, seedingProgress: progress }));
          },
        }),
        timeoutPromise
      ]);
      
      toast.success(`Demo data seeded for ${businessType}!`);
      console.log('[DemoMode] Demo seeding completed successfully');
    } catch (error: any) {
      console.error('[DemoMode] Failed to seed demo data:', error);
      toast.error(error.message || 'Failed to seed demo data. Check console for details.');
      throw error;
    } finally {
      setState(prev => ({ ...prev, isSeeding: false, seedingProgress: 100 }));
    }
  }, [tenantId, user?.id]);

  const cleanupDemoData = useCallback(async () => {
    if (!state.demoSessionId || !tenantId) return;
    
    setState(prev => ({ ...prev, isSeeding: true }));
    
    try {
      console.log('[DemoMode] Starting cleanup for session:', state.demoSessionId);
      
      // Delete in order to respect foreign keys
      const tables = [
        'invoice_items',
        'sales_transactions',
        'invoices',
        'custom_orders',
        'expenses',
        'employees',
        'customers',
        'inventory',
      ];
      
      for (const table of tables) {
        console.log(`[DemoMode] Cleaning up ${table}...`);
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq('demo_session_id', state.demoSessionId)
          .eq('tenant_id', tenantId);
        
        if (error) {
          console.warn(`[DemoMode] Error cleaning up ${table}:`, error);
        }
      }
      
      toast.success('Demo data cleaned up');
      console.log('[DemoMode] Cleanup completed');
    } catch (error) {
      console.error('[DemoMode] Failed to cleanup demo data:', error);
      toast.error('Failed to cleanup demo data');
    } finally {
      setState(prev => ({ ...prev, isSeeding: false }));
    }
  }, [state.demoSessionId, tenantId]);

  const enableDemoMode = useCallback(async (businessType: BusinessType) => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can enable demo mode');
      return;
    }

    if (!tenantId) {
      toast.error('No tenant found. Please reload the page.');
      return;
    }
    
    const sessionId = crypto.randomUUID();
    console.log('[DemoMode] Enabling demo mode:', { businessType, sessionId, tenantId });
    
    setState(prev => ({
      ...prev,
      isDemoMode: true,
      demoBusinessType: businessType,
      demoSessionId: sessionId,
      activeScenario: null,
    }));
    
    try {
      await seedDemoData(businessType, sessionId);
    } catch (error) {
      // Revert state on failure
      console.error('[DemoMode] Seeding failed, reverting state');
      setState(prev => ({
        ...prev,
        isDemoMode: false,
        demoBusinessType: null,
        demoSessionId: null,
        activeScenario: null,
      }));
      localStorage.removeItem(DEMO_MODE_KEY);
    }
  }, [isSuperAdmin, tenantId, seedDemoData]);

  const disableDemoMode = useCallback(async () => {
    await cleanupDemoData();
    
    setState({
      isDemoMode: false,
      demoBusinessType: null,
      demoSessionId: null,
      activeScenario: null,
      presentationMode: false,
      isSeeding: false,
      seedingProgress: 0,
    });
    
    localStorage.removeItem(DEMO_MODE_KEY);
  }, [cleanupDemoData]);

  const switchBusinessType = useCallback(async (businessType: BusinessType) => {
    await cleanupDemoData();
    
    const sessionId = crypto.randomUUID();
    
    setState(prev => ({
      ...prev,
      demoBusinessType: businessType,
      demoSessionId: sessionId,
      activeScenario: null,
    }));
    
    try {
      await seedDemoData(businessType, sessionId);
    } catch (error) {
      console.error('[DemoMode] Switch business type failed');
    }
  }, [cleanupDemoData, seedDemoData]);

  const loadScenario = useCallback(async (scenario: DemoScenario) => {
    if (!state.demoSessionId || !tenantId) return;
    
    setState(prev => ({ ...prev, isSeeding: true }));
    
    try {
      const { applyDemoScenario } = await import('@/lib/demo-scenarios');
      await applyDemoScenario({
        scenario,
        tenantId,
        sessionId: state.demoSessionId,
        businessType: state.demoBusinessType!,
      });
      
      setState(prev => ({ ...prev, activeScenario: scenario }));
      toast.success(`Loaded scenario: ${scenario}`);
    } catch (error) {
      console.error('[DemoMode] Failed to load scenario:', error);
      toast.error('Failed to load scenario');
    } finally {
      setState(prev => ({ ...prev, isSeeding: false }));
    }
  }, [state.demoSessionId, state.demoBusinessType, tenantId]);

  const togglePresentationMode = useCallback(() => {
    setState(prev => ({ ...prev, presentationMode: !prev.presentationMode }));
  }, []);

  // Don't provide demo mode for non-super admins
  const value: DemoModeContextValue = isSuperAdmin ? {
    ...state,
    enableDemoMode,
    disableDemoMode,
    switchBusinessType,
    loadScenario,
    togglePresentationMode,
    cleanupDemoData,
  } : {
    isDemoMode: false,
    demoBusinessType: null,
    demoSessionId: null,
    activeScenario: null,
    presentationMode: false,
    isSeeding: false,
    seedingProgress: 0,
    enableDemoMode: async () => {},
    disableDemoMode: async () => {},
    switchBusinessType: async () => {},
    loadScenario: async () => {},
    togglePresentationMode: () => {},
    cleanupDemoData: async () => {},
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

// Safe hook that returns null instead of throwing when context is missing
// Use this in components that might render before/outside the provider (e.g., during HMR)
export function useDemoModeSafe(): DemoModeContextValue | null {
  const context = useContext(DemoModeContext);
  return context ?? null;
}

// Standard hook that throws if used outside provider (for components that require the context)
export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}
