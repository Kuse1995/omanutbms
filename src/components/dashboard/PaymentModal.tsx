import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Smartphone, Building2, Globe, Lock, Clock } from "lucide-react";
import { useBilling } from "@/hooks/useBilling";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { formatLocalPrice, getAvailableCurrencies } from "@/lib/currency-config";
import { BillingPlan } from "@/lib/billing-plans";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentModal({ open, onOpenChange }: PaymentModalProps) {
  const { plan: currentPlan } = useBilling();
  const { plans, planKeys } = useBillingPlans();
  const { countryCode, setPreferredCurrency, currency } = useGeoLocation();
  const currencies = getAvailableCurrencies();
  
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>(currentPlan);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");
  const [paymentMethod, setPaymentMethod] = useState("card");

  const planData = plans[selectedPlan];
  const price = billingPeriod === "annual" ? planData.annualPrice : planData.monthlyPrice * 12;
  const monthlyEquivalent = billingPeriod === "annual" ? Math.round(planData.annualPrice / 12) : planData.monthlyPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Subscribe to {planData.label}
          </DialogTitle>
          <DialogDescription>
            Choose your billing preferences and payment method
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Plan Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {planKeys.map((key) => (
                <Button
                  key={key}
                  variant={selectedPlan === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPlan(key)}
                  className="relative"
                >
                  {plans[key].label}
                  {plans[key].popular && (
                    <Badge className="absolute -top-2 -right-2 text-[10px] px-1">Best</Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Billing Period */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Billing Period</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={billingPeriod === "monthly" ? "default" : "outline"}
                onClick={() => setBillingPeriod("monthly")}
              >
                Monthly
              </Button>
              <Button
                variant={billingPeriod === "annual" ? "default" : "outline"}
                onClick={() => setBillingPeriod("annual")}
                className="relative"
              >
                Annual
                <Badge className="absolute -top-2 -right-2 bg-green-500 text-[10px] px-1">Save 20%</Badge>
              </Button>
            </div>
          </div>

          {/* Currency Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="w-4 h-4" />
              Currency
            </div>
            <Select value={countryCode} onValueChange={setPreferredCurrency}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.countryCode} value={c.countryCode}>
                    {c.flag} {c.currencyCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Summary */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{planData.label} Plan ({billingPeriod})</span>
              <span className="font-semibold">{formatLocalPrice(price, countryCode)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Monthly equivalent</span>
              <span>{formatLocalPrice(monthlyEquivalent, countryCode)}/month</span>
            </div>
          </div>

          {/* Payment Methods */}
          <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="card" className="gap-1">
                <CreditCard className="w-4 h-4" /> Card
              </TabsTrigger>
              <TabsTrigger value="mobile" className="gap-1">
                <Smartphone className="w-4 h-4" /> Mobile
              </TabsTrigger>
              <TabsTrigger value="bank" className="gap-1">
                <Building2 className="w-4 h-4" /> Bank
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="mt-4">
              <div className="p-8 text-center border rounded-lg border-dashed">
                <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Card payments coming soon
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Contact admin@omanut.co to subscribe
                </p>
              </div>
            </TabsContent>

            <TabsContent value="mobile" className="mt-4">
              <div className="p-8 text-center border rounded-lg border-dashed">
                <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Mobile Money (MTN, Airtel) coming soon
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Contact admin@omanut.co to subscribe
                </p>
              </div>
            </TabsContent>

            <TabsContent value="bank" className="mt-4">
              <div className="p-8 text-center border rounded-lg border-dashed">
                <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Bank Transfer coming soon
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Contact admin@omanut.co to subscribe
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Lock className="w-3 h-3" />
            Secured by Lenco • 256-bit encryption
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
