import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, Phone, Mail, Globe, Landmark, FileText, Save, Loader2 } from "lucide-react";

interface PlatformConfig {
  id: string;
  platform_name: string;
  legal_company_name: string | null;
  registration_number: string | null;
  tpin_number: string | null;
  support_email: string | null;
  billing_email: string | null;
  support_phone: string | null;
  support_whatsapp: string | null;
  physical_address: string | null;
  terms_of_service_url: string | null;
  privacy_policy_url: string | null;
  data_processing_agreement_url: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  bank_swift_code: string | null;
}

export function PlatformConfigManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<PlatformConfig>>({});

  const { data: config, isLoading } = useQuery({
    queryKey: ["platform-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("*")
        .single();

      if (error) throw error;
      return data as PlatformConfig;
    },
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<PlatformConfig>) => {
      if (!config?.id) throw new Error("No config found");
      
      const { error } = await supabase
        .from("platform_config")
        .update(data)
        .eq("id", config.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-config"] });
      toast({
        title: "Settings Saved",
        description: "Platform configuration has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof PlatformConfig, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Service Provider Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Service Provider Identity
          </CardTitle>
          <CardDescription>
            Your company details as the BMS service provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="platform_name">Platform Name</Label>
              <Input
                id="platform_name"
                value={formData.platform_name || ""}
                onChange={(e) => handleInputChange("platform_name", e.target.value)}
                placeholder="e.g. Omanut BMS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_company_name">Legal Company Name</Label>
              <Input
                id="legal_company_name"
                value={formData.legal_company_name || ""}
                onChange={(e) => handleInputChange("legal_company_name", e.target.value)}
                placeholder="e.g. Omanut Technologies Ltd"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration_number">Company Registration Number</Label>
              <Input
                id="registration_number"
                value={formData.registration_number || ""}
                onChange={(e) => handleInputChange("registration_number", e.target.value)}
                placeholder="e.g. PACRA registration"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpin_number">TPIN Number</Label>
              <Input
                id="tpin_number"
                value={formData.tpin_number || ""}
                onChange={(e) => handleInputChange("tpin_number", e.target.value)}
                placeholder="ZRA TPIN"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="physical_address">Physical Address</Label>
            <Textarea
              id="physical_address"
              value={formData.physical_address || ""}
              onChange={(e) => handleInputChange("physical_address", e.target.value)}
              placeholder="Enter your registered business address"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Contact Information
          </CardTitle>
          <CardDescription>
            How tenants and customers can reach you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="support_email">Support Email</Label>
              <Input
                id="support_email"
                type="email"
                value={formData.support_email || ""}
                onChange={(e) => handleInputChange("support_email", e.target.value)}
                placeholder="support@yourcompany.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_email">Billing Email</Label>
              <Input
                id="billing_email"
                type="email"
                value={formData.billing_email || ""}
                onChange={(e) => handleInputChange("billing_email", e.target.value)}
                placeholder="billing@yourcompany.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support_phone">Support Phone</Label>
              <Input
                id="support_phone"
                value={formData.support_phone || ""}
                onChange={(e) => handleInputChange("support_phone", e.target.value)}
                placeholder="+260 XXX XXX XXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support_whatsapp">WhatsApp Support</Label>
              <Input
                id="support_whatsapp"
                value={formData.support_whatsapp || ""}
                onChange={(e) => handleInputChange("support_whatsapp", e.target.value)}
                placeholder="+260 XXX XXX XXX"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details for Collections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Bank Details (For Tenant Payments)
          </CardTitle>
          <CardDescription>
            Your banking information for receiving subscription payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={formData.bank_name || ""}
                onChange={(e) => handleInputChange("bank_name", e.target.value)}
                placeholder="e.g. Zanaco, FNB, Stanbic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account_name">Account Name</Label>
              <Input
                id="bank_account_name"
                value={formData.bank_account_name || ""}
                onChange={(e) => handleInputChange("bank_account_name", e.target.value)}
                placeholder="Business account name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account_number">Account Number</Label>
              <Input
                id="bank_account_number"
                value={formData.bank_account_number || ""}
                onChange={(e) => handleInputChange("bank_account_number", e.target.value)}
                placeholder="Account number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_branch">Branch</Label>
              <Input
                id="bank_branch"
                value={formData.bank_branch || ""}
                onChange={(e) => handleInputChange("bank_branch", e.target.value)}
                placeholder="Branch name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_swift_code">SWIFT Code (Optional)</Label>
              <Input
                id="bank_swift_code"
                value={formData.bank_swift_code || ""}
                onChange={(e) => handleInputChange("bank_swift_code", e.target.value)}
                placeholder="For international payments"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal & Compliance URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Legal & Compliance
          </CardTitle>
          <CardDescription>
            Links to your legal documents and policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="terms_of_service_url">Terms of Service URL</Label>
              <Input
                id="terms_of_service_url"
                type="url"
                value={formData.terms_of_service_url || ""}
                onChange={(e) => handleInputChange("terms_of_service_url", e.target.value)}
                placeholder="https://yourcompany.com/terms"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacy_policy_url">Privacy Policy URL</Label>
              <Input
                id="privacy_policy_url"
                type="url"
                value={formData.privacy_policy_url || ""}
                onChange={(e) => handleInputChange("privacy_policy_url", e.target.value)}
                placeholder="https://yourcompany.com/privacy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_processing_agreement_url">Data Processing Agreement URL (Optional)</Label>
              <Input
                id="data_processing_agreement_url"
                type="url"
                value={formData.data_processing_agreement_url || ""}
                onChange={(e) => handleInputChange("data_processing_agreement_url", e.target.value)}
                placeholder="https://yourcompany.com/dpa"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          size="lg"
          className="gap-2"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Platform Settings
        </Button>
      </div>
    </div>
  );
}
