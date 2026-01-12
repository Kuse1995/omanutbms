import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, X, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useBilling } from "@/hooks/useBilling";

interface TrialBannerProps {
  onUpgrade?: () => void;
}

export function TrialBanner({ onUpgrade }: TrialBannerProps) {
  const { isTrialing, isExpiringSoon, daysRemaining, loading } = useTrialStatus();
  const { planConfig } = useBilling();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismissal (expires after 24h)
  useEffect(() => {
    const dismissedAt = localStorage.getItem("trial_banner_dismissed");
    if (dismissedAt) {
      const dismissedTime = new Date(dismissedAt).getTime();
      const now = new Date().getTime();
      const hoursSinceDismissal = (now - dismissedTime) / (1000 * 60 * 60);
      
      if (hoursSinceDismissal < 24) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem("trial_banner_dismissed");
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("trial_banner_dismissed", new Date().toISOString());
  };

  // Don't show if loading, not on trial, or dismissed
  if (loading || !isTrialing || isDismissed) {
    return null;
  }

  const isUrgent = isExpiringSoon || (daysRemaining !== null && daysRemaining <= 3);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`relative px-4 py-3 ${
          isUrgent 
            ? "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30" 
            : "bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20"
        }`}
      >
        <div className="container-custom flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isUrgent ? (
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-primary flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${isUrgent ? "text-amber-700 dark:text-amber-300" : "text-foreground"}`}>
                {daysRemaining === 0 
                  ? "Your trial ends today!" 
                  : daysRemaining === 1 
                    ? "1 day left in your trial" 
                    : `${daysRemaining} days left in your ${planConfig.label} trial`
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {isUrgent 
                  ? "Upgrade now to keep access to all features" 
                  : "Explore all features during your trial period"
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onUpgrade}
              className={`gap-1.5 ${
                isUrgent 
                  ? "bg-amber-500 hover:bg-amber-600 text-white" 
                  : ""
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Upgrade Now
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-md hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss trial banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
