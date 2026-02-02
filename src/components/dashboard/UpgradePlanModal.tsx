import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useBilling } from "@/hooks/useBilling";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { BillingPlan, formatPrice } from "@/lib/billing-plans";

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradePlanModal({ open, onOpenChange }: UpgradePlanModalProps) {
  const navigate = useNavigate();
  const { plan: currentPlan, planConfig: currentPlanConfig } = useBilling();
  const { plans, planKeys, loading } = useBillingPlans();
  const [isAnnual, setIsAnnual] = useState(true);

  const getPlanIndex = (plan: BillingPlan) => planKeys.indexOf(plan);
  const isCurrentPlan = (plan: BillingPlan) => plan === currentPlan;
  const isUpgrade = (plan: BillingPlan) => getPlanIndex(plan) > getPlanIndex(currentPlan);

  // Calculate annual savings
  const getAnnualSavings = (planKey: BillingPlan) => {
    const plan = plans[planKey];
    if (plan.monthlyPrice === 0) return 0;
    const monthlyTotal = plan.monthlyPrice * 12;
    const savings = ((monthlyTotal - plan.annualPrice) / monthlyTotal) * 100;
    return Math.round(savings);
  };

  const handleUpgrade = (planKey: BillingPlan) => {
    // Navigate to /pay with pre-selected plan
    onOpenChange(false);
    navigate(`/pay?plan=${planKey}`);
  };

  const handleContactSales = () => {
    window.location.href = "mailto:admin@omanut.co?subject=Enterprise Plan Inquiry";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-primary" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            You're currently on the <span className="font-semibold text-foreground">{currentPlanConfig.label}</span> plan. 
            Choose a plan that fits your growing needs.
          </DialogDescription>
        </DialogHeader>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 py-4">
          <Label className={!isAnnual ? "text-foreground font-medium" : "text-muted-foreground"}>
            Monthly
          </Label>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
          <Label className={isAnnual ? "text-foreground font-medium" : "text-muted-foreground"}>
            Annual
            <Badge variant="secondary" className="ml-2 text-xs">Save 20%</Badge>
          </Label>
        </div>

        {/* Plan Cards */}
        {loading ? (
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[400px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {planKeys.map((planKey) => {
              const planData = plans[planKey];
              const isCurrent = isCurrentPlan(planKey);
              const isUpgradeOption = isUpgrade(planKey);
              const savings = getAnnualSavings(planKey);

              return (
                <motion.div
                  key={planKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative rounded-xl border-2 p-6 transition-all ${
                    planData.popular 
                      ? "border-primary bg-primary/5 shadow-lg" 
                      : isCurrent
                        ? "border-muted-foreground/30 bg-muted/30"
                        : "border-border hover:border-primary/50"
                  }`}
                >
                  {/* Popular Badge */}
                  {planData.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                      Most Popular
                    </Badge>
                  )}

                  {/* Current Badge */}
                  {isCurrent && (
                    <Badge variant="outline" className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Current Plan
                    </Badge>
                  )}

                  {/* Plan Header */}
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                      {planKey === "enterprise" ? (
                        <Crown className="w-6 h-6 text-primary" />
                      ) : planKey === "growth" ? (
                        <Zap className="w-6 h-6 text-primary" />
                      ) : (
                        <Sparkles className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold">{planData.label}</h3>
                    <p className="text-sm text-muted-foreground">{planData.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-6">
                    {planData.monthlyPrice === 0 ? (
                      <div>
                        <span className="text-3xl font-bold">Custom</span>
                        <p className="text-sm text-muted-foreground mt-1">Contact for pricing</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold">
                          {formatPrice(isAnnual ? Math.round(planData.annualPrice / 12) : planData.monthlyPrice)}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                        {isAnnual && savings > 0 && (
                          <p className="text-sm text-green-600 mt-1">
                            Save {savings}% with annual billing
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {planData.highlights.map((highlight, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : planKey === "enterprise" ? (
                    <Button 
                      variant={isUpgradeOption ? "default" : "outline"} 
                      className="w-full gap-2"
                      onClick={handleContactSales}
                    >
                      <Zap className="w-4 h-4" />
                      Contact Sales
                    </Button>
                  ) : isUpgradeOption ? (
                    <Button 
                      className="w-full gap-2" 
                      onClick={() => handleUpgrade(planKey)}
                    >
                      <Zap className="w-4 h-4" />
                      Upgrade to {planData.label}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full text-muted-foreground" disabled>
                      Downgrade not available
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center text-sm text-muted-foreground mt-6 pt-6 border-t">
          <p>
            Upgrade instantly with Mobile Money, Card, or Bank Transfer. 
            Enterprise plans require custom setup — contact us for details.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
