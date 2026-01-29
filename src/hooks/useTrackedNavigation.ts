import { useEffect, useRef, useCallback } from "react";
import { useFeatureTracking } from "./useFeatureTracking";
import { useTenant } from "./useTenant";
import { useAuth } from "./useAuth";

/**
 * Generates a session ID for the current browser session
 * Persists in sessionStorage so it stays constant during the session
 */
function getSessionId(): string {
  const storageKey = "omanut-session-id";
  let sessionId = sessionStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
}

/**
 * Maps dashboard tabs to feature keys for tracking
 */
const tabToFeatureKey: Record<string, string> = {
  dashboard: "dashboard_home",
  sales: "sales",
  receipts: "receipts",
  accounts: "accounts",
  assets: "assets",
  hr: "hr_payroll",
  inventory: "inventory",
  shop: "shop_manager",
  agents: "agents",
  communities: "communities",
  messages: "community_messages",
  contacts: "website_contacts",
  website: "website_cms",
  settings: "access_control",
  "tenant-settings": "tenant_settings",
  modules: "modules_marketplace",
  "platform-admin": "platform_admin",
  branches: "branches",
  returns: "returns_damages",
  customers: "customers",
  "custom-orders": "custom_orders",
  warehouse: "warehouse",
  "stock-transfers": "stock_transfers",
  locations: "locations",
  "production-floor": "production_floor",
};

interface UseTrackedNavigationOptions {
  /** The current active tab/page */
  activeTab: string;
  /** Whether to track time spent on page */
  trackTimeSpent?: boolean;
}

/**
 * Hook that automatically tracks navigation and page views
 * Integrates with useFeatureTracking to log page visits
 */
export function useTrackedNavigation({ 
  activeTab, 
  trackTimeSpent = true 
}: UseTrackedNavigationOptions) {
  const { trackFeatureUsage } = useFeatureTracking();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  
  const sessionId = useRef<string>(getSessionId());
  const pageEntryTime = useRef<number>(Date.now());
  const previousTab = useRef<string | null>(null);

  // Track page view when tab changes
  useEffect(() => {
    if (!tenantId || !activeTab) return;

    const featureKey = tabToFeatureKey[activeTab] || activeTab;
    
    // Track exit from previous page (with time spent)
    if (trackTimeSpent && previousTab.current && previousTab.current !== activeTab) {
      const timeSpentMs = Date.now() - pageEntryTime.current;
      const previousFeatureKey = tabToFeatureKey[previousTab.current] || previousTab.current;
      
      // Only track if user spent more than 2 seconds on the page
      if (timeSpentMs > 2000) {
        trackFeatureUsage(previousFeatureKey, "view", {
          time_spent_seconds: Math.round(timeSpentMs / 1000),
          page_path: `/dashboard/${previousTab.current}`,
          session_id: sessionId.current,
          exit: true,
        });
      }
    }

    // Track entry to new page
    trackFeatureUsage(featureKey, "view", {
      page_path: `/dashboard/${activeTab}`,
      session_id: sessionId.current,
      entry: true,
    });

    // Update refs for next change
    pageEntryTime.current = Date.now();
    previousTab.current = activeTab;
  }, [activeTab, tenantId, trackFeatureUsage, trackTimeSpent]);

  // Track when user leaves the page entirely (browser close/navigate away)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!trackTimeSpent || !previousTab.current) return;
      
      const timeSpentMs = Date.now() - pageEntryTime.current;
      const featureKey = tabToFeatureKey[previousTab.current] || previousTab.current;
      
      // Use sendBeacon for reliable tracking on page unload
      if (timeSpentMs > 2000 && navigator.sendBeacon) {
        // Note: sendBeacon doesn't work well with Supabase client
        // This is a best-effort tracking for page unload
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [trackTimeSpent]);

  /**
   * Track a custom action within the current page
   */
  const trackAction = useCallback((
    actionType: "create" | "update" | "delete" | "export" | "import" | "generate",
    metadata: Record<string, string | number | boolean | null> = {}
  ) => {
    if (!tenantId || !activeTab) return;
    
    const featureKey = tabToFeatureKey[activeTab] || activeTab;
    trackFeatureUsage(featureKey, actionType, {
      ...metadata,
      page_path: `/dashboard/${activeTab}`,
      session_id: sessionId.current,
    });
  }, [activeTab, tenantId, trackFeatureUsage]);

  return {
    trackAction,
    sessionId: sessionId.current,
  };
}

/**
 * Hook for tracking specific feature actions without navigation tracking
 * Use this when you just want to track an action, not page views
 */
export function useActionTracking() {
  const { trackFeatureUsage } = useFeatureTracking();
  const sessionId = useRef<string>(getSessionId());

  const trackAction = useCallback((
    featureKey: string,
    actionType: "view" | "create" | "update" | "delete" | "export" | "import" | "generate",
    metadata: Record<string, string | number | boolean | null> = {}
  ) => {
    trackFeatureUsage(featureKey, actionType, {
      ...metadata,
      session_id: sessionId.current,
    });
  }, [trackFeatureUsage]);

  return { trackAction };
}
