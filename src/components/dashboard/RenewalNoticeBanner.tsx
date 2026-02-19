import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, CreditCard, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBilling } from "@/hooks/useBilling";
import { useNavigate } from "react-router-dom";

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isThisMonth(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const end = new Date(dateStr);
  const now = new Date();
  return end.getFullYear() === now.getFullYear() && end.getMonth() === now.getMonth();
}

export function RenewalNoticeBanner() {
  const navigate = useNavigate();
  const { status, planConfig, billingEndDate, loading } = useBilling();
  const [isDismissed, setIsDismissed] = useState(false);

  // Persist dismissal for 12 hours
  useEffect(() => {
    const key = `renewal_banner_dismissed_${billingEndDate}`;
    const dismissedAt = localStorage.getItem(key);
    if (dismissedAt) {
      const hoursSince = (Date.now() - new Date(dismissedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 12) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(key);
      }
    }
  }, [billingEndDate]);

  const handleDismiss = () => {
    setIsDismissed(true);
    const key = `renewal_banner_dismissed_${billingEndDate}`;
    localStorage.setItem(key, new Date().toISOString());
  };

  if (loading || isDismissed) return null;

  // Only show for active subscribers whose billing_end_date falls this month
  if (status !== "active") return null;
  if (!isThisMonth(billingEndDate)) return null;

  const daysLeft = getDaysUntil(billingEndDate);
  if (daysLeft === null || daysLeft < 0) return null;

  const isUrgent = daysLeft <= 3;
  const endDateFormatted = new Date(billingEndDate!).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`rounded-lg border px-4 py-3 mb-5 flex items-center justify-between gap-4 ${
          isUrgent
            ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
            : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
        }`}
      >
        <div className="flex items-start gap-3">
          {isUrgent ? (
            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 text-red-500`} />
          ) : (
            <CalendarClock className={`w-5 h-5 mt-0.5 flex-shrink-0 text-amber-500`} />
          )}
          <div>
            <p className={`text-sm font-semibold ${isUrgent ? "text-red-700 dark:text-red-300" : "text-amber-800 dark:text-amber-300"}`}>
              {daysLeft === 0
                ? `Your ${planConfig.label} subscription expires today`
                : daysLeft === 1
                  ? `Your ${planConfig.label} subscription expires tomorrow`
                  : `Your ${planConfig.label} subscription renews in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
            </p>
            <p className={`text-xs mt-0.5 ${isUrgent ? "text-red-600/80 dark:text-red-400" : "text-amber-700/80 dark:text-amber-400"}`}>
              {isUrgent
                ? `Renew before ${endDateFormatted} to avoid losing access to your business data.`
                : `Renewal due on ${endDateFormatted}. Renew early to ensure uninterrupted service.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={() => navigate("/pay")}
            className={`gap-1.5 ${
              isUrgent
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-white"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Renew Now
          </Button>
          <button
            onClick={handleDismiss}
            className={`p-1.5 rounded-md transition-colors ${
              isUrgent
                ? "hover:bg-red-100 dark:hover:bg-red-900/50 text-red-400 hover:text-red-600"
                : "hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-400 hover:text-amber-600"
            }`}
            aria-label="Dismiss renewal notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
