import { ReactNode } from "react";
import { useFeatures } from "@/hooks/useFeatures";
import { FeatureKey } from "@/lib/feature-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FeatureGuardProps {
  feature: FeatureKey;
  children: ReactNode;
  featureName?: string;
}

/**
 * Wraps feature-specific content and prevents rendering if the feature is disabled.
 * Shows a user-friendly message when the feature is not available.
 */
export function FeatureGuard({ feature, children, featureName }: FeatureGuardProps) {
  const { isEnabled, loading } = useFeatures();

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

  // Show disabled state if feature is not enabled
  if (!isEnabled(feature)) {
    const displayName = featureName || feature.charAt(0).toUpperCase() + feature.slice(1);
    
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
              The <span className="font-medium">{displayName}</span> feature is not enabled for your organization.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Contact your administrator to enable this feature.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
