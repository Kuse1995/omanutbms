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

interface StoredDemoState {
  isDemoMode: boolean;
  demoBusinessType: BusinessType | null;
  demoSessionId: string | null;
  activeScenario: DemoScenario | null;
  presentationMode: boolean;
}

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useAuth();
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
      console.error('Failed to load demo mode state:', e);
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
    // Fixed: Show error toast when tenantId is missing instead of silent failure
    if (!tenantId) {
      toast.error('Unable to seed demo data: No tenant found. Please reload the page.');
      console.error('[DemoMode] Cannot seed demo data: tenantId is null');
      throw new Error('No tenant ID available for demo seeding');
    }
    
    setState(prev => ({ ...prev, isSeeding: true, seedingProgress: 0 }));
    
    try {
      console.log('[DemoMode] Starting demo seed for:', { businessType, tenantId, sessionId });
      
      // Import seeder dynamically to avoid circular dependencies
      const { seedDemoDataForBusinessType } = await import('@/lib/demo-data-seeder');
      
      await seedDemoDataForBusinessType({
        businessType,
        tenantId,
        sessionId,
        onProgress: (progress) => {
          setState(prev => ({ ...prev, seedingProgress: progress }));
        },
      });
      
      toast.success(`Demo data seeded for ${businessType}!`);
    } catch (error) {
      console.error('[DemoMode] Failed to seed demo data:', error);
      toast.error('Failed to seed demo data. Check console for details.');
      throw error;
    } finally {
      setState(prev => ({ ...prev, isSeeding: false, seedingProgress: 100 }));
    }
  }, [tenantId]);

  const cleanupDemoData = useCallback(async () => {
    if (!state.demoSessionId || !tenantId) return;
    
    setState(prev => ({ ...prev, isSeeding: true }));
    
    try {
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
        await supabase
          .from(table as any)
          .delete()
          .eq('demo_session_id', state.demoSessionId)
          .eq('tenant_id', tenantId);
      }
      
      toast.success('Demo data cleaned up');
    } catch (error) {
      console.error('Failed to cleanup demo data:', error);
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
    
    const sessionId = crypto.randomUUID();
    
    setState(prev => ({
      ...prev,
      isDemoMode: true,
      demoBusinessType: businessType,
      demoSessionId: sessionId,
      activeScenario: null,
    }));
    
    await seedDemoData(businessType, sessionId);
  }, [isSuperAdmin, seedDemoData]);

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
    
    await seedDemoData(businessType, sessionId);
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
      console.error('Failed to load scenario:', error);
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

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}
