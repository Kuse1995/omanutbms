import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Smartphone, Building2, Globe, Lock, Loader2, CheckCircle2, AlertCircle, Copy, Sparkles, Zap, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageTransition } from "@/components/PageTransition";
import { useBilling } from "@/hooks/useBilling";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useAuth } from "@/hooks/useAuth";
import { formatLocalPrice, getAvailableCurrencies } from "@/lib/currency-config";
import { BillingPlan } from "@/lib/billing-plans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PaymentStatus = "idle" | "processing" | "awaiting_confirmation" | "completed" | "failed";

interface BankDetails {
  account_number: string;
  bank_name: string;
  account_name: string;
  amount: number;
  currency: string;
  expires_at: string;
}

const Pay = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan: currentPlan, status: billingStatus } = useBilling();
  const { plans, planKeys, loading: plansLoading } = useBillingPlans();
  const { countryCode, setPreferredCurrency, currency } = useGeoLocation();
  const currencies = getAvailableCurrencies();

  // Get plan from URL param or default to current/growth
  const urlPlan = searchParams.get("plan") as BillingPlan | null;
  const initialPlan = urlPlan && planKeys.includes(urlPlan) ? urlPlan : (currentPlan || "growth");

  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>(initialPlan);
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

  const planData = plans[selectedPlan];
  const price = billingPeriod === "annual" ? planData?.annualPrice : (planData?.monthlyPrice || 0) * 12;
  const monthlyEquivalent = billingPeriod === "annual" ? Math.round((planData?.annualPrice || 0) / 12) : planData?.monthlyPrice || 0;

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
        } else if (response.data?.status === "failed") {
          setPaymentStatus("failed");
          setErrorMessage(response.data?.failure_reason || "Payment failed");
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Status check error:", error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [paymentStatus, paymentId]);

  const handleMobileMoneyPayment = async () => {
    if (!phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }

    setPaymentStatus("processing");
    setErrorMessage(null);

    try {
      const response = await supabase.functions.invoke("lenco-payment", {
        body: {
          payment_method: "mobile_money",
          plan: selectedPlan,
          billing_period: billingPeriod,
          amount: price,
          currency: currency || "USD",
          phone_number: phoneNumber.startsWith("+") ? phoneNumber : `+260${phoneNumber}`,
          operator,
        },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || response.error?.message || "Payment failed");
      }

      setPaymentId(response.data.payment_id);
      setPaymentReference(response.data.reference);
      setPaymentStatus("awaiting_confirmation");
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
  };

  const getPlanIcon = (planKey: BillingPlan) => {
    switch (planKey) {
      case "enterprise":
        return <Crown className="w-5 h-5" />;
      case "growth":
        return <Zap className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  if (plansLoading) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-gradient-to-b from-slate-900 to-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-gradient-to-b from-slate-900 to-background">
        {/* Header */}
        <header className="border-b border-border/40 bg-slate-900/50 backdrop-blur-sm">
          <div className="container-custom py-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Link to="/" className="text-xl font-bold text-white">
              Omanut
            </Link>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </header>

        <div className="container-custom py-12">
          <div className="max-w-4xl mx-auto">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10"
            >
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Complete Your Subscription
              </h1>
              {billingStatus === "active" && (
                <Badge variant="secondary" className="mb-4">
                  Current plan: {plans[currentPlan]?.label}
                </Badge>
              )}
              <p className="text-slate-400">
                Choose your plan and payment method to get started
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-5 gap-8">
              {/* Left Column - Plan Selection */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2 space-y-6"
              >
                {/* Plan Cards */}
                <div className="space-y-3">
                  <Label className="text-white">Select Plan</Label>
                  {planKeys.map((planKey) => {
                    const plan = plans[planKey];
                    const isSelected = selectedPlan === planKey;
                    
                    return (
                      <button
                        key={planKey}
                        onClick={() => setSelectedPlan(planKey)}
                        disabled={paymentStatus !== "idle"}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/50"
                        } ${paymentStatus !== "idle" ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/20" : "bg-muted"}`}>
                              {getPlanIcon(planKey)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{plan.label}</span>
                                {plan.popular && (
                                  <Badge className="text-xs">Popular</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Billing Period */}
                <div className="space-y-3">
                  <Label className="text-white">Billing Period</Label>
                  <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                    <Label className={billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}>
                      Monthly
                    </Label>
                    <Switch
                      checked={billingPeriod === "annual"}
                      onCheckedChange={(checked) => setBillingPeriod(checked ? "annual" : "monthly")}
                      disabled={paymentStatus !== "idle"}
                    />
                    <div className="flex items-center gap-2">
                      <Label className={billingPeriod === "annual" ? "text-foreground" : "text-muted-foreground"}>
                        Annual
                      </Label>
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        Save 20%
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Currency Selector */}
                <div className="space-y-3">
                  <Label className="text-white">Currency</Label>
                  <Select value={countryCode} onValueChange={setPreferredCurrency} disabled={paymentStatus !== "idle"}>
                    <SelectTrigger className="bg-card">
                      <Globe className="w-4 h-4 mr-2" />
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
                <div className="p-4 rounded-xl bg-card border space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{planData?.label} Plan ({billingPeriod})</span>
                    <span className="font-bold text-xl">{formatLocalPrice(price || 0, countryCode)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Monthly equivalent</span>
                    <span>{formatLocalPrice(monthlyEquivalent, countryCode)}/month</span>
                  </div>
                </div>
              </motion.div>

              {/* Right Column - Payment Methods */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-3"
              >
                <div className="p-6 rounded-2xl border bg-card">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Payment Method
                  </h2>

                  <Tabs value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); resetPayment(); }}>
                    <TabsList className="grid grid-cols-3 w-full mb-6">
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
                    <TabsContent value="mobile" className="space-y-4">
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
                            <div className="flex gap-2">
                              <div className="flex items-center px-3 bg-muted rounded-md text-sm">
                                +260
                              </div>
                              <Input
                                placeholder="97XXXXXXX"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                                maxLength={9}
                              />
                            </div>
                          </div>
                          <Button className="w-full" size="lg" onClick={handleMobileMoneyPayment}>
                            Pay {formatLocalPrice(price || 0, countryCode)}
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
                          <p className="text-sm text-muted-foreground mb-4">
                            Authorize the payment on your {operator} phone to complete
                          </p>
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Waiting for confirmation...
                          </div>
                        </div>
                      )}

                      {paymentStatus === "completed" && (
                        <div className="p-6 text-center border rounded-lg bg-green-50 dark:bg-green-950/20">
                          <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-3" />
                          <p className="font-medium mb-1">Payment Successful!</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Your subscription is now active
                          </p>
                          <Button onClick={() => navigate("/bms")}>
                            Go to Dashboard
                          </Button>
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
                    <TabsContent value="card" className="space-y-4">
                      {paymentStatus === "idle" && (
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            You'll be redirected to a secure payment page to enter your card details.
                          </p>
                          <Button className="w-full" size="lg" onClick={handleCardPayment}>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay {formatLocalPrice(price || 0, countryCode)} with Card
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
                    <TabsContent value="bank" className="space-y-4">
                      {paymentStatus === "idle" && (
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Generate bank account details to transfer your payment.
                          </p>
                          <Button className="w-full" size="lg" onClick={handleBankTransferPayment}>
                            <Building2 className="w-4 h-4 mr-2" />
                            Generate Bank Details
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
                          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Bank Name</span>
                              <span className="font-medium">{bankDetails.bank_name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Account Name</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{bankDetails.account_name}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(bankDetails.account_name)}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Account Number</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium">{bankDetails.account_number}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(bankDetails.account_number)}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Amount</span>
                              <span className="font-bold text-lg">{bankDetails.currency} {bankDetails.amount.toLocaleString()}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            Transfer the exact amount above. Your subscription will activate once payment is confirmed.
                          </p>
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Waiting for bank transfer...
                          </div>
                        </div>
                      )}

                      {paymentStatus === "completed" && (
                        <div className="p-6 text-center border rounded-lg bg-green-50 dark:bg-green-950/20">
                          <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-3" />
                          <p className="font-medium mb-1">Payment Successful!</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Your subscription is now active
                          </p>
                          <Button onClick={() => navigate("/bms")}>
                            Go to Dashboard
                          </Button>
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

                  {/* Security Note */}
                  <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t text-xs text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    Secure payments powered by Lenco
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </PageTransition>
  );
};

export default Pay;
