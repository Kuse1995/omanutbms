import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeatures } from "@/hooks/useFeatures";
import { allModules, ModuleDefinition } from "@/lib/modules-config";
import { 
  Check, Lock, Mail, Sparkles, Package, LayoutDashboard, ShoppingCart, 
  Receipt, Calculator, Users, Shield, Settings, Store, Briefcase, 
  BookOpen, Heart, Globe, Warehouse 
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Package, LayoutDashboard, ShoppingCart, Receipt, Calculator, 
  Users, Shield, Settings, Store, Briefcase, BookOpen, Heart, Globe, Warehouse,
};

function getIconComponent(iconName: string) {
  return iconMap[iconName] || Package;
}

function getPricingBadge(tier: string | undefined) {
  switch (tier) {
    case 'starter':
      return <Badge variant="secondary" className="text-xs">Starter</Badge>;
    case 'growth':
      return <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Growth</Badge>;
    case 'enterprise':
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Enterprise</Badge>;
    default:
      return null;
  }
}

interface ModuleCardProps {
  module: ModuleDefinition;
  isEnabled: boolean;
}

function ModuleCard({ module, isEnabled }: ModuleCardProps) {
  const Icon = getIconComponent(module.icon);
  const isCore = module.category === 'core';

  return (
    <Card className={`relative overflow-hidden transition-all ${
      isEnabled 
        ? 'border-primary/20 bg-card' 
        : 'border-muted bg-muted/30'
    }`}>
      {isCore && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="text-xs bg-background">Core</Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            isEnabled 
              ? 'bg-primary/10 text-primary' 
              : 'bg-muted text-muted-foreground'
          }`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{module.displayName}</CardTitle>
              {module.pricing && getPricingBadge(module.pricing.tier)}
            </div>
            <CardDescription className="text-sm mt-1 line-clamp-2">
              {module.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          {isEnabled ? (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <Check className="w-4 h-4" />
              <span>Enabled</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Disabled</span>
            </div>
          )}
          
          {!isEnabled && !isCore && (
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              Upgrade
            </Button>
          )}
        </div>
        
        {module.pricing?.description && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
            {module.pricing.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ModulesMarketplace() {
  const { features, loading } = useFeatures();

  const isModuleEnabled = (module: ModuleDefinition): boolean => {
    if (module.category === 'core') return true;
    
    const featureKey = module.requiredFeatures?.[0];
    if (!featureKey) return module.defaultEnabled;
    
    return features[featureKey as keyof typeof features] ?? module.defaultEnabled;
  };

  const coreModules = allModules.filter(m => m.category === 'core');
  const addonModules = allModules.filter(m => m.category === 'addon');

  const enabledAddons = addonModules.filter(m => isModuleEnabled(m));
  const disabledAddons = addonModules.filter(m => !isModuleEnabled(m));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="h-40 animate-pulse bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Modules & Plans</h2>
        <p className="text-muted-foreground">
          Explore available modules and features for your organization.
        </p>
      </div>

      {/* Core Modules */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          Core Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coreModules.map(module => (
            <ModuleCard 
              key={module.moduleKey} 
              module={module} 
              isEnabled={true} 
            />
          ))}
        </div>
      </section>

      {/* Active Add-ons */}
      {enabledAddons.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Active Add-ons
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enabledAddons.map(module => (
              <ModuleCard 
                key={module.moduleKey} 
                module={module} 
                isEnabled={true} 
              />
            ))}
          </div>
        </section>
      )}

      {/* Available Add-ons */}
      {disabledAddons.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-muted-foreground" />
            Available Add-ons
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {disabledAddons.map(module => (
              <ModuleCard 
                key={module.moduleKey} 
                module={module} 
                isEnabled={false} 
              />
            ))}
          </div>
        </section>
      )}

      {/* Contact Sales CTA */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
          <div>
            <h3 className="font-semibold text-lg">Need more features?</h3>
            <p className="text-muted-foreground text-sm">
              Contact our sales team to customize your plan and enable additional modules.
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
