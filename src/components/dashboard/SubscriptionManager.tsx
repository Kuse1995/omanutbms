import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Calendar, Clock, Sparkles, ArrowUpRight } from "lucide-react";
import { useBilling } from "@/hooks/useBilling";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { formatLocalPrice } from "@/lib/currency-config";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { PaymentModal } from "./PaymentModal";

export function SubscriptionManager() {
  const { planConfig, status } = useBilling();
  const { isTrialing, daysRemaining } = useTrialStatus();
  const { countryCode } = useGeoLocation();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  const trialProgress = daysRemaining !== null ? ((7 - daysRemaining) / 7) * 100 : 0;

  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 border-green-500/20",
    trial: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    inactive: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    suspended: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscription
              </CardTitle>
              <CardDescription>Manage your plan and billing</CardDescription>
            </div>
            <Badge className={statusColors[status] || statusColors.inactive}>
              {status === "trial" ? `Trial (${daysRemaining} days left)` : status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{planConfig.label} Plan</p>
                <p className="text-sm text-muted-foreground">{planConfig.description}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">
                {formatLocalPrice(planConfig.monthlyPrice, countryCode)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
            </div>
          </div>

          {isTrialing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Trial Period
                </span>
                <span className="font-medium">{daysRemaining} days remaining</span>
              </div>
              <Progress value={trialProgress} className="h-2" />
            </div>
          )}

          <div className="flex gap-3">
            {status === "trial" || status === "inactive" ? (
              <Button className="flex-1 gap-2" onClick={() => setPaymentModalOpen(true)}>
                <ArrowUpRight className="w-4 h-4" />
                Subscribe Now
              </Button>
            ) : (
              <Button variant="outline" className="flex-1 gap-2">
                <Calendar className="w-4 h-4" />
                Manage Subscription
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            Secure payments powered by Lenco • Cancel anytime
          </div>
        </CardContent>
      </Card>
      <PaymentModal open={paymentModalOpen} onOpenChange={setPaymentModalOpen} />
    </>
  );
}
