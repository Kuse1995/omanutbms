import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Copy, RefreshCw, Globe, Zap, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";

const CALLBACK_EVENT_OPTIONS = [
  { key: "low_stock", label: "Low Stock Alert", description: "When stock drops below reorder level" },
  { key: "out_of_stock", label: "Out of Stock", description: "When a product hits zero stock" },
  { key: "new_order", label: "New Order", description: "When a new order is created" },
  { key: "payment_confirmed", label: "Payment Confirmed", description: "When a payment is confirmed" },
  { key: "invoice_overdue", label: "Invoice Overdue", description: "When an invoice passes its due date" },
  { key: "daily_summary", label: "Daily Summary", description: "End-of-day business summary" },
  { key: "large_sale", label: "Large Sale", description: "When a sale exceeds threshold" },
  { key: "new_contact", label: "New Contact", description: "When a new customer/contact is created" },
];

export function BmsIntegrationSettings() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [enabledEvents, setEnabledEvents] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (tenant?.id) fetchConfig();
  }, [tenant?.id]);

  const fetchConfig = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bms_integration_configs" as any)
      .select("*")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (data) {
      setConfig(data);
      setIsEnabled((data as any).is_enabled || false);
      setCallbackUrl((data as any).callback_url || "");
      setEnabledEvents(Array.isArray((data as any).callback_events) ? (data as any).callback_events : []);
    }
    setLoading(false);
  };

  const createConfig = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("bms_integration_configs" as any)
      .insert({ tenant_id: tenant.id } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to create integration config.", variant: "destructive" });
    } else {
      setConfig(data);
      setIsEnabled(false);
      setCallbackUrl("");
      setEnabledEvents((data as any)?.callback_events || []);
      toast({ title: "Integration Created", description: "BMS integration config created. Configure your settings below." });
    }
    setSaving(false);
  };

  const saveConfig = async () => {
    if (!config?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("bms_integration_configs" as any)
      .update({
        is_enabled: isEnabled,
        callback_url: callbackUrl || null,
        callback_events: enabledEvents,
      } as any)
      .eq("id", config.id);

    if (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "BMS integration settings updated." });
    }
    setSaving(false);
  };

  const regenerateSecret = async () => {
    if (!config?.id) return;
    const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    const { error } = await supabase
      .from("bms_integration_configs" as any)
      .update({ api_secret: newSecret } as any)
      .eq("id", config.id);

    if (error) {
      toast({ title: "Error", description: "Failed to regenerate secret.", variant: "destructive" });
    } else {
      setConfig({ ...config, api_secret: newSecret });
      toast({ title: "Secret Regenerated", description: "Your API secret has been regenerated. Update it in the Omanut platform." });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  const toggleEvent = (eventKey: string) => {
    setEnabledEvents(prev =>
      prev.includes(eventKey) ? prev.filter(e => e !== eventKey) : [...prev, eventKey]
    );
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/bms-api-bridge`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config?.api_secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "health_check", tenant_id: tenant?.id }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast({ title: "✅ Connection Successful", description: `API bridge is healthy. Version: ${data.data?.version}` });
      } else {
        toast({ title: "❌ Connection Failed", description: data.error || "Unknown error", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "❌ Connection Failed", description: "Could not reach the API bridge.", variant: "destructive" });
    }
    setTesting(false);
  };

  const bridgeUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/bms-api-bridge`;

  if (loading) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading integration settings...</CardContent></Card>;
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            BMS Integration (Omanut)
          </CardTitle>
          <CardDescription>
            Connect your BMS to the Omanut AI platform for WhatsApp-powered business operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={createConfig} disabled={saving}>
            <Zap className="h-4 w-4 mr-2" />
            {saving ? "Setting up..." : "Enable BMS Integration"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                BMS Integration (Omanut)
              </CardTitle>
              <CardDescription>External API access for the Omanut AI platform</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{isEnabled ? "Active" : "Disabled"}</span>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bridge URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bridge URL</label>
            <div className="flex gap-2">
              <Input value={bridgeUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(bridgeUrl, "Bridge URL")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Use this URL in the Omanut platform BMS settings.</p>
          </div>

          {/* API Secret */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              API Secret
            </label>
            <div className="flex gap-2">
              <Input
                type={showSecret ? "text" : "password"}
                value={config.api_secret || ""}
                readOnly
                className="font-mono text-xs"
              />
              <Button variant="outline" size="icon" onClick={() => setShowSecret(!showSecret)}>
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(config.api_secret, "API Secret")}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={regenerateSecret}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Share this secret with the Omanut platform. Use as Bearer token.</p>
          </div>

          {/* Tenant ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tenant ID</label>
            <div className="flex gap-2">
              <Input value={tenant?.id || ""} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(tenant?.id || "", "Tenant ID")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Test Connection */}
          <Button onClick={testConnection} disabled={testing} variant="outline" className="gap-2">
            {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            Test Connection
          </Button>
        </CardContent>
      </Card>

      {/* Callback Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outbound Callbacks (BMS → Omanut)</CardTitle>
          <CardDescription>Configure proactive notifications sent to the Omanut platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Callback URL</label>
            <Input
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              placeholder="https://your-omanut-instance.supabase.co/functions/v1/bms-callback"
            />
            <p className="text-xs text-muted-foreground">The URL where the BMS will POST event notifications.</p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Enabled Events</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {CALLBACK_EVENT_OPTIONS.map((evt) => (
                <div key={evt.key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{evt.label}</div>
                    <div className="text-xs text-muted-foreground">{evt.description}</div>
                  </div>
                  <Switch
                    checked={enabledEvents.includes(evt.key)}
                    onCheckedChange={() => toggleEvent(evt.key)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
            {config.last_callback_at && (
              <span className="text-xs text-muted-foreground">
                Last callback: {new Date(config.last_callback_at).toLocaleString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 p-3 rounded-lg border">
              {isEnabled ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
              <div>
                <div className="text-sm font-medium">API Access</div>
                <div className="text-xs text-muted-foreground">{isEnabled ? "Enabled" : "Disabled"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border">
              {config.last_api_call_at ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
              <div>
                <div className="text-sm font-medium">Last API Call</div>
                <div className="text-xs text-muted-foreground">
                  {config.last_api_call_at ? new Date(config.last_api_call_at).toLocaleString() : "Never"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border">
              {callbackUrl ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
              <div>
                <div className="text-sm font-medium">Callbacks</div>
                <div className="text-xs text-muted-foreground">{callbackUrl ? `${enabledEvents.length} events` : "Not configured"}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
