import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/hooks/useTenant";
import { useBranding } from "@/hooks/useBranding";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, ExternalLink, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VENDOR_BRANDING } from "@/lib/branding-config";

export function WhiteLabelSettings() {
  const { businessProfile, tenantId, refetchTenant } = useTenant();
  const { isWhiteLabel, showPoweredBy, vendorName } = useBranding();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(isWhiteLabel);

  const handleToggle = async (newValue: boolean) => {
    if (!tenantId) return;

    setEnabled(newValue);
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({ white_label_enabled: newValue })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await refetchTenant();
      toast({
        title: newValue ? "White-label enabled" : "White-label disabled",
        description: newValue 
          ? "All vendor branding has been removed." 
          : `"Powered by ${vendorName}" footer will now be displayed.`,
      });
    } catch (error) {
      console.error('Toggle error:', error);
      setEnabled(!newValue); // Revert on error
      toast({
        title: "Update failed",
        description: "Failed to update white-label setting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>White-Label Mode</CardTitle>
          <CardDescription>
            Control whether vendor branding is displayed in your system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="whitelabel-toggle" className="text-base font-medium">
                Enable White-Label
              </Label>
              <p className="text-sm text-muted-foreground">
                Remove all "{vendorName}" branding from the system
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <Switch
                id="whitelabel-toggle"
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={saving}
              />
            </div>
          </div>

          {/* Status Indicator */}
          <div className={`p-4 rounded-lg border ${enabled ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' : 'bg-muted/50 border-muted'}`}>
            <div className="flex items-center gap-3">
              {enabled ? (
                <>
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <EyeOff className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      White-label is active
                    </p>
                    <p className="text-sm text-green-600/80 dark:text-green-400/70">
                      Your system appears completely branded as your own
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 rounded-full bg-muted">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Standard branding
                    </p>
                    <p className="text-sm text-muted-foreground">
                      "Powered by {vendorName}" is shown in the footer
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What Changes */}
      <Card>
        <CardHeader>
          <CardTitle>What Changes?</CardTitle>
          <CardDescription>
            Here's what white-label mode affects across the entire platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Complete Platform Branding</p>
                <p className="text-sm text-muted-foreground">
                  Your brand colors are applied across the entire dashboard, sidebar, buttons, and UI elements
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Branded Login Page</p>
                <p className="text-sm text-muted-foreground">
                  Share your custom login URL (<code className="bg-muted px-1 rounded text-xs">/auth?tenant=your-slug</code>) with your team
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">Footer & Vendor Branding</p>
                <p className="text-sm text-muted-foreground">
                  The "Powered by {vendorName}" footer is {enabled ? 'hidden' : 'visible'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <div>
                <p className="font-medium">Reports & Documents</p>
                <p className="text-sm text-muted-foreground">
                  All generated invoices, receipts, and reports use your company branding exclusively
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <div>
                <p className="font-medium">AI-Generated Content</p>
                <p className="text-sm text-muted-foreground">
                  AI summaries and insights reference your company name only
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Footer Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-slate-800 text-center">
            {enabled ? (
              <p className="text-slate-400 text-sm italic">
                No footer branding (white-label active)
              </p>
            ) : (
              <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
                <span>Powered by</span>
                <a
                  href={VENDOR_BRANDING.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium hover:text-slate-300 transition-colors"
                >
                  {VENDOR_BRANDING.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          White-label mode is a cosmetic change only. All features and functionality remain identical regardless of this setting.
        </AlertDescription>
      </Alert>
    </div>
  );
}
