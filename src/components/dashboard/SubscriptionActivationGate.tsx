import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CreditCard, Check, ArrowRight, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { formatLocalPrice } from "@/lib/currency-config";
import { BillingPlan } from "@/lib/billing-plans";
import { useTenant } from "@/hooks/useTenant";

function useGraceCountdown(deactivatedAt: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; expired: boolean } | null>(null);

  useEffect(() => {
    if (!deactivatedAt) { setTimeLeft(null); return; }

    const calc = () => {
      const deadline = new Date(deactivatedAt);
      deadline.setDate(deadline.getDate() + 5);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return { days, hours, minutes, expired: false };
    };

    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 60_000);
    return () => clearInterval(interval);
  }, [deactivatedAt]);

  return timeLeft;
}

export function SubscriptionActivationGate() {
  const navigate = useNavigate();
  const { plans, planKeys, loading } = useBillingPlans();
  const { countryCode } = useGeoLocation();
  const { businessProfile } = useTenant();
  const countdown = useGraceCountdown(businessProfile?.deactivated_at);
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

        {countdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
              countdown.expired || countdown.days === 0
                ? "border-destructive bg-destructive/10"
                : "border-orange-500/50 bg-orange-500/10"
            }`}
          >
            {countdown.expired ? (
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
            )}
            <p className={`text-sm font-medium ${
              countdown.expired || countdown.days === 0 ? "text-destructive" : "text-orange-600"
            }`}>
              {countdown.expired
                ? "⚠️ Grace period expired. Your account and all data will be deleted shortly."
                : countdown.days > 0
                  ? `⏳ Your account will be permanently deleted in ${countdown.days} day${countdown.days !== 1 ? 's' : ''} and ${countdown.hours} hour${countdown.hours !== 1 ? 's' : ''} if payment is not received.`
                  : `🚨 URGENT: Your account will be deleted in ${countdown.hours}h ${countdown.minutes}m. Subscribe now to save your data!`
              }
            </p>
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {planKeys.map((planKey) => {
            const plan = plans[planKey];
            return (
              <Card
                key={planKey}
                className={`relative p-6 transition-all hover:shadow-lg cursor-pointer border-2 ${
                  plan.popular ? "border-primary shadow-md" : "border-border hover:border-primary/50"
                }`}
                onClick={() => navigate(`/pay?plan=${planKey}${businessProfile?.deactivated_at ? `&deactivated_at=${encodeURIComponent(businessProfile.deactivated_at)}` : ''}`)}
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
