import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, Pencil, Loader2, MessageCircle, Building2, DollarSign } from "lucide-react";

interface AddonDefinition {
  id: string;
  addon_key: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  pricing_type: "usage" | "fixed" | "tiered";
  monthly_price: number | null;
  annual_price: number | null;
  unit_price: number | null;
  unit_label: string | null;
  starter_limit: number | null;
  growth_limit: number | null;
  enterprise_limit: number | null;
  currency: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

const iconMap: Record<string, typeof Package> = {
  Package,
  MessageCircle,
  Building2,
};

const pricingTypeLabels: Record<string, string> = {
  usage: "Usage-Based (Per Unit)",
  fixed: "Fixed Monthly Price",
  tiered: "Tiered by Plan",
};

export function AddonsConfigManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingAddon, setEditingAddon] = useState<AddonDefinition | null>(null);
  const [formData, setFormData] = useState<Partial<AddonDefinition>>({});

  // Fetch addon definitions
  const { data: addons, isLoading } = useQuery({
    queryKey: ["addon-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addon_definitions")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data as AddonDefinition[];
    },
  });

  // Update addon mutation
  const updateAddonMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AddonDefinition> }) => {
      const { error } = await supabase
        .from("addon_definitions")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addon-definitions"] });
      setEditingAddon(null);
      setFormData({});
      toast({
        title: "Add-on updated",
        description: "The add-on configuration has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating add-on",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (addon: AddonDefinition) => {
    setEditingAddon(addon);
    setFormData({
      display_name: addon.display_name,
      description: addon.description,
      icon: addon.icon,
      pricing_type: addon.pricing_type,
      monthly_price: addon.monthly_price,
      annual_price: addon.annual_price,
      unit_price: addon.unit_price,
      unit_label: addon.unit_label,
      starter_limit: addon.starter_limit,
      growth_limit: addon.growth_limit,
      enterprise_limit: addon.enterprise_limit,
      currency: addon.currency,
      is_active: addon.is_active,
      sort_order: addon.sort_order,
    });
  };

  const handleSave = () => {
    if (!editingAddon) return;
    updateAddonMutation.mutate({
      id: editingAddon.id,
      updates: formData,
    });
  };

  const getPricingDisplay = (addon: AddonDefinition) => {
    switch (addon.pricing_type) {
      case "usage":
        return `K${addon.unit_price} ${addon.unit_label || "per unit"}`;
      case "fixed":
        return `K${addon.monthly_price}/mo`;
      case "tiered":
        return "Plan-based limits";
      default:
        return "—";
    }
  };

  const getIcon = (iconName: string | null) => {
    const IconComponent = iconMap[iconName || "Package"] || Package;
    return <IconComponent className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading add-on configurations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
          Add-ons Configuration
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Configure add-on pricing, limits, and availability. These add-ons can be applied to tenants.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {addons?.map((addon) => (
            <Card 
              key={addon.id} 
              className={`relative ${addon.is_active ? "border-primary/30" : "border-muted opacity-60"}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getIcon(addon.icon)}
                    <CardTitle className="text-base">
                      {addon.display_name}
                    </CardTitle>
                  </div>
                  <Badge variant={addon.is_active ? "default" : "secondary"}>
                    {addon.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-1">
                  {addon.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Pricing Type */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline" className="text-xs">
                    {pricingTypeLabels[addon.pricing_type]}
                  </Badge>
                </div>

                {/* Pricing Display */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pricing:</span>
                  <span className="font-semibold">{getPricingDisplay(addon)}</span>
                </div>

                {/* Tiered Limits */}
                {addon.pricing_type === "tiered" && (
                  <div className="text-xs space-y-1 bg-muted/50 rounded p-2">
                    <p className="font-medium">Plan Limits:</p>
                    <div className="grid grid-cols-3 gap-1">
                      <span>Starter: {addon.starter_limit ?? "—"}</span>
                      <span>Growth: {addon.growth_limit ?? "—"}</span>
                      <span>Enterprise: {addon.enterprise_limit === null ? "∞" : addon.enterprise_limit}</span>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => handleEdit(addon)} 
                  className="w-full"
                  variant="secondary"
                  size="sm"
                >
                  <Pencil className="h-3 w-3 mr-2" />
                  Edit Add-on
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingAddon} onOpenChange={(open) => !open && setEditingAddon(null)}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                Edit {editingAddon?.display_name}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Configure pricing and limits for this add-on.
              </DialogDescription>
            </DialogHeader>

            {editingAddon && (
              <div className="grid gap-4 sm:gap-6 py-2 sm:py-4">
                {/* Basic Info */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Display Name</Label>
                      <Input
                        className="text-sm"
                        value={formData.display_name || ""}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Icon</Label>
                      <Select
                        value={formData.icon || "Package"}
                        onValueChange={(value) => setFormData({ ...formData, icon: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Package">Package</SelectItem>
                          <SelectItem value="MessageCircle">Message Circle</SelectItem>
                          <SelectItem value="Building2">Building</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Description</Label>
                    <Textarea
                      className="text-sm"
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs sm:text-sm">Active</Label>
                    <Switch
                      checked={formData.is_active ?? true}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    Pricing
                  </h4>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Pricing Type</Label>
                    <Select
                      value={formData.pricing_type || "usage"}
                      onValueChange={(value: "usage" | "fixed" | "tiered") => 
                        setFormData({ ...formData, pricing_type: value })
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usage">Usage-Based (Per Unit)</SelectItem>
                        <SelectItem value="fixed">Fixed Monthly Price</SelectItem>
                        <SelectItem value="tiered">Tiered by Plan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.pricing_type === "usage" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">Unit Price (K)</Label>
                        <Input
                          className="text-sm"
                          type="number"
                          step="0.01"
                          value={formData.unit_price ?? ""}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            unit_price: e.target.value ? Number(e.target.value) : null 
                          })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">Unit Label</Label>
                        <Input
                          className="text-sm"
                          value={formData.unit_label || ""}
                          onChange={(e) => setFormData({ ...formData, unit_label: e.target.value })}
                          placeholder="per item"
                        />
                      </div>
                    </div>
                  )}

                  {formData.pricing_type === "fixed" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">Monthly Price (K)</Label>
                        <Input
                          className="text-sm"
                          type="number"
                          value={formData.monthly_price ?? ""}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            monthly_price: e.target.value ? Number(e.target.value) : null 
                          })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">Annual Price (K)</Label>
                        <Input
                          className="text-sm"
                          type="number"
                          value={formData.annual_price ?? ""}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            annual_price: e.target.value ? Number(e.target.value) : null 
                          })}
                        />
                      </div>
                    </div>
                  )}

                  {formData.pricing_type === "tiered" && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs sm:text-sm">Unit Price (K) - Over Limit</Label>
                          <Input
                            className="text-sm"
                            type="number"
                            step="0.01"
                            value={formData.unit_price ?? ""}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              unit_price: e.target.value ? Number(e.target.value) : null 
                            })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs sm:text-sm">Unit Label</Label>
                          <Input
                            className="text-sm"
                            value={formData.unit_label || ""}
                            onChange={(e) => setFormData({ ...formData, unit_label: e.target.value })}
                            placeholder="per message"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs sm:text-sm">Starter Limit</Label>
                          <Input
                            className="text-sm"
                            type="number"
                            value={formData.starter_limit ?? ""}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              starter_limit: e.target.value ? Number(e.target.value) : null 
                            })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs sm:text-sm">Growth Limit</Label>
                          <Input
                            className="text-sm"
                            type="number"
                            value={formData.growth_limit ?? ""}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              growth_limit: e.target.value ? Number(e.target.value) : null 
                            })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs sm:text-sm">Enterprise Limit</Label>
                          <Input
                            className="text-sm"
                            type="number"
                            value={formData.enterprise_limit ?? ""}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              enterprise_limit: e.target.value ? Number(e.target.value) : null 
                            })}
                            placeholder="∞ (blank)"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditingAddon(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={updateAddonMutation.isPending}
              >
                {updateAddonMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
