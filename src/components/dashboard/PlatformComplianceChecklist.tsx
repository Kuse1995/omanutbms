import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, ShieldCheck, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ComplianceItem {
  id: string;
  label: string;
  description: string;
  isComplete: boolean;
  priority: "critical" | "important" | "optional";
}

export function PlatformComplianceChecklist() {
  const { data: config, isLoading } = useQuery({
    queryKey: ["platform-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const complianceItems: ComplianceItem[] = [
    {
      id: "legal_name",
      label: "Legal Company Name",
      description: "Your registered business name",
      isComplete: !!config?.legal_company_name,
      priority: "critical",
    },
    {
      id: "registration",
      label: "Company Registration Number",
      description: "PACRA or equivalent registration",
      isComplete: !!config?.registration_number,
      priority: "critical",
    },
    {
      id: "tpin",
      label: "TPIN Number",
      description: "ZRA Tax Payer Identification Number",
      isComplete: !!config?.tpin_number,
      priority: "critical",
    },
    {
      id: "address",
      label: "Physical Address",
      description: "Registered business address",
      isComplete: !!config?.physical_address,
      priority: "important",
    },
    {
      id: "support_email",
      label: "Support Email",
      description: "Email for customer support",
      isComplete: !!config?.support_email,
      priority: "important",
    },
    {
      id: "billing_email",
      label: "Billing Email",
      description: "Email for billing inquiries",
      isComplete: !!config?.billing_email,
      priority: "important",
    },
    {
      id: "support_phone",
      label: "Support Phone",
      description: "Phone number for support",
      isComplete: !!config?.support_phone,
      priority: "important",
    },
    {
      id: "bank_details",
      label: "Bank Details",
      description: "Account for receiving payments",
      isComplete: !!(config?.bank_name && config?.bank_account_number),
      priority: "critical",
    },
    {
      id: "terms",
      label: "Terms of Service",
      description: "Link to your terms of service",
      isComplete: !!config?.terms_of_service_url,
      priority: "important",
    },
    {
      id: "privacy",
      label: "Privacy Policy",
      description: "Link to your privacy policy",
      isComplete: !!config?.privacy_policy_url,
      priority: "important",
    },
    {
      id: "whatsapp",
      label: "WhatsApp Support",
      description: "WhatsApp number for support",
      isComplete: !!config?.support_whatsapp,
      priority: "optional",
    },
    {
      id: "dpa",
      label: "Data Processing Agreement",
      description: "DPA for enterprise clients",
      isComplete: !!config?.data_processing_agreement_url,
      priority: "optional",
    },
  ];

  const completedCount = complianceItems.filter((item) => item.isComplete).length;
  const totalCount = complianceItems.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  const criticalItems = complianceItems.filter((item) => item.priority === "critical");
  const criticalComplete = criticalItems.filter((item) => item.isComplete).length;
  const allCriticalComplete = criticalComplete === criticalItems.length;

  const getPriorityBadge = (priority: ComplianceItem["priority"]) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "important":
        return <Badge variant="default">Important</Badge>;
      case "optional":
        return <Badge variant="secondary">Optional</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Platform Compliance
            </CardTitle>
            <CardDescription>
              Complete these items to ensure your platform is fully compliant
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{completionPercentage}%</div>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} complete
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={completionPercentage} className="h-2" />
          {!allCriticalComplete && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>
                {criticalItems.length - criticalComplete} critical items still need attention
              </span>
            </div>
          )}
          {allCriticalComplete && completionPercentage < 100 && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>All critical items complete. Consider completing the remaining items.</span>
            </div>
          )}
          {completionPercentage === 100 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>All compliance items complete!</span>
            </div>
          )}
        </div>

        {/* Compliance Items */}
        <div className="space-y-3">
          {complianceItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                item.isComplete
                  ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                  : item.priority === "critical"
                  ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-3">
                {item.isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle
                    className={`h-5 w-5 ${
                      item.priority === "critical" ? "text-red-500" : "text-muted-foreground"
                    }`}
                  />
                )}
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              {getPriorityBadge(item.priority)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
