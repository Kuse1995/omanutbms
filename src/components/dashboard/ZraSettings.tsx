import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle, XCircle, Zap, ShieldCheck, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export function ZraSettings() {
  const { businessProfile, tenantId, refetchTenant } = useTenant();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [healthData, setHealthData] = useState<any>(null);

  const [enabled, setEnabled] = useState(false);
  const [companyTin, setCompanyTin] = useState('');
  const [companyNames, setCompanyNames] = useState('');
  const [securityKey, setSecurityKey] = useState('');
  const [vsdcUrl, setVsdcUrl] = useState('');
  const [urlMode, setUrlMode] = useState<'standard' | 'sandbox' | 'custom'>('standard');
  const [vsdcIp, setVsdcIp] = useState('');
  const [vsdcPort, setVsdcPort] = useState('8080');

  useEffect(() => {
    if (businessProfile) {
      setEnabled((businessProfile as any).zra_vsdc_enabled ?? false);
      setCompanyTin((businessProfile as any).zra_company_tin ?? '');
      setCompanyNames((businessProfile as any).zra_company_names ?? '');
      setSecurityKey((businessProfile as any).zra_security_key ?? '');
      const savedUrl = (businessProfile as any).zra_vsdc_url ?? '';
      setVsdcUrl(savedUrl);
      // Parse saved URL to determine mode
      if (!savedUrl) {
        setUrlMode('standard');
      } else if (savedUrl.includes('localhost')) {
        setUrlMode('sandbox');
      } else {
        // Try to extract IP and port from saved URL
        const match = savedUrl.match(/^https?:\/\/([^:/]+)(?::(\d+))?/);
        if (match) {
          setVsdcIp(match[1]);
          setVsdcPort(match[2] || '8080');
          setUrlMode('standard');
        } else {
          setUrlMode('custom');
        }
      }
    }
  }, [businessProfile]);

  const getConstructedUrl = () => {
    if (urlMode === 'sandbox') return 'http://localhost:8080';
    if (urlMode === 'custom') return vsdcUrl;
    if (!vsdcIp) return '';
    return `http://${vsdcIp}:${vsdcPort}`;
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const finalUrl = getConstructedUrl();
      const { error } = await supabase
        .from('business_profiles')
        .update({
          zra_vsdc_enabled: enabled,
          zra_company_tin: companyTin || null,
          zra_company_names: companyNames || null,
          zra_security_key: securityKey || null,
          zra_vsdc_url: finalUrl || null,
        } as any)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      await refetchTenant();
      toast({ title: "ZRA Settings Saved", description: "Your ZRA VSDC configuration has been updated." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!tenantId) return;
    setTesting(true);
    setHealthStatus('unknown');
    try {
      const { data, error } = await supabase.functions.invoke('zra-smart-invoice', {
        body: { action: 'health_check', tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.success) {
        setHealthStatus('connected');
        setHealthData(data.data);
        toast({ title: "Connected!", description: "ZRA VSDC connection is healthy." });
      } else {
        setHealthStatus('failed');
        toast({ title: "Connection Failed", description: data?.error || "Could not connect to ZRA VSDC.", variant: "destructive" });
      }
    } catch (error: any) {
      setHealthStatus('failed');
      toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            ZRA Smart Invoice (VSDC)
          </CardTitle>
          <CardDescription>
            Connect to the Zambia Revenue Authority's Virtual Sales Data Controller for automatic electronic invoicing and tax compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable ZRA VSDC</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, all sales and invoices will be automatically reported to ZRA.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="zra-tin">Company TIN</Label>
                  <Input
                    id="zra-tin"
                    placeholder="e.g. 1234567890"
                    value={companyTin}
                    onChange={(e) => setCompanyTin(e.target.value)}
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">10-digit Taxpayer Identification Number</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zra-names">Company Names (as registered with ZRA)</Label>
                  <Input
                    id="zra-names"
                    placeholder="Exact name on ZRA registration"
                    value={companyNames}
                    onChange={(e) => setCompanyNames(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zra-key">VSDC Security Key</Label>
                  <Input
                    id="zra-key"
                    type="password"
                    placeholder="Your VSDC security key"
                    value={securityKey}
                    onChange={(e) => setSecurityKey(e.target.value)}
                  />
                </div>
                <div className="space-y-3 sm:col-span-2">
                  <Label>VSDC Connection</Label>
                  <RadioGroup value={urlMode} onValueChange={(v) => setUrlMode(v as any)} className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="standard" id="url-standard" />
                      <Label htmlFor="url-standard" className="font-normal cursor-pointer">Standard VSDC (enter IP)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sandbox" id="url-sandbox" />
                      <Label htmlFor="url-sandbox" className="font-normal cursor-pointer">Sandbox / Testing</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="url-custom" />
                      <Label htmlFor="url-custom" className="font-normal cursor-pointer">Custom URL</Label>
                    </div>
                  </RadioGroup>

                  {urlMode === 'standard' && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="zra-ip">VSDC IP Address</Label>
                        <Input
                          id="zra-ip"
                          placeholder="e.g. 192.168.1.100"
                          value={vsdcIp}
                          onChange={(e) => setVsdcIp(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">From your ZRA VSDC registration certificate</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="zra-port">Port</Label>
                        <Input
                          id="zra-port"
                          placeholder="8080"
                          value={vsdcPort}
                          onChange={(e) => setVsdcPort(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Usually 8080 (default)</p>
                      </div>
                    </div>
                  )}

                  {urlMode === 'custom' && (
                    <div className="space-y-1">
                      <Label htmlFor="zra-url">Full VSDC URL</Label>
                      <Input
                        id="zra-url"
                        placeholder="http://your-vsdc-server:port"
                        value={vsdcUrl}
                        onChange={(e) => setVsdcUrl(e.target.value)}
                      />
                    </div>
                  )}

                  {urlMode === 'sandbox' && (
                    <p className="text-xs text-muted-foreground">Will connect to <code className="bg-muted px-1 rounded">http://localhost:8080</code> for testing.</p>
                  )}

                  {getConstructedUrl() && (
                    <p className="text-xs text-muted-foreground">
                      Server URL: <code className="bg-muted px-1 rounded">{getConstructedUrl()}</code>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleTestConnection} variant="outline" disabled={testing || !companyTin || !securityKey || !getConstructedUrl()}>
                  {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Test Connection
                </Button>

                {healthStatus === 'connected' && (
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                    <CheckCircle className="h-3 w-3 mr-1" /> Connected
                    {healthData?.SDC_ID && ` (SDC: ${healthData.SDC_ID})`}
                  </Badge>
                )}
                {healthStatus === 'failed' && (
                  <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                    <XCircle className="h-3 w-3 mr-1" /> Connection Failed
                  </Badge>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save ZRA Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                Every sale recorded in the POS is automatically sent to ZRA VSDC.
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                ZRA returns a fiscal signature, receipt number, and QR code.
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                This data is printed on all receipts and invoices for compliance.
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">4.</span>
                Failed submissions are logged and can be retried from the ZRA Log.
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
