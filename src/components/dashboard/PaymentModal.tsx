import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Smartphone, Building2, Globe, Lock, Loader2, CheckCircle2, AlertCircle, Copy, Clock, AlertTriangle } from "lucide-react";
import { useBilling } from "@/hooks/useBilling";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { formatLocalPrice, getAvailableCurrencies } from "@/lib/currency-config";
import { BillingPlan } from "@/lib/billing-plans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaymentStatus = "idle" | "processing" | "awaiting_confirmation" | "completed" | "failed";

interface BankDetails {
  account_number: string;
  bank_name: string;
  account_name: string;
  amount: number;
  currency: string;
  expires_at: string;
}

export function PaymentModal({ open, onOpenChange }: PaymentModalProps) {
  const { plan: currentPlan } = useBilling();
  const { plans, planKeys } = useBillingPlans();
  const { countryCode, setPreferredCurrency, currency } = useGeoLocation();
  const currencies = getAvailableCurrencies();
  
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>(currentPlan);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");
  const [paymentMethod, setPaymentMethod] = useState("mobile");
  
  // Mobile money state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [operator, setOperator] = useState("MTN");
  
  // Payment status
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  
  // Countdown timer state
  const [waitStartTime, setWaitStartTime] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(120); // 2 minutes

  // Friendly error message mapper
  const getFriendlyErrorMessage = (reason: string | null): string => {
    if (!reason) return "Something went wrong. Please try again.";
    const lower = reason.toLowerCase();
    if (lower.includes("insufficient")) return "Insufficient balance on your phone. Please top up and try again.";
    if (lower.includes("expired")) return "You didn't enter your PIN in time. Please try again.";
    if (lower.includes("declined") || lower.includes("cancelled") || lower.includes("canceled")) return "You cancelled the payment on your phone.";
    if (lower.includes("timeout")) return "The request timed out. Please try again.";
    return reason;
  };

  // Format remaining time as M:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const planData = plans[selectedPlan];
  const price = billingPeriod === "annual" ? planData.annualPrice : planData.monthlyPrice;
  const monthlyEquivalent = billingPeriod === "annual" ? Math.round(planData.annualPrice / 12) : planData.monthlyPrice;
  // Check if plan prices are in ZMW (from database) - if so, don't apply exchange rate conversion
  const planCurrency = planData?.currency || "USD";
  const pricesAreLocal = planCurrency === "ZMW";

  // Poll for payment status
  useEffect(() => {
    if (paymentStatus !== "awaiting_confirmation" || !paymentId) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await supabase.functions.invoke("lenco-check-status", {
          body: { payment_id: paymentId },
        });

        if (response.data?.status === "completed") {
          setPaymentStatus("completed");
          toast.success("Payment successful! Your subscription is now active.");
          clearInterval(pollInterval);
        } else if (response.data?.status === "failed" || response.data?.status === "expired") {
          setPaymentStatus("failed");
          setErrorMessage(getFriendlyErrorMessage(response.data?.failure_reason || (response.data?.status === "expired" ? "Payment request expired" : "Payment failed")));
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Status check error:", error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [paymentStatus, paymentId]);

  // Countdown timer effect
  useEffect(() => {
    if (paymentStatus !== "awaiting_confirmation" || !waitStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - waitStartTime.getTime()) / 1000);
      const remaining = Math.max(0, 120 - elapsed);
      setRemainingSeconds(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentStatus, waitStartTime]);

  const handleMobileMoneyPayment = async () => {
    if (!phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }

    setPaymentStatus("processing");
    setErrorMessage(null);

    try {
      // Send raw phone number - backend will normalize
      const response = await supabase.functions.invoke("lenco-payment", {
        body: {
          payment_method: "mobile_money",
          plan: selectedPlan,
          billing_period: billingPeriod,
          amount: price,
          currency: currency || "USD",
          phone_number: phoneNumber, // Send raw, backend normalizes
          operator,
        },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || response.error?.message || "Payment failed");
      }

      setPaymentId(response.data.payment_id);
      setPaymentReference(response.data.reference);
      setPaymentStatus("awaiting_confirmation");
      setWaitStartTime(new Date());
      setRemainingSeconds(120);
      toast.info("Check your phone to authorize the payment");
    } catch (error: any) {
      console.error("Payment error:", error);
      setPaymentStatus("failed");
      setErrorMessage(error.message || "Payment failed");
      toast.error(error.message || "Payment failed");
    }
  };

  const handleBankTransferPayment = async () => {
    setPaymentStatus("processing");
    setErrorMessage(null);

    try {
      const response = await supabase.functions.invoke("lenco-payment", {
        body: {
          payment_method: "bank_transfer",
          plan: selectedPlan,
          billing_period: billingPeriod,
          amount: price,
          currency: currency || "USD",
        },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || response.error?.message || "Failed to generate bank details");
      }

      setPaymentId(response.data.payment_id);
      setPaymentReference(response.data.reference);
      setBankDetails(response.data.bank_details);
      setPaymentStatus("awaiting_confirmation");
    } catch (error: any) {
      console.error("Bank transfer error:", error);
      setPaymentStatus("failed");
      setErrorMessage(error.message || "Failed to generate bank details");
      toast.error(error.message || "Failed to generate bank details");
    }
  };

  const handleCardPayment = async () => {
    setPaymentStatus("processing");
    setErrorMessage(null);

    try {
      const response = await supabase.functions.invoke("lenco-payment", {
        body: {
          payment_method: "card",
          plan: selectedPlan,
          billing_period: billingPeriod,
          amount: price,
          currency: currency || "USD",
          card_redirect_url: `${window.location.origin}/bms?payment=complete`,
        },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || response.error?.message || "Card payment failed");
      }

      if (response.data.redirect_url) {
        window.location.href = response.data.redirect_url;
      } else {
        throw new Error("No redirect URL received");
      }
    } catch (error: any) {
      console.error("Card payment error:", error);
      setPaymentStatus("failed");
      setErrorMessage(error.message || "Card payment failed");
      toast.error(error.message || "Card payment failed");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const resetPayment = () => {
    setPaymentStatus("idle");
    setPaymentId(null);
    setPaymentReference(null);
    setErrorMessage(null);
    setBankDetails(null);
    setWaitStartTime(null);
    setRemainingSeconds(120);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetPayment();
      onOpenChange(isOpen);
    }}>
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
                  disabled={paymentStatus !== "idle"}
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
                disabled={paymentStatus !== "idle"}
              >
                Monthly
              </Button>
              <Button
                variant={billingPeriod === "annual" ? "default" : "outline"}
                onClick={() => setBillingPeriod("annual")}
                className="relative"
                disabled={paymentStatus !== "idle"}
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
            <Select value={countryCode} onValueChange={setPreferredCurrency} disabled={paymentStatus !== "idle"}>
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
              <span className="font-semibold">
                {pricesAreLocal 
                  ? `K${price.toLocaleString()}` 
                  : formatLocalPrice(price, countryCode)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Monthly equivalent</span>
              <span>
                {pricesAreLocal 
                  ? `K${monthlyEquivalent.toLocaleString()}` 
                  : formatLocalPrice(monthlyEquivalent, countryCode)}/month
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          <Tabs value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); resetPayment(); }}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="mobile" className="gap-1" disabled={paymentStatus !== "idle"}>
                <Smartphone className="w-4 h-4" /> Mobile
              </TabsTrigger>
              <TabsTrigger value="card" className="gap-1" disabled={paymentStatus !== "idle"}>
                <CreditCard className="w-4 h-4" /> Card
              </TabsTrigger>
              <TabsTrigger value="bank" className="gap-1" disabled={paymentStatus !== "idle"}>
                <Building2 className="w-4 h-4" /> Bank
              </TabsTrigger>
            </TabsList>

            {/* Mobile Money Tab */}
            <TabsContent value="mobile" className="mt-4 space-y-4">
              {paymentStatus === "idle" && (
                <>
                  <div className="space-y-2">
                    <Label>Mobile Operator</Label>
                    <Select value={operator} onValueChange={setOperator}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                        <SelectItem value="AIRTEL">Airtel Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <p className="text-xs text-muted-foreground">
                      {operator === "MTN" ? "MTN numbers start with 096..." : "Airtel numbers start with 097..."}
                    </p>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 bg-muted rounded-md text-sm">
                        +260
                      </div>
                      <Input
                        placeholder={operator === "MTN" ? "0961234567" : "0971234567"}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                        maxLength={10}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter 9-10 digits (with or without leading 0)
                    </p>
                  </div>
                  <Button className="w-full" onClick={handleMobileMoneyPayment}>
                    Pay {pricesAreLocal 
                      ? `K${price.toLocaleString()}` 
                      : formatLocalPrice(price, countryCode)}
                  </Button>
                </>
              )}

              {paymentStatus === "processing" && (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Processing payment...</p>
                </div>
              )}

              {paymentStatus === "awaiting_confirmation" && (
                <div className="p-6 text-center border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <Smartphone className="w-10 h-10 mx-auto text-blue-500 mb-3" />
                  <p className="font-medium mb-1">Check your phone</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Authorize the payment on your {operator} phone to complete
                  </p>
                  
                  {/* Countdown Timer */}
                  <div className={`flex items-center justify-center gap-2 mb-3 py-2 px-3 rounded-md ${
                    remainingSeconds <= 30 
                      ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" 
                      : "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                  }`}>
                    {remainingSeconds <= 30 ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    <span className="font-medium text-sm">
                      {remainingSeconds > 0 
                        ? `Enter PIN within ${formatTime(remainingSeconds)}`
                        : "Time may have expired - check your phone"}
                    </span>
                  </div>
                  
                  {remainingSeconds <= 30 && remainingSeconds > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                      Time running out! Enter your PIN now
                    </p>
                  )}
                  
                  {remainingSeconds === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                      If you haven't received a prompt, try again
                    </p>
                  )}

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Waiting for confirmation...
                  </div>
                  
                  <Button variant="outline" size="sm" onClick={resetPayment}>
                    Cancel Payment
                  </Button>
                </div>
              )}

              {paymentStatus === "completed" && (
                <div className="p-6 text-center border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-3" />
                  <p className="font-medium mb-1">Payment Successful!</p>
                  <p className="text-sm text-muted-foreground">
                    Your subscription is now active
                  </p>
                </div>
              )}

              {paymentStatus === "failed" && (
                <div className="p-6 text-center border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
                  <p className="font-medium mb-1">Payment Failed</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {errorMessage || "Something went wrong"}
                  </p>
                  <Button variant="outline" onClick={resetPayment}>
                    Try Again
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Card Tab */}
            <TabsContent value="card" className="mt-4 space-y-4">
              {paymentStatus === "idle" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    You'll be redirected to a secure payment page to enter your card details.
                  </p>
                  <Button className="w-full" onClick={handleCardPayment}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay {pricesAreLocal 
                      ? `K${price.toLocaleString()}` 
                      : formatLocalPrice(price, countryCode)} with Card
                  </Button>
                </div>
              )}

              {paymentStatus === "processing" && (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Redirecting to payment page...</p>
                </div>
              )}

              {paymentStatus === "failed" && (
                <div className="p-6 text-center border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
                  <p className="font-medium mb-1">Payment Failed</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {errorMessage || "Something went wrong"}
                  </p>
                  <Button variant="outline" onClick={resetPayment}>
                    Try Again
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Bank Transfer Tab */}
            <TabsContent value="bank" className="mt-4 space-y-4">
              {paymentStatus === "idle" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Generate bank account details to transfer your payment.
                  </p>
                  <Button className="w-full" onClick={handleBankTransferPayment}>
                    <Building2 className="w-4 h-4 mr-2" />
                    Get Bank Details
                  </Button>
                </div>
              )}

              {paymentStatus === "processing" && (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Generating bank details...</p>
                </div>
              )}

              {paymentStatus === "awaiting_confirmation" && bankDetails && (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Bank</span>
                      <span className="font-medium">{bankDetails.bank_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Account Number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{bankDetails.account_number}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(bankDetails.account_number)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Account Name</span>
                      <span className="font-medium">{bankDetails.account_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="font-bold text-lg">
                        {formatLocalPrice(bankDetails.amount, countryCode)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Waiting for transfer confirmation...
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Transfer the exact amount shown. Your subscription will activate automatically once we confirm the payment.
                  </p>
                </div>
              )}

              {paymentStatus === "completed" && (
                <div className="p-6 text-center border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-3" />
                  <p className="font-medium mb-1">Payment Received!</p>
                  <p className="text-sm text-muted-foreground">
                    Your subscription is now active
                  </p>
                </div>
              )}

              {paymentStatus === "failed" && (
                <div className="p-6 text-center border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
                  <p className="font-medium mb-1">Failed to Generate Details</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {errorMessage || "Something went wrong"}
                  </p>
                  <Button variant="outline" onClick={resetPayment}>
                    Try Again
                  </Button>
                </div>
              )}
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
