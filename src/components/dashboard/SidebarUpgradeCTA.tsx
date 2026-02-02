import { useState } from "react";
import { Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useBilling } from "@/hooks/useBilling";
import { PaymentModal } from "./PaymentModal";

export function SidebarUpgradeCTA() {
  const { isTrialing, daysRemaining, isExpiringSoon } = useTrialStatus();
  const { status } = useBilling();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Only show for trial or inactive users
  const shouldShow = isTrialing || status === "inactive" || status === "suspended";

  if (!shouldShow) return null;

  return (
    <>
      <div 
        className={`mx-2 mb-2 p-3 rounded-lg border transition-all ${
          isExpiringSoon 
            ? "bg-amber-500/20 border-amber-400/40" 
            : "bg-white/10 border-white/20"
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          {isExpiringSoon ? (
            <Clock className="w-4 h-4 text-amber-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-white/80" />
          )}
          <span className={`text-sm font-medium ${isExpiringSoon ? "text-amber-300" : "text-white"}`}>
            {isTrialing ? "Upgrade to Pro" : "Activate Subscription"}
          </span>
        </div>
        
        {isTrialing && daysRemaining !== null && (
          <p className={`text-xs mb-2 ${isExpiringSoon ? "text-amber-200/80" : "text-white/60"}`}>
            {daysRemaining === 0 
              ? "Trial expires today" 
              : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left in trial`
            }
          </p>
        )}
        
        {status === "inactive" && (
          <p className="text-xs text-red-300/80 mb-2">
            Your subscription has expired
          </p>
        )}
        
        <Button 
          size="sm" 
          className={`w-full gap-1.5 ${
            isExpiringSoon 
              ? "bg-amber-500 hover:bg-amber-600 text-white" 
              : "bg-white text-[var(--brand-primary,#004B8D)] hover:bg-white/90"
          }`}
          onClick={() => setPaymentModalOpen(true)}
        >
          <Sparkles className="w-3 h-3" />
          Subscribe Now
        </Button>
      </div>

      <PaymentModal 
        open={paymentModalOpen} 
        onOpenChange={setPaymentModalOpen} 
      />
    </>
  );
}
