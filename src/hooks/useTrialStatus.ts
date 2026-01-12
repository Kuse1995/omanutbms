import { useMemo } from "react";
import { useBilling } from "./useBilling";

export interface TrialStatusReturn {
  isTrialing: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number | null;
  trialEndDate: Date | null;
  loading: boolean;
}

/**
 * Hook for trial status resolution
 * Provides trial period information based on billing status and dates
 */
export function useTrialStatus(): TrialStatusReturn {
  const { status, billingEndDate, loading } = useBilling();

  return useMemo(() => {
    if (loading) {
      return {
        isTrialing: false,
        isExpired: false,
        isExpiringSoon: false,
        daysRemaining: null,
        trialEndDate: null,
        loading: true,
      };
    }

    const isTrialing = status === "trial";
    
    if (!isTrialing || !billingEndDate) {
      return {
        isTrialing,
        isExpired: status === "inactive" || status === "suspended",
        isExpiringSoon: false,
        daysRemaining: null,
        trialEndDate: null,
        loading: false,
      };
    }

    const now = new Date();
    const endDate = new Date(billingEndDate);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isTrialing: true,
      isExpired: diffDays < 0,
      isExpiringSoon: diffDays >= 0 && diffDays <= 7,
      daysRemaining: Math.max(0, diffDays),
      trialEndDate: endDate,
      loading: false,
    };
  }, [status, billingEndDate, loading]);
}
