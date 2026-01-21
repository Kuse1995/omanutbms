import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { BillingPlan, formatPrice } from "@/lib/billing-plans";

interface PlanSelectorProps {
  selectedPlan: BillingPlan;
  onSelectPlan: (plan: BillingPlan) => void;
}

export function PlanSelector({ selectedPlan, onSelectPlan }: PlanSelectorProps) {
  const { plans, loading } = useBillingPlans();
  const selectablePlans: BillingPlan[] = ["starter", "growth"];

  const getPlanIcon = (plan: BillingPlan) => {
    switch (plan) {
      case "starter":
        return <Sparkles className="w-5 h-5" />;
      case "growth":
        return <Zap className="w-5 h-5" />;
      case "enterprise":
        return <Crown className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-sm text-slate-400">
          Select a plan to start your <span className="text-emerald-400 font-medium">14-day free trial</span>
        </p>
      </div>

      <div className="grid gap-3">
        {selectablePlans.map((planKey) => {
          const plan = plans[planKey];
          const isSelected = selectedPlan === planKey;

          return (
            <motion.button
              key={planKey}
              type="button"
              onClick={() => onSelectPlan(planKey)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`relative w-full p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-slate-600 hover:border-slate-500 bg-slate-700/30"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <Badge className="absolute -top-2 right-4 bg-primary text-xs">
                  Popular
                </Badge>
              )}

              <div className="flex items-start gap-4">
                {/* Selection Indicator */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  isSelected ? "border-primary bg-primary" : "border-slate-500"
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                {/* Plan Icon */}
                <div className={`p-2 rounded-lg ${
                  isSelected ? "bg-primary/20 text-primary" : "bg-slate-600 text-slate-300"
                }`}>
                  {getPlanIcon(planKey)}
                </div>

                {/* Plan Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-semibold ${isSelected ? "text-white" : "text-slate-200"}`}>
                      {plan.label}
                    </h4>
                    <span className={`font-bold ${isSelected ? "text-primary" : "text-slate-300"}`}>
                      {formatPrice(plan.monthlyPrice)}/mo
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{plan.tagline}</p>
                  
                  {/* Key Features */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {plan.highlights.slice(0, 3).map((highlight, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}

        {/* Enterprise Option */}
        <div className="p-4 rounded-xl border border-dashed border-slate-600 bg-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-slate-700 text-slate-400">
              <Crown className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-300">{plans.enterprise.label}</h4>
              <p className="text-sm text-slate-500">Need unlimited scale & custom features?</p>
            </div>
            <Button 
              type="button"
              variant="ghost" 
              size="sm" 
              className="text-slate-400 hover:text-white gap-1"
              asChild
            >
              <a href="mailto:admin@omanut.co?subject=Enterprise Plan Inquiry">
                <Mail className="w-4 h-4" />
                Contact
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
