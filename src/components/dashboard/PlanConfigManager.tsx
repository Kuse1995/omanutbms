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
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Pencil, Loader2, Check, X, Star, Zap, Crown } from "lucide-react";
import { BILLING_PLANS, BillingPlan } from "@/lib/billing-plans";

interface PlanConfig {
  id: string;
  plan_key: BillingPlan;
  label: string | null;
  description: string | null;
  tagline: string | null;
  monthly_price: number | null;
  annual_price: number | null;
  currency: string | null;
  trial_days: number | null;
  max_users: number | null;
  max_inventory_items: number | null;
  feature_inventory: boolean | null;
  feature_payroll: boolean | null;
  feature_agents: boolean | null;
  feature_impact: boolean | null;
  feature_advanced_accounting: boolean | null;
  feature_website: boolean | null;
  feature_whatsapp: boolean | null;
  whatsapp_monthly_limit: number | null;
  whatsapp_limit_enabled: boolean | null;
  highlights: string[] | null;
  is_popular: boolean | null;
  is_active: boolean | null;
  updated_at: string;
}

const planIcons: Record<BillingPlan, typeof Star> = {
  starter: Star,
  growth: Zap,
  enterprise: Crown,
};

const planColors: Record<BillingPlan, string> = {
  starter: "bg-slate-100 text-slate-700 border-slate-300",
  growth: "bg-blue-100 text-blue-700 border-blue-300",
  enterprise: "bg-amber-100 text-amber-700 border-amber-300",
};

export function PlanConfigManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);
  const [formData, setFormData] = useState<Partial<PlanConfig>>({});

  // Fetch plan configs from database
  const { data: planConfigs, isLoading } = useQuery({
    queryKey: ["billing-plan-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_plan_configs")
        .select("*")
        .order("plan_key");

      if (error) throw error;
      return data as PlanConfig[];
    },
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PlanConfig> }) => {
      const { error } = await supabase
        .from("billing_plan_configs")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-plan-configs"] });
      setEditingPlan(null);
      setFormData({});
      toast({
        title: "Plan updated",
        description: "The billing plan configuration has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (plan: PlanConfig) => {
    const defaults = BILLING_PLANS[plan.plan_key];
    setEditingPlan(plan);
    setFormData({
      label: plan.label ?? defaults.label,
      description: plan.description ?? defaults.description,
      tagline: plan.tagline ?? defaults.tagline,
      monthly_price: plan.monthly_price ?? defaults.monthlyPrice,
      annual_price: plan.annual_price ?? defaults.annualPrice,
      currency: plan.currency ?? defaults.currency,
      trial_days: plan.trial_days ?? defaults.trialDays,
      max_users: plan.max_users ?? defaults.limits.users,
      max_inventory_items: plan.max_inventory_items ?? defaults.limits.inventoryItems,
      feature_inventory: plan.feature_inventory ?? defaults.features.inventory,
      feature_payroll: plan.feature_payroll ?? defaults.features.payroll,
      feature_agents: plan.feature_agents ?? defaults.features.agents,
      feature_impact: plan.feature_impact ?? defaults.features.impact,
      feature_advanced_accounting: plan.feature_advanced_accounting ?? defaults.features.advanced_accounting,
      feature_website: plan.feature_website ?? defaults.features.website,
      feature_whatsapp: plan.feature_whatsapp ?? defaults.features.whatsapp,
      whatsapp_monthly_limit: plan.whatsapp_monthly_limit ?? (plan.plan_key === 'starter' ? 50 : plan.plan_key === 'growth' ? 500 : 0),
      whatsapp_limit_enabled: plan.whatsapp_limit_enabled ?? (plan.plan_key !== 'enterprise'),
      highlights: plan.highlights ?? defaults.highlights,
      is_popular: plan.is_popular ?? defaults.popular,
      is_active: plan.is_active ?? true,
    });
  };

  const handleSave = () => {
    if (!editingPlan) return;
    updatePlanMutation.mutate({
      id: editingPlan.id,
      updates: formData,
    });
  };

  const handleResetToDefault = () => {
    if (!editingPlan) return;
    // Set all values to null to use code defaults
    updatePlanMutation.mutate({
      id: editingPlan.id,
      updates: {
        label: null,
        description: null,
        tagline: null,
        monthly_price: null,
        annual_price: null,
        currency: null,
        trial_days: null,
        max_users: null,
        max_inventory_items: null,
        feature_inventory: null,
        feature_payroll: null,
        feature_agents: null,
        feature_impact: null,
        feature_advanced_accounting: null,
        feature_website: null,
        feature_whatsapp: null,
        whatsapp_monthly_limit: null,
        whatsapp_limit_enabled: null,
        highlights: null,
        is_popular: null,
      },
    });
  };

  const getEffectiveValue = <T,>(planKey: BillingPlan, dbValue: T | null, defaultPath: keyof typeof BILLING_PLANS[BillingPlan]): T => {
    if (dbValue !== null) return dbValue;
    return (BILLING_PLANS[planKey] as any)[defaultPath];
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading plan configurations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
          Billing Plan Configuration
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Customize plan names, prices, features, and limits. Leave fields empty to use defaults.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {planConfigs?.map((plan) => {
            const defaults = BILLING_PLANS[plan.plan_key];
            const Icon = planIcons[plan.plan_key];
            const hasOverrides = plan.label || plan.monthly_price || plan.description;
            
            return (
              <Card 
                key={plan.id} 
                className={`relative ${planColors[plan.plan_key]} border-2`}
              >
                {(plan.is_popular ?? defaults.popular) && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle className="text-lg">
                        {plan.label ?? defaults.label}
                      </CardTitle>
                    </div>
                    {hasOverrides && (
                      <Badge variant="outline" className="text-xs">
                        Customized
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-current opacity-70">
                    {plan.tagline ?? defaults.tagline}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pricing */}
                  <div>
                    <p className="text-2xl font-bold">
                      {(plan.monthly_price ?? defaults.monthlyPrice) === 0 
                        ? "Custom" 
                        : `K${(plan.monthly_price ?? defaults.monthlyPrice).toLocaleString()}`}
                      {(plan.monthly_price ?? defaults.monthlyPrice) > 0 && (
                        <span className="text-sm font-normal opacity-70">/mo</span>
                      )}
                    </p>
                    {(plan.annual_price ?? defaults.annualPrice) > 0 && (
                      <p className="text-sm opacity-70">
                        K{(plan.annual_price ?? defaults.annualPrice).toLocaleString()}/year
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Users:</strong>{" "}
                      {(plan.max_users ?? defaults.limits.users) === Infinity 
                        ? "Unlimited" 
                        : plan.max_users ?? defaults.limits.users}
                    </p>
                    <p>
                      <strong>Inventory:</strong>{" "}
                      {(plan.max_inventory_items ?? defaults.limits.inventoryItems) === Infinity 
                        ? "Unlimited" 
                        : plan.max_inventory_items ?? defaults.limits.inventoryItems}
                    </p>
                    <p>
                      <strong>Trial:</strong> {plan.trial_days ?? defaults.trialDays} days
                    </p>
                  </div>

                  {/* Features */}
                  <div className="text-sm space-y-1">
                    <p className="font-semibold mb-2">Features:</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <FeatureCheck 
                        label="Inventory" 
                        enabled={plan.feature_inventory ?? defaults.features.inventory} 
                      />
                      <FeatureCheck 
                        label="Payroll" 
                        enabled={plan.feature_payroll ?? defaults.features.payroll} 
                      />
                      <FeatureCheck 
                        label="Agents" 
                        enabled={plan.feature_agents ?? defaults.features.agents} 
                      />
                      <FeatureCheck 
                        label="Impact" 
                        enabled={plan.feature_impact ?? defaults.features.impact} 
                      />
                      <FeatureCheck 
                        label="Website" 
                        enabled={plan.feature_website ?? defaults.features.website} 
                      />
                      <FeatureCheck 
                        label="WhatsApp" 
                        enabled={plan.feature_whatsapp ?? defaults.features.whatsapp} 
                      />
                      <FeatureCheck 
                        label="Adv. Acct" 
                        enabled={plan.feature_advanced_accounting ?? defaults.features.advanced_accounting} 
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleEdit(plan)} 
                    className="w-full"
                    variant="secondary"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Plan
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                Edit {editingPlan?.plan_key?.charAt(0).toUpperCase()}{editingPlan?.plan_key?.slice(1)} Plan
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Customize this plan's configuration. Leave fields empty to use defaults.
              </DialogDescription>
            </DialogHeader>

            {editingPlan && (
              <div className="grid gap-4 sm:gap-6 py-2 sm:py-4">
                {/* Basic Info */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Plan Name</Label>
                      <Input
                        className="text-sm"
                        value={formData.label || ""}
                        onChange={(e) => setFormData({ ...formData, label: e.target.value || null })}
                        placeholder={BILLING_PLANS[editingPlan.plan_key].label}
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Tagline</Label>
                      <Input
                        className="text-sm"
                        value={formData.tagline || ""}
                        onChange={(e) => setFormData({ ...formData, tagline: e.target.value || null })}
                        placeholder={BILLING_PLANS[editingPlan.plan_key].tagline}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Description</Label>
                    <Textarea
                      className="text-sm"
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                      placeholder={BILLING_PLANS[editingPlan.plan_key].description}
                      rows={2}
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    Pricing
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Monthly Price (K)</Label>
                      <Input
                        className="text-sm"
                        type="number"
                        value={formData.monthly_price ?? ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          monthly_price: e.target.value ? Number(e.target.value) : null 
                        })}
                        placeholder={String(BILLING_PLANS[editingPlan.plan_key].monthlyPrice)}
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Annual Price (K)</Label>
                      <Input
                        className="text-sm"
                        type="number"
                        value={formData.annual_price ?? ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          annual_price: e.target.value ? Number(e.target.value) : null 
                        })}
                        placeholder={String(BILLING_PLANS[editingPlan.plan_key].annualPrice)}
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Trial Days</Label>
                      <Input
                        className="text-sm"
                        type="number"
                        value={formData.trial_days ?? ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          trial_days: e.target.value ? Number(e.target.value) : null 
                        })}
                        placeholder={String(BILLING_PLANS[editingPlan.plan_key].trialDays)}
                      />
                    </div>
                  </div>
                </div>

                {/* Limits */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    Usage Limits
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Max Users (0 = unlimited)</Label>
                      <Input
                        className="text-sm"
                        type="number"
                        value={formData.max_users ?? ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          max_users: e.target.value ? Number(e.target.value) : null 
                        })}
                        placeholder={
                          BILLING_PLANS[editingPlan.plan_key].limits.users === Infinity 
                            ? "Unlimited" 
                            : String(BILLING_PLANS[editingPlan.plan_key].limits.users)
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Max Inventory Items (0 = unlimited)</Label>
                      <Input
                        className="text-sm"
                        type="number"
                        value={formData.max_inventory_items ?? ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          max_inventory_items: e.target.value ? Number(e.target.value) : null 
                        })}
                        placeholder={
                          BILLING_PLANS[editingPlan.plan_key].limits.inventoryItems === Infinity 
                            ? "Unlimited"
                            : String(BILLING_PLANS[editingPlan.plan_key].limits.inventoryItems)
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    Features Included
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FeatureToggle
                      label="Inventory Management"
                      checked={formData.feature_inventory ?? false}
                      onCheckedChange={(checked) => setFormData({ ...formData, feature_inventory: checked })}
                    />
                    <FeatureToggle
                      label="Payroll & HR"
                      checked={formData.feature_payroll ?? false}
                      onCheckedChange={(checked) => setFormData({ ...formData, feature_payroll: checked })}
                    />
                    <FeatureToggle
                      label="Agent Network"
                      checked={formData.feature_agents ?? false}
                      onCheckedChange={(checked) => setFormData({ ...formData, feature_agents: checked })}
                    />
                    <FeatureToggle
                      label="Impact Reporting"
                      checked={formData.feature_impact ?? false}
                      onCheckedChange={(checked) => setFormData({ ...formData, feature_impact: checked })}
                    />
                    <FeatureToggle
                      label="Website Management"
                      checked={formData.feature_website ?? false}
                      onCheckedChange={(checked) => setFormData({ ...formData, feature_website: checked })}
                    />
                    <FeatureToggle
                      label="WhatsApp Integration"
                      checked={formData.feature_whatsapp ?? false}
                      onCheckedChange={(checked) => setFormData({ ...formData, feature_whatsapp: checked })}
                    />
                    <FeatureToggle
                      label="Advanced Accounting"
                      checked={formData.feature_advanced_accounting ?? false}
                      onCheckedChange={(checked) => setFormData({ ...formData, feature_advanced_accounting: checked })}
                    />
                  </div>
                </div>

                {/* WhatsApp Usage Limits */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    WhatsApp Usage Limits
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Monthly Message Limit (0 = unlimited)</Label>
                      <Input
                        className="text-sm"
                        type="number"
                        value={formData.whatsapp_monthly_limit ?? ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          whatsapp_monthly_limit: e.target.value ? Number(e.target.value) : null 
                        })}
                        placeholder="100"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-5">
                      <FeatureToggle
                        label="Enforce Limit"
                        checked={formData.whatsapp_limit_enabled ?? true}
                        onCheckedChange={(checked) => setFormData({ ...formData, whatsapp_limit_enabled: checked })}
                      />
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    Display Options
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    <FeatureToggle
                      label="Mark as Popular"
                      checked={formData.is_popular ?? false}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
                    />
                    <FeatureToggle
                      label="Active (visible)"
                      checked={formData.is_active ?? true}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    Highlights (one per line)
                  </h4>
                  <Textarea
                    className="text-sm"
                    value={(formData.highlights || []).join("\n")}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      highlights: e.target.value ? e.target.value.split("\n").filter(Boolean) : null 
                    })}
                    placeholder={BILLING_PLANS[editingPlan.plan_key].highlights.join("\n")}
                    rows={4}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleResetToDefault}
                disabled={updatePlanMutation.isPending}
              >
                Reset to Defaults
              </Button>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:ml-auto w-full sm:w-auto">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setEditingPlan(null)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={updatePlanMutation.isPending}
                >
                  {updatePlanMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function FeatureCheck({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {enabled ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <X className="h-3 w-3 text-red-400" />
      )}
      <span className={enabled ? "" : "opacity-50"}>{label}</span>
    </div>
  );
}

function FeatureToggle({ 
  label, 
  checked, 
  onCheckedChange 
}: { 
  label: string; 
  checked: boolean; 
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
