import { ReactNode, useState } from "react";
import { useFeatures } from "@/hooks/useFeatures";
import { useBilling } from "@/hooks/useBilling";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { useTenant } from "@/hooks/useTenant";
import { FeatureKey } from "@/lib/feature-config";
import { PlanFeatures, BillingPlan } from "@/lib/billing-plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, Lock, Sparkles, Check, Crown, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UpgradePlanModal } from "./UpgradePlanModal";
import { canManageBilling, type AppRole } from "@/lib/role-config";

interface FeatureGuardProps {
  feature: FeatureKey;
  children: ReactNode;
  featureName?: string;
}

/**
 * Wraps feature-specific content and prevents rendering if the feature is disabled.
 * Checks both business type configuration AND billing plan for feature access.
 * Shows a user-friendly message when the feature is not available.
 */
export function FeatureGuard({ feature, children, featureName }: FeatureGuardProps) {
  const { isEnabled, loading: featuresLoading } = useFeatures();
  const { isFeatureAllowed, isActive, plan, planConfig, status, getRequiredPlan, loading: billingLoading } = useBilling();
  const { plans, planKeys, loading: plansLoading } = useBillingPlans();
  const { businessProfile, tenantUser } = useTenant();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const userRole = (tenantUser as any)?.role as AppRole | null;
  const isOwner = canManageBilling(userRole, tenantUser?.is_owner);
  const deactivatedAt = (businessProfile as any)?.deactivated_at;

  const loading = featuresLoading || billingLoading || plansLoading;

  // Show loading skeleton while features are being loaded
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const displayName = featureName || feature.charAt(0).toUpperCase() + feature.slice(1);
  const businessTypeAllows = isEnabled(feature);
  const billingAllows = isFeatureAllowed(feature as keyof PlanFeatures);

  // Grace period helper
  const getGraceCountdown = () => {
    if (!deactivatedAt) return null;
    const deadline = new Date(deactivatedAt);
    deadline.setDate(deadline.getDate() + 5);
    const diff = deadline.getTime() - Date.now();
    if (diff <= 0) return { text: "Grace period expired. Account deletion is imminent.", urgent: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return {
      text: days > 0 ? `${days}d ${hours}h remaining before data deletion` : `${hours}h remaining — act now!`,
      urgent: days === 0,
    };
  };

  // Check if billing is inactive/suspended
  if (!isActive) {
    const grace = getGraceCountdown();

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="max-w-3xl w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Subscription Required</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {isOwner
                ? "Choose a plan to reactivate your account and unlock all features."
                : "Your organization's subscription is inactive. Please contact your administrator."}
            </p>
          </div>

          {/* Grace period */}
          {grace && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border mx-auto max-w-md ${
              grace.urgent
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-muted bg-muted/50 text-muted-foreground"
            }`}>
              {grace.urgent ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
              <p className="text-sm font-medium">{grace.urgent ? "⚠️ " : "⏳ "}{grace.text}</p>
            </div>
          )}

          {/* Plan cards for owners */}
          {isOwner ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {planKeys.map((key) => {
                const p = plans[key];
                return (
                  <Card key={key} className={`relative flex flex-col ${p.popular ? "border-primary shadow-md ring-1 ring-primary/20" : ""}`}>
                    {p.popular && (
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1 bg-primary text-primary-foreground">
                        <Crown className="w-3 h-3" /> Popular
                      </Badge>
                    )}
                    <CardHeader className="pb-3 pt-5">
                      <CardTitle className="text-base">{p.label}</CardTitle>
                      <div className="mt-1">
                        <span className="text-2xl font-bold text-foreground">{p.currency} {p.monthlyPrice.toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col pt-0">
                      <ul className="space-y-1.5 mb-4 flex-1">
                        {p.highlights.slice(0, 4).map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => window.location.href = `/pay?plan=${key}`}
                        variant={p.popular ? "default" : "outline"}
                        className="w-full gap-1"
                        size="sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Subscribe
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="max-w-md mx-auto bg-muted/50">
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">Contact your organization's administrator to reactivate the subscription.</p>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-center text-muted-foreground">Managed by Omanut</p>
        </div>
      </div>
    );
  }

  // Check if business type doesn't allow this feature
  if (!businessTypeAllows) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full bg-muted/50 border-muted">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <ShieldX className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl text-foreground">
              Feature Not Available
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              The <span className="font-medium">{displayName}</span> feature is not available for your business type.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Contact your administrator if you need this feature.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if billing plan doesn't include this feature
  if (!billingAllows) {
    const requiredPlan = getRequiredPlan(feature as keyof PlanFeatures);
    const requiredPlanLabel = requiredPlan ? plans[requiredPlan].label : "Higher";

    return (
      <>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full bg-muted/50 border-muted">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl text-foreground">
                Upgrade Required
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex justify-center gap-2">
                <Badge variant="secondary">Current: {planConfig.label}</Badge>
                <Badge variant="default">Required: {requiredPlanLabel}</Badge>
              </div>
              <p className="text-muted-foreground">
                The <span className="font-medium">{displayName}</span> feature requires the{" "}
                <span className="font-medium">{requiredPlanLabel}</span> plan or higher.
              </p>
              <Button onClick={() => setUpgradeModalOpen(true)} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Upgrade to {requiredPlanLabel}
              </Button>
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                Managed by Omanut
              </p>
            </CardContent>
          </Card>
        </div>
        <UpgradePlanModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} />
      </>
    );
  }

  return <>{children}</>;
}
