import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Users, ArrowRightLeft, Loader2 } from "lucide-react";

interface OperationsOfficer {
  user_id: string;
  full_name: string;
}

interface HandoffConfig {
  enabled: boolean;
  handoffStep: number;
  assignedUserId: string | null;
  notes: string;
}

interface HandoffConfigPanelProps {
  config: HandoffConfig;
  onChange: (config: HandoffConfig) => void;
  disabled?: boolean;
}

const STEP_OPTIONS = [
  { value: 0, label: "After Client Info", description: "Ops handles everything from Work Details" },
  { value: 1, label: "After Work Details", description: "Ops captures design requirements" },
  { value: 2, label: "After Design Details", description: "Most common - Ops takes measurements" },
  { value: 3, label: "After Measurements", description: "Ops handles sketches only" },
  { value: 4, label: "After Sketches", description: "Ops finalizes pricing (rare)" },
];

export function HandoffConfigPanel({ config, onChange, disabled }: HandoffConfigPanelProps) {
  const { tenantId } = useTenant();
  const [isOpen, setIsOpen] = useState(config.enabled);
  const [officers, setOfficers] = useState<OperationsOfficer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (config.enabled && tenantId) {
      fetchOperationsOfficers();
    }
  }, [config.enabled, tenantId]);

  const fetchOperationsOfficers = async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("tenant_users")
        .select(`
          user_id,
          profiles(full_name)
        `)
        .eq("tenant_id", tenantId)
        .eq("role", "operations_manager");

      if (error) throw error;

      const mapped = (data || [])
        .map((tu: any) => ({
          user_id: tu.user_id,
          full_name: tu.profiles?.full_name || "Unknown Officer",
        }))
        .filter((o: OperationsOfficer) => o.full_name);

      setOfficers(mapped);
    } catch (err) {
      console.error("Failed to fetch operations officers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnabledChange = (enabled: boolean) => {
    onChange({ ...config, enabled });
    setIsOpen(enabled);
    if (enabled && officers.length === 0) {
      fetchOperationsOfficers();
    }
  };

  const selectedStep = STEP_OPTIONS.find((s) => s.value === config.handoffStep);
  const selectedOfficer = officers.find((o) => o.user_id === config.assignedUserId);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-muted/30">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Operations Handoff</p>
                <p className="text-xs text-muted-foreground">
                  {config.enabled
                    ? selectedOfficer
                      ? `Assign to ${selectedOfficer.full_name} after Step ${config.handoffStep + 1}`
                      : "Configure handoff to Operations"
                    : "Enable to delegate steps to Operations Officer"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {config.enabled && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                  Active
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="handoff-toggle" className="text-sm font-medium">
                  Enable Handoff
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow an Operations Officer to continue this order
                </p>
              </div>
              <Switch
                id="handoff-toggle"
                checked={config.enabled}
                onCheckedChange={handleEnabledChange}
                disabled={disabled}
              />
            </div>

            {config.enabled && (
              <>
                {/* Handoff Step Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Hand off after step</Label>
                  <Select
                    value={config.handoffStep.toString()}
                    onValueChange={(v) => onChange({ ...config, handoffStep: parseInt(v) })}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select handoff point" />
                    </SelectTrigger>
                    <SelectContent>
                      {STEP_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-xs text-muted-foreground">{opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assign Operations Officer */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Assign to Operations Officer
                  </Label>
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading officers...
                    </div>
                  ) : officers.length === 0 ? (
                    <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                      No Operations Officers found. Add users with the "Operations Manager" role to enable handoffs.
                    </div>
                  ) : (
                    <Select
                      value={config.assignedUserId || ""}
                      onValueChange={(v) => onChange({ ...config, assignedUserId: v || null })}
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an officer" />
                      </SelectTrigger>
                      <SelectContent>
                        {officers.map((officer) => (
                          <SelectItem key={officer.user_id} value={officer.user_id}>
                            {officer.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Handoff Notes */}
                <div className="space-y-2">
                  <Label htmlFor="handoff-notes" className="text-sm font-medium">
                    Notes for Operations
                  </Label>
                  <Textarea
                    id="handoff-notes"
                    value={config.notes}
                    onChange={(e) => onChange({ ...config, notes: e.target.value })}
                    placeholder="Add any instructions or context for the Operations Officer..."
                    rows={3}
                    disabled={disabled}
                    className="resize-none"
                  />
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded-lg space-y-1">
                  <p className="font-medium">How Handoff Works:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                    <li>Complete steps 1-{config.handoffStep + 1}, then save the order</li>
                    <li>The assigned officer will see this in their "My Assignments"</li>
                    <li>They'll complete steps {config.handoffStep + 2}-7 and hand back to you</li>
                    <li>You'll do the final review and sign-off</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export type { HandoffConfig };
