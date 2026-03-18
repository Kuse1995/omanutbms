import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, AlertTriangle, Check, Crown } from "lucide-react";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { useTenant } from "@/hooks/useTenant";
import { canManageBilling, type AppRole } from "@/lib/role-config";
import type { BillingPlan } from "@/lib/billing-plans";

interface SubscriptionRequiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dismissable?: boolean;
}

export function SubscriptionRequiredModal({ open, onOpenChange, dismissable = true }: SubscriptionRequiredModalProps) {
  const { plans, planKeys } = useBillingPlans();
  const { businessProfile, tenantUser } = useTenant();
  const [countdown, setCountdown] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  const userRole = (tenantUser as any)?.role as AppRole | null;
  const isBillingManager = canManageBilling(userRole, tenantUser?.is_owner);
  const deactivatedAt = (businessProfile as any)?.deactivated_at;

  useEffect(() => {
    if (!deactivatedAt) return;

    const update = () => {
      const deadline = new Date(deactivatedAt);
      deadline.setDate(deadline.getDate() + 5);
      const diff = deadline.getTime() - Date.now();

      if (diff <= 0) {
        setCountdown("Grace period expired. Account deletion is imminent.");
        setIsUrgent(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      setIsUrgent(days === 0);
      setCountdown(
        days > 0
          ? `${days} day${days > 1 ? "s" : ""} and ${hours}h remaining`
          : `${hours} hours remaining`
      );
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [deactivatedAt]);

  const handleSubscribe = (planKey: BillingPlan) => {
    window.location.href = `/pay?plan=${planKey}`;
  };

  const handleOpenChange = (value: boolean) => {
    if (!dismissable && !value) return; // Prevent closing if not dismissable
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-3xl"
        onPointerDownOutside={dismissable ? undefined : (e) => e.preventDefault()}
        onEscapeKeyDown={dismissable ? undefined : (e) => e.preventDefault()}
      >
        {/* Hide close button when not dismissable */}
        {!dismissable && (
          <style>{`.absolute.right-4.top-4 { display: none !important; }`}</style>
        )}
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Your Subscription is Inactive</DialogTitle>
          <DialogDescription>
            {isBillingManager
              ? "Choose a plan below to reactivate your account and unlock all features."
              : "Your organization's subscription is inactive. Please contact your administrator to reactivate."}
          </DialogDescription>
        </DialogHeader>

        {/* Grace period countdown */}
        {countdown && (
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${
            isUrgent 
              ? "border-destructive/50 bg-destructive/10 text-destructive" 
              : "border-muted bg-muted/50 text-muted-foreground"
          }`}>
            {isUrgent ? (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Clock className="w-4 h-4 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">
              {isUrgent ? "⚠️ " : "⏳ "}
              {countdown}
              {!isUrgent && " before account data is permanently deleted."}
            </p>
          </div>
        )}

        {/* Plan cards - show for billing managers */}
        {isBillingManager ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            {planKeys.map((key) => {
              const plan = plans[key];
              return (
                <Card
                  key={key}
                  className={`relative flex flex-col ${
                    plan.popular ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border"
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1 bg-primary text-primary-foreground">
                      <Crown className="w-3 h-3" /> Most Popular
                    </Badge>
                  )}
                  <CardHeader className="pb-3 pt-5">
                    <CardTitle className="text-base">{plan.label}</CardTitle>
                    <div className="mt-1">
                      <span className="text-2xl font-bold text-foreground">
                        {plan.currency} {plan.monthlyPrice.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col pt-0">
                    <ul className="space-y-1.5 mb-4 flex-1">
                      {plan.highlights.slice(0, 4).map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleSubscribe(key)}
                      variant={plan.popular ? "default" : "outline"}
                      className="w-full gap-1"
                      size="sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Subscribe
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              Please reach out to your organization's administrator to reactivate the subscription.
            </p>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground pt-2 border-t">
          Managed by Omanut · All plans include a free trial
        </p>
      </DialogContent>
    </Dialog>
  );
}
