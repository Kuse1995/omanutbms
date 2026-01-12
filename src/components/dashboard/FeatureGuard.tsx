import { ReactNode, useState } from "react";
import { useFeatures } from "@/hooks/useFeatures";
import { useBilling } from "@/hooks/useBilling";
import { FeatureKey } from "@/lib/feature-config";
import { PlanFeatures, BILLING_PLANS } from "@/lib/billing-plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, Lock, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UpgradePlanModal } from "./UpgradePlanModal";

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
  const { isFeatureAllowed, isActive, plan, status, getRequiredPlan, loading: billingLoading } = useBilling();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const loading = featuresLoading || billingLoading;

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

  // Check if billing is inactive/suspended
  if (!isActive) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full bg-muted/50 border-muted">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Lock className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-xl text-foreground">
                Subscription Required
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Badge variant="outline" className="text-muted-foreground">
                Status: {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
              <p className="text-muted-foreground">
                Your subscription is currently <span className="font-medium">{status}</span>.
              </p>
              <Button onClick={() => setUpgradeModalOpen(true)} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Activate Subscription
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
    const requiredPlanLabel = requiredPlan ? BILLING_PLANS[requiredPlan].label : "Higher";

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
                <Badge variant="secondary">Current: {BILLING_PLANS[plan].label}</Badge>
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
