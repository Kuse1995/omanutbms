import { Zap, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { BillingPlan, formatPrice } from "@/lib/billing-plans";

interface PlanSelectorProps {
  selectedPlan: BillingPlan;
  onSelectPlan: (plan: BillingPlan) => void;
}

export function PlanSelector({ selectedPlan, onSelectPlan }: PlanSelectorProps) {
  const { plans, loading } = useBillingPlans();
  const proPlan = plans.growth;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pro Plan Display - No selection needed */}
      <div className="relative p-4 rounded-xl border-2 border-primary bg-primary/10">
        <Badge className="absolute -top-2 right-4 bg-primary text-xs">
          Your Plan
        </Badge>

        <div className="flex items-start gap-4">
          {/* Plan Icon */}
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            <Zap className="w-5 h-5" />
          </div>

          {/* Plan Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-white">{proPlan.label}</h4>
              <div className="text-right">
                <span className="text-sm text-slate-500 line-through mr-2">
                  {formatPrice(proPlan.monthlyPrice)}/mo
                </span>
                <span className="font-bold text-green-400">
                  $0 for 7 days
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-400">{proPlan.tagline}</p>
            
            {/* Key Features */}
            <div className="flex flex-wrap gap-2 mt-3">
              {proPlan.highlights.slice(0, 4).map((highlight, idx) => (
                <span 
                  key={idx} 
                  className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded flex items-center gap-1"
                >
                  <Check className="w-3 h-3 text-primary" />
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
