import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Zap, ArrowRight, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { BillingPlan } from "@/lib/billing-plans";
import { getAvailableCurrencies, formatLocalPrice, formatUSDPrice } from "@/lib/currency-config";
import { PlanComparisonTable } from "./PlanComparisonTable";

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);
  const { plans, planKeys, loading } = useBillingPlans();
  const { countryCode, setPreferredCurrency, currency } = useGeoLocation();
  const { user } = useAuth();
  const currencies = getAvailableCurrencies();

  // Calculate annual savings
  const getAnnualSavings = (planKey: BillingPlan) => {
    const plan = plans[planKey];
    if (plan.monthlyPrice === 0) return 0;
    const monthlyTotal = plan.monthlyPrice * 12;
    const savings = ((monthlyTotal - plan.annualPrice) / monthlyTotal) * 100;
    return Math.round(savings);
  };

  if (loading) {
    return (
      <section id="pricing" className="py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container-custom">
          <div className="text-center mb-16">
            <Skeleton className="h-8 w-32 mx-auto mb-4" />
            <Skeleton className="h-12 w-96 mx-auto mb-4" />
            <Skeleton className="h-6 w-80 mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[500px] rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4">Pricing</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your business. Start today.
          </p>
        </motion.div>

        {/* Currency Selector */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="w-4 h-4" />
            <span className="text-sm">Prices in:</span>
          </div>
          <Select value={countryCode} onValueChange={setPreferredCurrency}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.countryCode} value={c.countryCode}>
                  <span className="flex items-center gap-2">
                    <span>{c.flag}</span>
                    <span>{c.currencyCode}</span>
                    <span className="text-muted-foreground">({c.currencySymbol})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Label className={`text-lg ${!isAnnual ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
            Monthly
          </Label>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            className="data-[state=checked]:bg-primary"
          />
          <div className="flex items-center gap-2">
            <Label className={`text-lg ${isAnnual ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
              Annual
            </Label>
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              Save 20%
            </Badge>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {planKeys.map((planKey, index) => {
            const planData = plans[planKey];
            const savings = getAnnualSavings(planKey);

            return (
              <motion.div
                key={planKey}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl border-2 p-8 bg-card transition-all hover:shadow-xl ${
                  planData.popular 
                    ? "border-primary shadow-lg shadow-primary/10 scale-105 z-10" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                {/* Popular Badge */}
                {planData.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                {/* Plan Icon */}
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 ${
                  planData.popular ? "bg-primary/20" : "bg-muted"
                }`}>
                  {planKey === "enterprise" ? (
                    <Crown className={`w-7 h-7 ${planData.popular ? "text-primary" : "text-muted-foreground"}`} />
                  ) : planKey === "growth" ? (
                    <Zap className={`w-7 h-7 ${planData.popular ? "text-primary" : "text-muted-foreground"}`} />
                  ) : (
                    <Sparkles className={`w-7 h-7 ${planData.popular ? "text-primary" : "text-muted-foreground"}`} />
                  )}
                </div>

                {/* Plan Name & Tagline */}
                <h3 className="text-2xl font-bold mb-2">{planData.label}</h3>
                <p className="text-muted-foreground mb-6">{planData.tagline}</p>

                {/* Price */}
                <div className="mb-8">
                  {planData.monthlyPrice === 0 ? (
                    <div>
                      <span className="text-4xl font-bold">Custom</span>
                      <p className="text-muted-foreground mt-2">Tailored for your needs</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">
                          {formatLocalPrice(
                            isAnnual ? Math.round(planData.annualPrice / 12) : planData.monthlyPrice,
                            countryCode
                          )}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      {countryCode !== "US" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ {formatUSDPrice(isAnnual ? Math.round(planData.annualPrice / 12) : planData.monthlyPrice)} USD
                        </p>
                      )}
                      {isAnnual && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Billed annually ({formatLocalPrice(planData.annualPrice, countryCode)}/year)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                {planKey === "enterprise" ? (
                  <Button 
                    variant="outline" 
                    className="w-full mb-8 h-12 text-base"
                    asChild
                  >
                    <a href="mailto:admin@omanut.co?subject=Enterprise Plan Inquiry">
                      Contact Sales
                    </a>
                  </Button>
                ) : (
                  <Button 
                    className={`w-full mb-8 h-12 text-base gap-2 ${
                      planData.popular ? "" : "bg-foreground hover:bg-foreground/90"
                    }`}
                    asChild
                  >
                    <Link to={user ? `/pay?plan=${planKey}` : `/auth?plan=${planKey}`}>
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                )}

                {/* Features List */}
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    What's included
                  </p>
                  <ul className="space-y-3">
                    {planData.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Trial Note */}
                <p className="text-xs text-muted-foreground text-center mt-6 pt-6 border-t">
                  {planData.trialDays}-day free trial • No credit card required
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Plan Comparison Table */}
        <PlanComparisonTable />

        {/* FAQ Link */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-muted-foreground">
            Have questions? Check our{" "}
            <a href="#faq" className="text-primary hover:underline">FAQ</a>
            {" "}or{" "}
            <a href="mailto:admin@omanut.co" className="text-primary hover:underline">contact us</a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
