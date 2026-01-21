import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";
import { useAuth } from "./useAuth";

export type FeatureAction = 
  | 'view' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'export' 
  | 'import' 
  | 'generate';

export interface TrackingMetadata {
  [key: string]: string | number | boolean | null;
}

/**
 * Hook for tracking feature usage across the BMS
 * This helps super admins understand which features are most valuable
 */
export function useFeatureTracking() {
  const { tenantId } = useTenant();
  const { user } = useAuth();

  const trackFeatureUsage = useCallback(async (
    featureKey: string,
    actionType: FeatureAction = 'view',
    metadata: TrackingMetadata = {}
  ) => {
    if (!tenantId) return;

    try {
      await supabase.from("feature_usage_logs" as any).insert({
        tenant_id: tenantId,
        user_id: user?.id || null,
        feature_key: featureKey,
        action_type: actionType,
        metadata,
      });
    } catch (error) {
      // Silently fail - tracking should not block user actions
      console.debug('Feature tracking error:', error);
    }
  }, [tenantId, user?.id]);

  return { trackFeatureUsage };
}
