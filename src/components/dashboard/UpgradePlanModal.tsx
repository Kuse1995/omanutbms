import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Mail, Zap, X } from "lucide-react";
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
import { useBilling } from "@/hooks/useBilling";
import { 
  BILLING_PLANS, 
  BillingPlan, 
  formatPrice, 
  getAnnualSavingsPercent 
} from "@/lib/billing-plans";

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradePlanModal({ open, onOpenChange }: UpgradePlanModalProps) {
  const { plan: currentPlan, planConfig: currentPlanConfig } = useBilling();
  const [isAnnual, setIsAnnual] = useState(true);

  const plans: BillingPlan[] = ["starter", "growth", "enterprise"];

  const getPlanIndex = (plan: BillingPlan) => plans.indexOf(plan);
  const isCurrentPlan = (plan: BillingPlan) => plan === currentPlan;
  const isUpgrade = (plan: BillingPlan) => getPlanIndex(plan) > getPlanIndex(currentPlan);
  const isDowngrade = (plan: BillingPlan) => getPlanIndex(plan) < getPlanIndex(currentPlan);

  const handleContactSales = () => {
    window.location.href = "mailto:admin@omanut.co?subject=Plan Upgrade Request";
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
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {plans.map((planKey) => {
            const planData = BILLING_PLANS[planKey];
            const isCurrent = isCurrentPlan(planKey);
            const isUpgradeOption = isUpgrade(planKey);
            const savings = getAnnualSavingsPercent(planKey);

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
                    <Mail className="w-4 h-4" />
                    Contact Sales
                  </Button>
                ) : isUpgradeOption ? (
                  <Button className="w-full" onClick={handleContactSales}>
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

        {/* Footer Note */}
        <div className="text-center text-sm text-muted-foreground mt-6 pt-6 border-t">
          <p>
            Plan changes are processed manually by our team. 
            Contact <a href="mailto:admin@omanut.co" className="text-primary hover:underline">admin@omanut.co</a> for assistance.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
