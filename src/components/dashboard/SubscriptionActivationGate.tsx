import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CreditCard, Sparkles, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { formatLocalPrice } from "@/lib/currency-config";
import { BillingPlan } from "@/lib/billing-plans";

export function SubscriptionActivationGate() {
  const navigate = useNavigate();
  const { plans, planKeys, loading } = useBillingPlans();
  const { countryCode } = useGeoLocation();

  if (loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm overflow-y-auto p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-4xl my-8"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Your account is ready! 🎉
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Choose a plan to start managing your business. All plans include core features with no hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {planKeys.map((planKey) => {
            const plan = plans[planKey];
            return (
              <Card
                key={planKey}
                className={`relative p-6 transition-all hover:shadow-lg cursor-pointer border-2 ${
                  plan.popular ? "border-primary shadow-md" : "border-border hover:border-primary/50"
                }`}
                onClick={() => navigate(`/pay?plan=${planKey}`)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}

                <h3 className="text-xl font-bold mb-1">{plan.label}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.tagline}</p>

                <div className="mb-6">
                  <span className="text-3xl font-bold">
                    {plan.currency === "ZMW"
                      ? `K${plan.monthlyPrice.toLocaleString()}`
                      : formatLocalPrice(plan.monthlyPrice, countryCode)}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <Button
                  className={`w-full mb-4 gap-2 ${plan.popular ? "" : "bg-foreground hover:bg-foreground/90"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/pay?plan=${planKey}`);
                  }}
                >
                  {planKey === "enterprise" ? "Contact Sales" : "Subscribe Now"}
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <ul className="space-y-2">
                  {plan.highlights.slice(0, 5).map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          All payments are processed securely via Mobile Money. No hidden fees.
        </p>
      </motion.div>
    </motion.div>
  );
}
