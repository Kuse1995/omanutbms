import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFeatures } from "@/hooks/useFeatures";
import { useBilling } from "@/hooks/useBilling";
import { allModules, ModuleDefinition } from "@/lib/modules-config";
import { supabase } from "@/integrations/supabase/client";
import { AddonPurchaseModal } from "./AddonPurchaseModal";
import { 
  Check, Lock, Mail, Sparkles, Package, LayoutDashboard, ShoppingCart, 
  Receipt, Calculator, Users, Shield, Settings, Store, Briefcase, 
  BookOpen, Heart, Globe, Warehouse, Info, Zap 
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

interface ModuleCardProps {
  module: ModuleDefinition;
  isEnabled: boolean;
  addon?: AddonDefinition;
  onActivate?: (addon: AddonDefinition) => void;
}

function ModuleCard({ module, isEnabled, addon, onActivate }: ModuleCardProps) {
  const Icon = getIconComponent(module.icon);
  const isCore = module.category === 'core';

  const price = addon?.monthly_price || module.pricing?.monthlyPriceZMW;
  const isUsageBased = addon?.pricing_type === "per_unit";

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
          
          {!isEnabled && !isCore && addon && (
            <Button 
              variant="default" 
              size="sm" 
              className="text-xs gap-1"
              onClick={() => onActivate?.(addon)}
            >
              <Zap className="w-3 h-3" />
              Activate
            </Button>
          )}
          
          {!isEnabled && !isCore && !addon && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs gap-1" disabled>
                    <Sparkles className="w-3 h-3" />
                    Upgrade
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Contact support to enable this module</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {/* Pricing info */}
        {price && !isEnabled && (
          <div className="flex items-center gap-1 mt-3 pt-3 border-t text-sm">
            <span className="font-semibold text-foreground">K{price.toLocaleString()}</span>
            <span className="text-muted-foreground">
              {isUsageBased ? `/${addon?.unit_label || "unit"}` : "/month"}
            </span>
            {isUsageBased && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground ml-1" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Usage-based pricing. You pay for what you use beyond your plan limits.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
        
        {module.pricing?.description && isEnabled && (
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
  const { plan, planConfig } = useBilling();
  const [addons, setAddons] = useState<AddonDefinition[]>([]);
  const [selectedAddon, setSelectedAddon] = useState<AddonDefinition | null>(null);
  const [addonModalOpen, setAddonModalOpen] = useState(false);

  // Fetch addon definitions
  useEffect(() => {
    const fetchAddons = async () => {
      const { data } = await supabase
        .from("addon_definitions")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (data) {
        setAddons(data);
      }
    };
    fetchAddons();
  }, []);

  const isModuleEnabled = (module: ModuleDefinition): boolean => {
    if (module.category === 'core') return true;
    
    const featureKey = module.requiredFeatures?.[0];
    if (!featureKey) return module.defaultEnabled;
    
    return features[featureKey as keyof typeof features] ?? module.defaultEnabled;
  };

  // Map module keys to addon keys
  const getAddonForModule = (module: ModuleDefinition): AddonDefinition | undefined => {
    const moduleToAddonMap: Record<string, string> = {
      'inventory': 'inventory_items',
      'warehouse': 'warehouse_management',
      'agents': 'multi_branch',
      'website_cms': 'whatsapp_messages',
    };
    const addonKey = moduleToAddonMap[module.moduleKey];
    return addons.find(a => a.addon_key === addonKey);
  };

  const handleActivateAddon = (addon: AddonDefinition) => {
    setSelectedAddon(addon);
    setAddonModalOpen(true);
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

      {/* Current Plan Summary */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-xl font-bold">{planConfig.label}</p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {plan === "growth" ? "Pro" : plan === "enterprise" ? "Enterprise" : "Starter"}
            </Badge>
          </div>
        </CardContent>
      </Card>

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
                addon={getAddonForModule(module)}
                onActivate={handleActivateAddon}
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
          <Button className="gap-2 whitespace-nowrap" asChild>
            <a href="mailto:admin@omanut.co?subject=Custom Plan Request">
              <Mail className="w-4 h-4" />
              Contact Sales
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Addon Purchase Modal */}
      <AddonPurchaseModal
        open={addonModalOpen}
        onOpenChange={setAddonModalOpen}
        addon={selectedAddon}
        onSuccess={() => {
          // Refresh the page to reflect the new addon status
          window.location.reload();
        }}
      />
    </div>
  );
}
