import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Zap, ArrowDown, AlertTriangle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useBilling } from "@/hooks/useBilling";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { BillingPlan, formatPrice, PlanFeatures } from "@/lib/billing-plans";

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Feature labels for display
const featureLabels: Record<keyof PlanFeatures, string> = {
  inventory: "Inventory Management",
  payroll: "HR & Payroll (NAPSA, PAYE, NHIMA)",
  agents: "Agent Network & Distribution",
  impact: "Impact Reporting & Certificates",
  advanced_accounting: "Advanced Accounting Suite",
  website: "Website & CMS Management",
  whatsapp: "WhatsApp Business Assistant",
  warehouse: "Warehouse & Stock Transfers",
  ai_teaching: "AI Teaching Mode",
  ai_reports: "AI Financial Reports",
  document_import: "Document Import AI",
  white_label: "White-Label Branding",
  multi_branch: "Multi-Branch Management",
};

export function UpgradePlanModal({ open, onOpenChange }: UpgradePlanModalProps) {
  const navigate = useNavigate();
  const { plan: currentPlan, planConfig: currentPlanConfig } = useBilling();
  const { plans, planKeys, loading } = useBillingPlans();
  const [isAnnual, setIsAnnual] = useState(true);
  const [downgradeTarget, setDowngradeTarget] = useState<BillingPlan | null>(null);
  const [showDowngradeWarning, setShowDowngradeWarning] = useState(false);

  const getPlanIndex = (plan: BillingPlan) => planKeys.indexOf(plan);
  const isCurrentPlan = (plan: BillingPlan) => plan === currentPlan;
  const isUpgrade = (plan: BillingPlan) => getPlanIndex(plan) > getPlanIndex(currentPlan);
  const isDowngrade = (plan: BillingPlan) => getPlanIndex(plan) < getPlanIndex(currentPlan);

  // Calculate annual savings
  const getAnnualSavings = (planKey: BillingPlan) => {
    const plan = plans[planKey];
    if (plan.monthlyPrice === 0) return 0;
    const monthlyTotal = plan.monthlyPrice * 12;
    const savings = ((monthlyTotal - plan.annualPrice) / monthlyTotal) * 100;
    return Math.round(savings);
  };

  // Get features and limits that will be LOST by downgrading
  const getLostFeaturesAndLimits = (toPlan: BillingPlan) => {
    const from = plans[currentPlan];
    const to = plans[toPlan];
    
    const lostFeatures: string[] = [];
    const reducedLimits: string[] = [];
    
    // Check features
    (Object.entries(from.features) as [keyof PlanFeatures, boolean][]).forEach(([key, enabled]) => {
      if (enabled && !to.features[key]) {
        lostFeatures.push(featureLabels[key]);
      }
    });
    
    // Check limits
    if (from.limits.users > to.limits.users) {
      const fromUsers = from.limits.users === Infinity ? "Unlimited" : from.limits.users.toString();
      const toUsers = to.limits.users === Infinity ? "Unlimited" : to.limits.users.toString();
      reducedLimits.push(`Team members: ${fromUsers} → ${toUsers}`);
    }
    if (from.limits.inventoryItems > to.limits.inventoryItems) {
      const fromItems = from.limits.inventoryItems === Infinity ? "Unlimited" : from.limits.inventoryItems.toLocaleString();
      const toItems = to.limits.inventoryItems === Infinity ? "Unlimited" : to.limits.inventoryItems.toLocaleString();
      reducedLimits.push(`Inventory items: ${fromItems} → ${toItems}`);
    }
    if (from.limits.whatsappMessages > to.limits.whatsappMessages) {
      const fromMsgs = from.limits.whatsappMessages === Infinity ? "Unlimited" : from.limits.whatsappMessages.toLocaleString();
      const toMsgs = to.limits.whatsappMessages === Infinity ? "Unlimited" : to.limits.whatsappMessages.toLocaleString();
      reducedLimits.push(`WhatsApp messages: ${fromMsgs} → ${toMsgs}/month`);
    }
    if (from.limits.aiQueriesDaily > to.limits.aiQueriesDaily) {
      const fromAI = from.limits.aiQueriesDaily === Infinity ? "Unlimited" : from.limits.aiQueriesDaily.toString();
      const toAI = to.limits.aiQueriesDaily === Infinity ? "Unlimited" : to.limits.aiQueriesDaily.toString();
      reducedLimits.push(`AI queries: ${fromAI} → ${toAI}/day`);
    }
    
    return { lostFeatures, reducedLimits };
  };

  const handleUpgrade = (planKey: BillingPlan) => {
    onOpenChange(false);
    navigate(`/pay?plan=${planKey}`);
  };

  const handleDowngradeClick = (planKey: BillingPlan) => {
    setDowngradeTarget(planKey);
    setShowDowngradeWarning(true);
  };

  const handleConfirmDowngrade = () => {
    if (downgradeTarget) {
      setShowDowngradeWarning(false);
      onOpenChange(false);
      navigate(`/pay?plan=${downgradeTarget}&action=downgrade`);
    }
  };

  const handleContactSales = () => {
    window.location.href = "mailto:admin@omanut.co?subject=Enterprise Plan Inquiry";
  };

  const downgradeInfo = downgradeTarget ? getLostFeaturesAndLimits(downgradeTarget) : null;

  return (
    <>
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
                const isDowngradeOption = isDowngrade(planKey);
                const savings = getAnnualSavings(planKey);

                return (
                  <motion.div
                    key={planKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative rounded-xl border-2 p-6 transition-all ${
                      planData.popular && !isCurrent
                        ? "border-primary bg-primary/5 shadow-lg" 
                        : isCurrent
                          ? "border-primary bg-primary/5 shadow-lg"
                          : "border-border hover:border-primary/50"
                    }`}
                  >
                    {/* Popular Badge - Only show if NOT current plan */}
                    {planData.popular && !isCurrent && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                        Most Popular
                      </Badge>
                    )}

                    {/* Current Badge - Takes priority over popular */}
                    {isCurrent && (
                      <Badge variant="outline" className="absolute -top-3 left-1/2 -translate-x-1/2 border-primary text-primary bg-background">
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
                    ) : isDowngradeOption ? (
                      <Button 
                        variant="outline" 
                        className="w-full gap-2 text-amber-600 border-amber-500 hover:bg-amber-50 hover:text-amber-700"
                        onClick={() => handleDowngradeClick(planKey)}
                      >
                        <ArrowDown className="w-4 h-4" />
                        Downgrade to {planData.label}
                      </Button>
                    ) : null}
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

      {/* Downgrade Warning Dialog */}
      <AlertDialog open={showDowngradeWarning} onOpenChange={setShowDowngradeWarning}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Confirm Downgrade to {downgradeTarget && plans[downgradeTarget]?.label}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                {downgradeInfo && downgradeInfo.lostFeatures.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground mb-2">You'll lose access to:</p>
                    <ul className="space-y-1.5">
                      {downgradeInfo.lostFeatures.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {downgradeInfo && downgradeInfo.reducedLimits.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground mb-2">Your limits will be reduced:</p>
                    <ul className="space-y-1.5">
                      {downgradeInfo.reducedLimits.map((limit, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ArrowDown className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span>{limit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-sm text-muted-foreground border-t pt-3">
                  Changes will take effect at the end of your current billing cycle.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDowngrade}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Confirm Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
