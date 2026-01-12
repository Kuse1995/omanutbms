import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBilling } from "@/hooks/useBilling";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { BILLING_PLANS, PlanFeatures, formatPrice } from "@/lib/billing-plans";
import { Check, X, Mail, Crown, Users, Package, Info, Sparkles, Clock } from "lucide-react";
import { UpgradePlanModal } from "./UpgradePlanModal";

export function PlanOverview() {
  const { 
    loading, 
    plan, 
    status, 
    planConfig, 
    isActive,
    getLimit 
  } = useBilling();
  const { isTrialing, daysRemaining } = useTrialStatus();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
        <div className="h-60 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const getStatusColor = () => {
    switch (status) {
      case "active": return "bg-green-500";
      case "trial": return "bg-blue-500";
      case "suspended": return "bg-destructive";
      default: return "bg-muted";
    }
  };

  const featureLabels: Record<keyof PlanFeatures, string> = {
    inventory: "Inventory Management",
    payroll: "HR & Payroll",
    agents: "Agent Network",
    impact: "Impact Reporting",
    advanced_accounting: "Advanced Accounting",
    website: "Website Management",
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-background shadow-sm text-primary">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <h3 className="text-2xl font-bold">{planConfig.label}</h3>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getStatusColor()}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
              {isTrialing && daysRemaining !== null && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {daysRemaining} days left
                </div>
              )}
            </div>
          </div>
        </div>
        <CardContent className="pt-6">
          <p className="text-muted-foreground mb-4">{planConfig.description}</p>
          
          {/* Pricing Info */}
          {planConfig.monthlyPrice > 0 && (
            <div className="bg-muted/30 rounded-lg p-4 mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{formatPrice(planConfig.monthlyPrice)}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                or {formatPrice(planConfig.annualPrice)}/year (save 20%)
              </p>
            </div>
          )}
          
          {!isActive && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Subscription {status}</p>
                  <p className="text-sm text-muted-foreground">Contact administrator to activate.</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">
                {getLimit("users") === Infinity ? "∞" : getLimit("users")}
              </p>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <Package className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">
                {getLimit("inventoryItems") === Infinity ? "∞" : getLimit("inventoryItems").toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Inventory Items</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Included Features</CardTitle>
          <CardDescription>Features available with your {planConfig.label} plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(planConfig.features) as [keyof PlanFeatures, boolean][]).map(
              ([feature, enabled]) => (
                <div key={feature} className={`flex items-center gap-2 p-2 rounded-md ${enabled ? "" : "opacity-50"}`}>
                  {enabled ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4" />}
                  <span className="text-sm">{featureLabels[feature]}</span>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      {plan !== "enterprise" && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
            <div>
              <h3 className="font-semibold">Need more features?</h3>
              <p className="text-muted-foreground text-sm">Upgrade to unlock additional capabilities.</p>
            </div>
            <Button className="gap-2" onClick={() => setUpgradeModalOpen(true)}>
              <Sparkles className="w-4 h-4" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Contact for Enterprise */}
      {plan === "enterprise" && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
            <div>
              <h3 className="font-semibold">Enterprise Support</h3>
              <p className="text-muted-foreground text-sm">Contact your account manager for assistance.</p>
            </div>
            <Button variant="outline" className="gap-2" asChild>
              <a href="mailto:admin@omanut.co">
                <Mail className="w-4 h-4" />
                Contact Support
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-center text-muted-foreground">Managed by Omanut</p>
      
      <UpgradePlanModal 
        open={upgradeModalOpen} 
        onOpenChange={setUpgradeModalOpen} 
      />
    </div>
  );
}
