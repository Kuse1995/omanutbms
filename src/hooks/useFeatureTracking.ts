import { useCallback, useRef } from "react";
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
  [key: string]: string | number | boolean | null | undefined;
  page_path?: string;
  session_id?: string;
}

/**
 * Debounce helper to prevent duplicate tracking calls
 */
function createDebouncer(delayMs: number = 1000) {
  const lastCalls = new Map<string, number>();
  
  return (key: string): boolean => {
    const now = Date.now();
    const lastCall = lastCalls.get(key) || 0;
    
    if (now - lastCall < delayMs) {
      return false; // Skip - too soon
    }
    
    lastCalls.set(key, now);
    return true; // Allow
  };
}

/**
 * Hook for tracking feature usage across the BMS
 * This helps super admins understand which features are most valuable
 * 
 * Enhanced with:
 * - page_path and session_id support
 * - Debouncing to prevent duplicate calls
 * - Metadata type safety
 */
export function useFeatureTracking() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const debouncer = useRef(createDebouncer(1000));

  const trackFeatureUsage = useCallback(async (
    featureKey: string,
    actionType: FeatureAction = 'view',
    metadata: TrackingMetadata = {}
  ) => {
    if (!tenantId) return;

    // Debounce duplicate calls for the same feature+action combo
    const dedupeKey = `${featureKey}:${actionType}:${metadata.page_path || ''}`;
    if (actionType === 'view' && !debouncer.current(dedupeKey)) {
      return; // Skip duplicate view tracking
    }

    try {
      // Extract page_path and session_id from metadata
      const { page_path, session_id, ...restMetadata } = metadata;
      
      await supabase.from("feature_usage_logs" as any).insert({
        tenant_id: tenantId,
        user_id: user?.id || null,
        feature_key: featureKey,
        action_type: actionType,
        page_path: page_path || null,
        session_id: session_id || null,
        metadata: Object.keys(restMetadata).length > 0 ? restMetadata : null,
      });
    } catch (error) {
      // Silently fail - tracking should not block user actions
      console.debug('Feature tracking error:', error);
    }
  }, [tenantId, user?.id]);

  return { trackFeatureUsage };
}
