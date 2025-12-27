import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeatures } from "@/hooks/useFeatures";
import { useBranding } from "@/hooks/useBranding";
import { allModules } from "@/lib/modules-config";
import { Check, Mail, Crown, Sparkles, Building2 } from "lucide-react";

function determinePlanTier(enabledAddons: number): { name: string; icon: React.ReactNode; color: string } {
  if (enabledAddons >= 4) {
    return { 
      name: 'Enterprise', 
      icon: <Crown className="w-5 h-5" />,
      color: 'text-amber-600'
    };
  }
  if (enabledAddons >= 2) {
    return { 
      name: 'Growth', 
      icon: <Sparkles className="w-5 h-5" />,
      color: 'text-primary'
    };
  }
  return { 
    name: 'Starter', 
    icon: <Building2 className="w-5 h-5" />,
    color: 'text-muted-foreground'
  };
}

export function PlanOverview() {
  const { features, loading, companyName } = useFeatures();
  const { isWhiteLabel } = useBranding();

  const coreModules = allModules.filter(m => m.category === 'core');
  const addonModules = allModules.filter(m => m.category === 'addon');

  const enabledAddons = addonModules.filter(module => {
    const featureKey = module.requiredFeatures?.[0];
    if (!featureKey) return module.defaultEnabled;
    return features[featureKey as keyof typeof features] ?? module.defaultEnabled;
  });

  const plan = determinePlanTier(enabledAddons.length);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
        <div className="h-60 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-background shadow-sm ${plan.color}`}>
                {plan.icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <h3 className="text-2xl font-bold">{plan.name}</h3>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              Active
            </Badge>
          </div>
        </div>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold">{coreModules.length}</p>
              <p className="text-sm text-muted-foreground">Core Modules</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold">{enabledAddons.length}</p>
              <p className="text-sm text-muted-foreground">Active Add-ons</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold">{addonModules.length - enabledAddons.length}</p>
              <p className="text-sm text-muted-foreground">Available Add-ons</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold">{isWhiteLabel ? 'Yes' : 'No'}</p>
              <p className="text-sm text-muted-foreground">White-Label</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle>Active Add-ons</CardTitle>
          <CardDescription>
            Additional modules enabled for {companyName || 'your organization'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enabledAddons.length > 0 ? (
            <div className="space-y-3">
              {enabledAddons.map(module => (
                <div 
                  key={module.moduleKey}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{module.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {module.pricing?.tier ? `${module.pricing.tier.charAt(0).toUpperCase() + module.pricing.tier.slice(1)} tier` : 'Add-on'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No add-ons currently active</p>
              <p className="text-sm">Contact sales to enable additional features</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Core Modules Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Core Modules Included</CardTitle>
          <CardDescription>
            These modules are always available with every plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {coreModules.map(module => (
              <div 
                key={module.moduleKey}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
              >
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm truncate">{module.displayName}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Sales CTA */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
          <div>
            <h3 className="font-semibold text-lg">Need to upgrade your plan?</h3>
            <p className="text-muted-foreground text-sm">
              Contact our sales team to add more modules or change your subscription.
            </p>
          </div>
          <Button className="gap-2 whitespace-nowrap">
            <Mail className="w-4 h-4" />
            Contact Sales
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
