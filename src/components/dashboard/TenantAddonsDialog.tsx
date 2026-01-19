import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Package, Loader2, MessageCircle, Building2, DollarSign, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TenantAddonsDialogProps {
  tenantId: string;
  tenantName: string;
  billingPlan: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AddonDefinition {
  id: string;
  addon_key: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  pricing_type: "usage" | "fixed" | "tiered";
  monthly_price: number | null;
  unit_price: number | null;
  unit_label: string | null;
  starter_limit: number | null;
  growth_limit: number | null;
  enterprise_limit: number | null;
  is_active: boolean | null;
}

interface TenantAddon {
  id: string;
  tenant_id: string;
  addon_key: string;
  is_enabled: boolean;
  custom_unit_price: number | null;
  custom_monthly_price: number | null;
  custom_limit: number | null;
  current_usage: number;
  usage_reset_date: string | null;
  notes: string | null;
}

const iconMap: Record<string, typeof Package> = {
  Package,
  MessageCircle,
  Building2,
};

export function TenantAddonsDialog({ 
  tenantId, 
  tenantName, 
  billingPlan, 
  open, 
  onOpenChange 
}: TenantAddonsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localAddons, setLocalAddons] = useState<Record<string, Partial<TenantAddon>>>({});

  // Fetch addon definitions
  const { data: addonDefinitions, isLoading: loadingDefs } = useQuery({
    queryKey: ["addon-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addon_definitions")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as AddonDefinition[];
    },
  });

  // Fetch tenant's current addons
  const { data: tenantAddons, isLoading: loadingTenantAddons } = useQuery({
    queryKey: ["tenant-addons", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_addons")
        .select("*")
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return data as TenantAddon[];
    },
    enabled: open && !!tenantId,
  });

  // Initialize local state from fetched addons
  useEffect(() => {
    if (tenantAddons) {
      const addonMap: Record<string, Partial<TenantAddon>> = {};
      tenantAddons.forEach((addon) => {
        addonMap[addon.addon_key] = addon;
      });
      setLocalAddons(addonMap);
    }
  }, [tenantAddons]);

  // Upsert tenant addon mutation
  const upsertAddonMutation = useMutation({
    mutationFn: async ({ addonKey, data }: { addonKey: string; data: Partial<TenantAddon> }) => {
      const existingAddon = tenantAddons?.find(a => a.addon_key === addonKey);
      
      if (existingAddon) {
        const { error } = await supabase
          .from("tenant_addons")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAddon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tenant_addons")
          .insert({
            tenant_id: tenantId,
            addon_key: addonKey,
            ...data,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-addons", tenantId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating add-on",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = async (addonKey: string, enabled: boolean) => {
    setLocalAddons(prev => ({
      ...prev,
      [addonKey]: { ...prev[addonKey], is_enabled: enabled },
    }));
    
    await upsertAddonMutation.mutateAsync({
      addonKey,
      data: { is_enabled: enabled },
    });

    // Sync multi_branch addon with business_profiles.multi_branch_enabled
    if (addonKey === "multi_branch") {
      const { error } = await supabase
        .from("business_profiles")
        .update({ multi_branch_enabled: enabled })
        .eq("tenant_id", tenantId);
      
      if (error) {
        console.error("Error updating multi_branch_enabled:", error);
        toast({
          title: "Warning",
          description: "Add-on toggled but feature flag sync failed. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }
    
    toast({
      title: enabled ? "Add-on enabled" : "Add-on disabled",
      description: `${addonKey.replace(/_/g, " ")} has been ${enabled ? "enabled" : "disabled"} for ${tenantName}.`,
    });
  };

  const handleCustomPriceChange = (addonKey: string, field: string, value: number | null) => {
    setLocalAddons(prev => ({
      ...prev,
      [addonKey]: { ...prev[addonKey], [field]: value },
    }));
  };

  const handleSaveCustomPrice = async (addonKey: string) => {
    const addon = localAddons[addonKey];
    if (!addon) return;
    
    await upsertAddonMutation.mutateAsync({
      addonKey,
      data: {
        custom_unit_price: addon.custom_unit_price,
        custom_monthly_price: addon.custom_monthly_price,
        custom_limit: addon.custom_limit,
        notes: addon.notes,
      },
    });
    
    toast({
      title: "Custom pricing saved",
      description: `Custom pricing for ${addonKey.replace(/_/g, " ")} has been saved.`,
    });
  };

  const getPlanLimit = (addon: AddonDefinition): number | null => {
    switch (billingPlan) {
      case "starter":
        return addon.starter_limit;
      case "growth":
        return addon.growth_limit;
      case "enterprise":
        return addon.enterprise_limit;
      default:
        return addon.starter_limit;
    }
  };

  const getIcon = (iconName: string | null) => {
    const IconComponent = iconMap[iconName || "Package"] || Package;
    return <IconComponent className="h-4 w-4" />;
  };

  const isLoading = loadingDefs || loadingTenantAddons;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Manage Add-ons: {tenantName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Current plan: <Badge variant="outline">{billingPlan}</Badge>
            <span className="text-xs text-muted-foreground">
              Enable/disable add-ons and set custom pricing overrides.
            </span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading add-ons...</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {addonDefinitions?.map((def) => {
              const tenantAddon = localAddons[def.addon_key];
              const isEnabled = tenantAddon?.is_enabled ?? false;
              const planLimit = getPlanLimit(def);
              const effectiveLimit = tenantAddon?.custom_limit ?? planLimit;
              const currentUsage = tenantAddon?.current_usage ?? 0;

              return (
                <div 
                  key={def.addon_key} 
                  className={`p-4 rounded-lg border ${isEnabled ? "border-primary/30 bg-primary/5" : "border-muted"}`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${isEnabled ? "bg-primary/10" : "bg-muted"}`}>
                        {getIcon(def.icon)}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{def.display_name}</h4>
                        <p className="text-xs text-muted-foreground">{def.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggle(def.addon_key, checked)}
                      disabled={upsertAddonMutation.isPending}
                    />
                  </div>

                  {isEnabled && (
                    <>
                      <Separator className="my-3" />
                      
                      {/* Usage & Limits for tiered/usage */}
                      {(def.pricing_type === "tiered" || def.pricing_type === "usage") && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                          <div className="bg-muted/50 rounded p-2">
                            <p className="text-xs text-muted-foreground">Current Usage</p>
                            <p className="font-semibold text-sm">{currentUsage}</p>
                          </div>
                          <div className="bg-muted/50 rounded p-2">
                            <p className="text-xs text-muted-foreground">Plan Limit</p>
                            <p className="font-semibold text-sm">
                              {planLimit === null ? "Unlimited" : planLimit}
                            </p>
                          </div>
                          {def.pricing_type === "tiered" && (
                            <div className="bg-muted/50 rounded p-2">
                              <p className="text-xs text-muted-foreground">Overage Rate</p>
                              <p className="font-semibold text-sm">
                                K{tenantAddon?.custom_unit_price ?? def.unit_price} {def.unit_label}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Custom Pricing Overrides */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Info className="h-3 w-3" />
                          <span>Custom overrides (leave blank to use defaults)</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {def.pricing_type === "fixed" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Custom Monthly Price (K)</Label>
                              <Input
                                type="number"
                                className="h-8 text-sm"
                                value={tenantAddon?.custom_monthly_price ?? ""}
                                onChange={(e) => handleCustomPriceChange(
                                  def.addon_key, 
                                  "custom_monthly_price", 
                                  e.target.value ? Number(e.target.value) : null
                                )}
                                placeholder={String(def.monthly_price)}
                              />
                            </div>
                          )}
                          
                          {(def.pricing_type === "usage" || def.pricing_type === "tiered") && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs">Custom Unit Price (K)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-8 text-sm"
                                  value={tenantAddon?.custom_unit_price ?? ""}
                                  onChange={(e) => handleCustomPriceChange(
                                    def.addon_key, 
                                    "custom_unit_price", 
                                    e.target.value ? Number(e.target.value) : null
                                  )}
                                  placeholder={String(def.unit_price)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Custom Limit</Label>
                                <Input
                                  type="number"
                                  className="h-8 text-sm"
                                  value={tenantAddon?.custom_limit ?? ""}
                                  onChange={(e) => handleCustomPriceChange(
                                    def.addon_key, 
                                    "custom_limit", 
                                    e.target.value ? Number(e.target.value) : null
                                  )}
                                  placeholder={planLimit === null ? "Unlimited" : String(planLimit)}
                                />
                              </div>
                            </>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Notes</Label>
                          <Textarea
                            className="h-16 text-sm resize-none"
                            value={tenantAddon?.notes ?? ""}
                            onChange={(e) => setLocalAddons(prev => ({
                              ...prev,
                              [def.addon_key]: { ...prev[def.addon_key], notes: e.target.value || null },
                            }))}
                            placeholder="Internal notes about this add-on for this tenant..."
                          />
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSaveCustomPrice(def.addon_key)}
                          disabled={upsertAddonMutation.isPending}
                        >
                          {upsertAddonMutation.isPending && (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          )}
                          Save Custom Settings
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
