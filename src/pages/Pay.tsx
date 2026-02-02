import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Smartphone, Lock, Loader2, CheckCircle2, AlertCircle, Sparkles, Zap, Crown, Check, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTransition } from "@/components/PageTransition";
import { useBilling } from "@/hooks/useBilling";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useAuth } from "@/hooks/useAuth";
import { formatLocalPrice } from "@/lib/currency-config";
import { BillingPlan } from "@/lib/billing-plans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import mtnLogo from "@/assets/mtn-momo-logo.png";
import airtelLogo from "@/assets/airtel-money-logo.png";

type PaymentStatus = "idle" | "processing" | "awaiting_confirmation" | "completed" | "failed";

const Pay = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan: currentPlan, status: billingStatus } = useBilling();
  const { plans, planKeys, loading: plansLoading } = useBillingPlans();
  const { countryCode } = useGeoLocation();

  // Get plan from URL param or default to current/growth
  const urlPlan = searchParams.get("plan") as BillingPlan | null;
  const initialPlan = urlPlan && planKeys.includes(urlPlan) ? urlPlan : (currentPlan || "growth");

  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>(initialPlan);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");

  // Mobile money state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [operator, setOperator] = useState<"MTN" | "AIRTEL">("MTN");

  // Payment status
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Countdown timer state
  const [waitStartTime, setWaitStartTime] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(120);

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
  const price = billingPeriod === "annual" ? planData?.annualPrice : planData?.monthlyPrice;
  const monthlyEquivalent = billingPeriod === "annual" ? Math.round((planData?.annualPrice || 0) / 12) : planData?.monthlyPrice || 0;
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
      const response = await supabase.functions.invoke("lenco-payment", {
        body: {
          payment_method: "mobile_money",
          plan: selectedPlan,
          billing_period: billingPeriod,
          amount: price,
          currency: "ZMW",
          phone_number: phoneNumber,
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

  const resetPayment = () => {
    setPaymentStatus("idle");
    setPaymentId(null);
    setPaymentReference(null);
    setErrorMessage(null);
    setWaitStartTime(null);
    setRemainingSeconds(120);
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
        <header className="border-b border-border/40 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container-custom py-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Link to="/" className="text-xl font-bold text-white">
              Omanut
            </Link>
            <div className="w-20" />
          </div>
        </header>

        <div className="container-custom py-8 md:py-12">
          <div className="max-w-xl mx-auto">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Complete Your Subscription
              </h1>
              {billingStatus === "active" && currentPlan && (
                <Badge variant="secondary" className="mb-3">
                  Current: {plans[currentPlan]?.label}
                </Badge>
              )}
              <p className="text-slate-400 text-sm">
                Choose your plan and pay with Mobile Money
              </p>
            </motion.div>

            {/* Step 1: Plan Selection */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <Label className="text-white text-sm font-medium mb-3 block">1. Choose Your Plan</Label>
              <div className="grid grid-cols-3 gap-3">
                {planKeys.map((planKey) => {
                  const plan = plans[planKey];
                  const isSelected = selectedPlan === planKey;
                  const planPrice = billingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice;
                  
                  return (
                    <button
                      key={planKey}
                      onClick={() => setSelectedPlan(planKey)}
                      disabled={paymentStatus !== "idle"}
                      className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-border bg-card hover:border-primary/50"
                      } ${paymentStatus !== "idle" ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {plan.popular && !isSelected && (
                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-2">
                          Popular
                        </Badge>
                      )}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className={`p-2 rounded-lg mx-auto w-fit mb-2 ${isSelected ? "bg-primary/20" : "bg-muted"}`}>
                        {getPlanIcon(planKey)}
                      </div>
                      <p className="font-semibold text-sm">{plan.label}</p>
                      <p className="text-lg font-bold text-primary">
                        K{(planPrice || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        /{billingPeriod === "annual" ? "year" : "month"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </motion.section>

            {/* Step 2: Billing Period */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6"
            >
              <Label className="text-white text-sm font-medium mb-3 block">2. Billing Period</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  disabled={paymentStatus !== "idle"}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    billingPeriod === "monthly"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50"
                  } ${paymentStatus !== "idle" ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <p className="font-semibold">Monthly</p>
                  <p className="text-sm text-muted-foreground">Flexible billing</p>
                </button>
                <button
                  onClick={() => setBillingPeriod("annual")}
                  disabled={paymentStatus !== "idle"}
                  className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                    billingPeriod === "annual"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50"
                  } ${paymentStatus !== "idle" ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Badge className="absolute -top-2 right-2 bg-green-500/90 text-[10px]">
                    Save 20%
                  </Badge>
                  <p className="font-semibold">Annual</p>
                  <p className="text-sm text-muted-foreground">Best value</p>
                </button>
              </div>
            </motion.section>

            {/* Step 3: Payment Method */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <Label className="text-white text-sm font-medium mb-3 block">3. Pay with Mobile Money</Label>
              <div className="p-5 rounded-xl border bg-card">
                {paymentStatus === "idle" && (
                  <>
                    {/* Operator Selection */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button
                        onClick={() => setOperator("MTN")}
                        className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                          operator === "MTN"
                            ? "border-yellow-500 bg-yellow-500/10"
                            : "border-border hover:border-yellow-500/50"
                        }`}
                      >
                        <img src={mtnLogo} alt="MTN MoMo" className="h-8 w-auto object-contain" />
                      </button>
                      <button
                        onClick={() => setOperator("AIRTEL")}
                        className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                          operator === "AIRTEL"
                            ? "border-red-500 bg-red-500/10"
                            : "border-border hover:border-red-500/50"
                        }`}
                      >
                        <img src={airtelLogo} alt="Airtel Money" className="h-8 w-auto object-contain" />
                      </button>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2 mb-4">
                      <Label className="text-sm">Phone Number</Label>
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 bg-muted rounded-md text-sm font-medium">
                          +260
                        </div>
                        <Input
                          placeholder={operator === "MTN" ? "096XXXXXXX" : "097XXXXXXX"}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                          maxLength={10}
                          className="flex-1"
                          autoFocus
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {operator === "MTN" ? "MTN numbers start with 096" : "Airtel numbers start with 097"}
                      </p>
                    </div>

                    {/* Pay Button */}
                    <Button 
                      className="w-full gap-2" 
                      size="lg" 
                      onClick={handleMobileMoneyPayment}
                    >
                      <Smartphone className="w-4 h-4" />
                      Pay K{(price || 0).toLocaleString()} with {operator}
                    </Button>
                  </>
                )}

                {paymentStatus === "processing" && (
                  <div className="p-8 text-center">
                    <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary mb-3" />
                    <p className="font-medium">Processing payment...</p>
                    <p className="text-sm text-muted-foreground">Please wait</p>
                  </div>
                )}

                {paymentStatus === "awaiting_confirmation" && (
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                      <Smartphone className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="font-semibold text-lg mb-1">Check your phone</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter your {operator} PIN to authorize K{(price || 0).toLocaleString()}
                    </p>
                    
                    {/* Countdown Timer */}
                    <div className={`inline-flex items-center gap-2 py-2 px-4 rounded-full mb-4 ${
                      remainingSeconds <= 30 
                        ? "bg-amber-500/10 text-amber-500" 
                        : "bg-blue-500/10 text-blue-500"
                    }`}>
                      {remainingSeconds <= 30 ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      <span className="font-medium">
                        {remainingSeconds > 0 
                          ? `${formatTime(remainingSeconds)} remaining`
                          : "Time may have expired"}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Waiting for confirmation...
                    </div>
                    
                    <Button variant="outline" size="sm" onClick={resetPayment}>
                      Cancel
                    </Button>
                  </div>
                )}

                {paymentStatus === "completed" && (
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="font-semibold text-lg mb-1">Payment Successful!</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your {planData?.label} subscription is now active
                    </p>
                    <Button onClick={() => navigate("/bms")}>
                      Go to Dashboard
                    </Button>
                  </div>
                )}

                {paymentStatus === "failed" && (
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="font-semibold text-lg mb-1">Payment Failed</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {errorMessage || "Something went wrong"}
                    </p>
                    <Button variant="outline" onClick={resetPayment}>
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            </motion.section>

            {/* Order Summary */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-4 rounded-xl border bg-card/50"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">{planData?.label} Plan</span>
                <span className="font-bold text-lg">
                  K{(price || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Billed {billingPeriod === "annual" ? "annually" : "monthly"}</span>
                <span>≈ K{monthlyEquivalent.toLocaleString()}/month</span>
              </div>
            </motion.section>

            {/* Security Note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground"
            >
              <Lock className="w-3 h-3" />
              Secure payments powered by Lenco
            </motion.div>
          </div>
        </div>
      </main>
    </PageTransition>
  );
};

export default Pay;
