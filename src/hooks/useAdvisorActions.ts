import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";

// Daily limits by plan for each action type
const ACTION_LIMITS: Record<string, { starter: number; growth: number; enterprise: number }> = {
  document_import: { starter: 0, growth: 5, enterprise: Infinity },
  draft_quotation: { starter: 0, growth: 5, enterprise: Infinity },
  expense_suggestion: { starter: 0, growth: 10, enterprise: Infinity },
  restock_suggestion: { starter: 0, growth: 10, enterprise: Infinity },
  customer_followup: { starter: 0, growth: 10, enterprise: Infinity },
};

export interface ActionPermission {
  allowed: boolean;
  remaining?: number;
  limit?: number;
  reason?: string;
}

export interface AdvisorActionLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action_type: string;
  action_params: Record<string, unknown> | null;
  action_result: Record<string, unknown> | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export function useAdvisorActions() {
  const { tenantId, businessProfile } = useTenant();
  const { user } = useAuth();

  /**
   * Check if the current user can perform a specific action
   */
  const canPerformAction = useCallback(async (
    actionType: string
  ): Promise<ActionPermission> => {
    if (!tenantId || !businessProfile) {
      return { allowed: false, reason: "Not connected to a business" };
    }

    const plan = businessProfile.billing_plan as "starter" | "growth" | "enterprise";
    const limits = ACTION_LIMITS[actionType];

    if (!limits) {
      return { allowed: true }; // Unknown action type - allow by default
    }

    const limit = limits[plan] ?? 0;

    // Starter plan - no AI actions
    if (plan === "starter" || limit === 0) {
      return {
        allowed: false,
        limit: 0,
        remaining: 0,
        reason: `AI ${actionType.replace(/_/g, " ")} is available on Pro and Enterprise plans`,
      };
    }

    // Enterprise plan - unlimited
    if (plan === "enterprise" || limit === Infinity) {
      return { allowed: true, limit: Infinity };
    }

    // Growth plan - check daily usage
    const today = new Date().toISOString().split("T")[0];
    
    const { count, error } = await supabase
      .from("advisor_action_logs")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("action_type", actionType)
      .gte("created_at", `${today}T00:00:00Z`);

    if (error) {
      console.error("Error checking action limits:", error);
      return { allowed: true }; // Allow on error to not block users
    }

    const used = count || 0;
    const remaining = Math.max(0, limit - used);

    if (remaining <= 0) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        reason: `Daily limit reached (${limit}/${limit}). Upgrade to Enterprise for unlimited.`,
      };
    }

    return {
      allowed: true,
      limit,
      remaining,
    };
  }, [tenantId, businessProfile]);

  /**
   * Get today's usage summary for all action types
   */
  const getTodayUsage = useCallback(async (): Promise<Record<string, number>> => {
    if (!tenantId) return {};

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("advisor_action_logs")
      .select("action_type")
      .eq("tenant_id", tenantId)
      .gte("created_at", `${today}T00:00:00Z`);

    if (error) {
      console.error("Error fetching usage:", error);
      return {};
    }

    const usage: Record<string, number> = {};
    for (const log of data || []) {
      usage[log.action_type] = (usage[log.action_type] || 0) + 1;
    }

    return usage;
  }, [tenantId]);

  /**
   * Log an action to the audit table
   */
  const logAction = useCallback(async (
    actionType: string,
    params: Record<string, unknown>,
    result: Record<string, unknown>,
    success: boolean,
    errorMessage?: string
  ): Promise<void> => {
    if (!tenantId) return;

    const { error } = await supabase
      .from("advisor_action_logs")
      .insert([{
        tenant_id: tenantId,
        user_id: user?.id || null,
        action_type: actionType,
        action_params: params as unknown as Record<string, unknown>,
        action_result: result as unknown as Record<string, unknown>,
        success,
        error_message: errorMessage || null,
      }] as any);

    if (error) {
      console.error("Error logging advisor action:", error);
    }
  }, [tenantId, user?.id]);

  /**
   * Get recent action logs for the current tenant
   */
  const getRecentActions = useCallback(async (limit = 10): Promise<AdvisorActionLog[]> => {
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from("advisor_action_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent actions:", error);
      return [];
    }

    return (data || []) as AdvisorActionLog[];
  }, [tenantId]);

  /**
   * Get the current plan's limits for display
   */
  const getPlanLimits = useCallback((): Record<string, number> => {
    const plan = (businessProfile?.billing_plan || "starter") as "starter" | "growth" | "enterprise";
    
    const limits: Record<string, number> = {};
    for (const [actionType, planLimits] of Object.entries(ACTION_LIMITS)) {
      limits[actionType] = planLimits[plan] ?? 0;
    }
    
    return limits;
  }, [businessProfile?.billing_plan]);

  return {
    canPerformAction,
    getTodayUsage,
    logAction,
    getRecentActions,
    getPlanLimits,
    isProOrHigher: businessProfile?.billing_plan !== "starter",
    isEnterprise: businessProfile?.billing_plan === "enterprise",
  };
}
