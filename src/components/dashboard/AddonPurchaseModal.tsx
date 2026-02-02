import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Smartphone, Loader2, CheckCircle2, AlertCircle, Clock, AlertTriangle,
  Package, Warehouse, GitBranch, MessageSquare 
} from "lucide-react";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddonDefinition {
  id: string;
  addon_key: string;
  display_name: string;
  description: string | null;
  monthly_price: number | null;
  annual_price: number | null;
  unit_price: number | null;
  unit_label: string | null;
  pricing_type: string;
  icon: string | null;
}

interface AddonPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addon: AddonDefinition | null;
  onSuccess?: () => void;
}

type PaymentStatus = "idle" | "processing" | "awaiting_confirmation" | "completed" | "failed";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Package, Warehouse, GitBranch, MessageSquare,
};

export function AddonPurchaseModal({ open, onOpenChange, addon, onSuccess }: AddonPurchaseModalProps) {
  const { currency } = useGeoLocation();
  
  // Payment state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [operator, setOperator] = useState("MTN");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [waitStartTime, setWaitStartTime] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(120);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      resetPayment();
    }
  }, [open]);

  // Friendly error message mapper
  const getFriendlyErrorMessage = (reason: string | null): string => {
    if (!reason) return "Something went wrong. Please try again.";
    const lower = reason.toLowerCase();
    if (lower.includes("insufficient")) return "Insufficient balance. Please top up and try again.";
    if (lower.includes("expired")) return "You didn't enter your PIN in time. Please try again.";
    if (lower.includes("declined") || lower.includes("cancelled")) return "You cancelled the payment.";
    return reason;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Poll for payment status
  useEffect(() => {
    if (paymentStatus !== "awaiting_confirmation" || !paymentId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await supabase.functions.invoke("lenco-check-status", {
          body: { payment_id: paymentId },
        });

        if (response.data?.status === "completed") {
          setPaymentStatus("completed");
          toast.success("Payment successful! Add-on is now active.");
          clearInterval(pollInterval);
          onSuccess?.();
        } else if (response.data?.status === "failed" || response.data?.status === "expired") {
          setPaymentStatus("failed");
          setErrorMessage(getFriendlyErrorMessage(response.data?.failure_reason));
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Status check error:", error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [paymentStatus, paymentId, onSuccess]);

  // Countdown timer
  useEffect(() => {
    if (paymentStatus !== "awaiting_confirmation" || !waitStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - waitStartTime.getTime()) / 1000);
      setRemainingSeconds(Math.max(0, 120 - elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentStatus, waitStartTime]);

  const handlePayment = async () => {
    if (!phoneNumber || !addon) {
      toast.error("Please enter your phone number");
      return;
    }

    setPaymentStatus("processing");
    setErrorMessage(null);

    try {
      // Use displayPrice which is already correctly calculated for usage-based vs fixed
      const paymentAmount = hasFixedMonthlyPrice ? addon.monthly_price! : (addon.unit_price || 0);
      
      const response = await supabase.functions.invoke("lenco-payment", {
        body: {
          payment_method: "mobile_money",
          plan: "addon", // Indicate this is an add-on purchase
          addon_key: addon.addon_key,
          billing_period: "monthly",
          amount: paymentAmount,
          currency: "ZMW", // Always use ZMW since addon prices are in ZMW
          phone_number: phoneNumber,
          operator,
        },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || response.error?.message || "Payment failed");
      }

      setPaymentId(response.data.payment_id);
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
    setErrorMessage(null);
    setWaitStartTime(null);
    setRemainingSeconds(120);
  };

  if (!addon) return null;

  const IconComponent = iconMap[addon.icon || "Package"] || Package;
  
  // Fix pricing display for usage-based vs fixed add-ons
  const isUsageBased = addon.pricing_type === "per_unit" || addon.pricing_type === "usage";
  const hasFixedMonthlyPrice = addon.pricing_type === "fixed" && addon.monthly_price && addon.monthly_price > 0;
  const displayPrice = hasFixedMonthlyPrice ? addon.monthly_price : (addon.unit_price || 0);
  const priceLabel = hasFixedMonthlyPrice ? "/month" : `/${addon.unit_label || "unit"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <IconComponent className="w-5 h-5 text-primary" />
            </div>
            Activate {addon.display_name}
          </DialogTitle>
          <DialogDescription>
            {addon.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Pricing Info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Price</span>
              <div className="text-right">
                <span className="text-xl font-bold">K{displayPrice.toLocaleString()}</span>
                <span className="text-muted-foreground text-sm">{priceLabel}</span>
              </div>
            </div>
            {isUsageBased && (
              <p className="text-xs text-muted-foreground">
                Usage-based pricing. You'll only be charged for what you use beyond your plan limits.
              </p>
            )}
          </div>

          {/* Payment Form */}
          {paymentStatus === "idle" && (
            <div className="space-y-4">
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
                    placeholder={operator === "MTN" ? "0961234567" : "0971234567"}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                  />
                </div>
              </div>

              <Button className="w-full" onClick={handlePayment}>
                {hasFixedMonthlyPrice 
                  ? `Pay K${displayPrice.toLocaleString()}/month`
                  : `Activate (K${displayPrice}${priceLabel})`
                }
              </Button>
            </div>
          )}

          {/* Processing State */}
          {paymentStatus === "processing" && (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Processing payment...</p>
            </div>
          )}

          {/* Awaiting Confirmation State */}
          {paymentStatus === "awaiting_confirmation" && (
            <div className="p-6 text-center border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <Smartphone className="w-10 h-10 mx-auto text-blue-500 mb-3" />
              <p className="font-medium mb-1">Check your phone</p>
              <p className="text-sm text-muted-foreground mb-3">
                Authorize the payment on your {operator} phone
              </p>
              
              <div className={`flex items-center justify-center gap-2 mb-3 py-2 px-3 rounded-md ${
                remainingSeconds <= 30 
                  ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700" 
                  : "bg-blue-100 dark:bg-blue-950/30 text-blue-700"
              }`}>
                {remainingSeconds <= 30 ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span className="font-medium text-sm">
                  {remainingSeconds > 0 
                    ? `Enter PIN within ${formatTime(remainingSeconds)}` 
                    : "Time may have expired"}
                </span>
              </div>

              <Button variant="outline" size="sm" onClick={resetPayment}>
                Cancel Payment
              </Button>
            </div>
          )}

          {/* Success State */}
          {paymentStatus === "completed" && (
            <div className="p-6 text-center border rounded-lg bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-3" />
              <p className="font-medium mb-1">Add-on Activated!</p>
              <p className="text-sm text-muted-foreground mb-4">
                {addon.display_name} is now active on your account.
              </p>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          )}

          {/* Failed State */}
          {paymentStatus === "failed" && (
            <div className="p-6 text-center border rounded-lg bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
              <p className="font-medium mb-1">Payment Failed</p>
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                {errorMessage || "Something went wrong"}
              </p>
              <Button onClick={resetPayment}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
