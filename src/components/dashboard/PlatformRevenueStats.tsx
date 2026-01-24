import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, CreditCard, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { BillingPlan, BillingStatus } from "@/lib/billing-plans";

interface TenantBillingInfo {
  tenant_id: string;
  tenant_name: string;
  billing_plan: BillingPlan;
  billing_status: BillingStatus;
}

export function PlatformRevenueStats() {
  const { plans, loading: plansLoading } = useBillingPlans();

  const { data: billingData, isLoading } = useQuery({
    queryKey: ["platform-revenue-stats"],
    queryFn: async () => {
      // Get all tenants with their billing info
      const { data: tenants, error: tenantsError } = await supabase
        .from("tenants")
        .select("id, name, status");

      if (tenantsError) throw tenantsError;

      // Get billing info from business_profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("business_profiles")
        .select("tenant_id, billing_plan, billing_status");

      if (profilesError) throw profilesError;

      // Map profiles by tenant_id
      const profileMap = new Map(
        profiles?.map((p) => [p.tenant_id, p]) || []
      );

      // Combine data
      const tenantBilling: TenantBillingInfo[] = (tenants || []).map((t) => {
        const profile = profileMap.get(t.id);
        return {
          tenant_id: t.id,
          tenant_name: t.name,
          billing_plan: (profile?.billing_plan as BillingPlan) || "starter",
          billing_status: (profile?.billing_status as BillingStatus) || "trial",
        };
      });

      return tenantBilling;
    },
  });

  if (isLoading || plansLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const tenants = billingData || [];

  // Calculate MRR
  const calculateMRR = () => {
    let mrr = 0;
    tenants.forEach((t) => {
      if (t.billing_status === "active") {
        const planConfig = plans[t.billing_plan];
        if (planConfig) {
          mrr += planConfig.monthlyPrice;
        }
      }
    });
    return mrr;
  };

  // Count by status
  const activeCount = tenants.filter((t) => t.billing_status === "active").length;
  const trialCount = tenants.filter((t) => t.billing_status === "trial").length;
  const suspendedCount = tenants.filter((t) => t.billing_status === "suspended").length;
  const inactiveCount = tenants.filter((t) => t.billing_status === "inactive").length;

  // Count by plan
  const planBreakdown = {
    starter: tenants.filter((t) => t.billing_plan === "starter" && t.billing_status === "active").length,
    growth: tenants.filter((t) => t.billing_plan === "growth" && t.billing_status === "active").length,
    enterprise: tenants.filter((t) => t.billing_plan === "enterprise" && t.billing_status === "active").length,
  };

  const mrr = calculateMRR();
  const formattedMRR = new Intl.NumberFormat("en-ZM", {
    style: "currency",
    currency: "ZMW",
    minimumFractionDigits: 0,
  }).format(mrr);

  return (
    <div className="space-y-6">
      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formattedMRR}</div>
            <p className="text-xs text-muted-foreground">
              From {activeCount} paying tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((activeCount / tenants.length) * 100) || 0}% of all tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Accounts</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trialCount}</div>
            <p className="text-xs text-muted-foreground">
              Potential conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {suspendedCount + inactiveCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {suspendedCount} suspended, {inactiveCount} inactive
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Plan</CardTitle>
          <CardDescription>Active subscriptions breakdown by billing tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(["starter", "growth", "enterprise"] as BillingPlan[]).map((plan) => {
              const count = planBreakdown[plan];
              const planConfig = plans[plan];
              const revenue = count * (planConfig?.monthlyPrice || 0);
              const formattedRevenue = new Intl.NumberFormat("en-ZM", {
                style: "currency",
                currency: "ZMW",
                minimumFractionDigits: 0,
              }).format(revenue);

              return (
                <div
                  key={plan}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        plan === "starter"
                          ? "bg-blue-500"
                          : plan === "growth"
                          ? "bg-purple-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <div>
                      <p className="font-medium capitalize">{planConfig?.label || plan}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Intl.NumberFormat("en-ZM", {
                          style: "currency",
                          currency: "ZMW",
                          minimumFractionDigits: 0,
                        }).format(planConfig?.monthlyPrice || 0)}/month
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formattedRevenue}</p>
                    <p className="text-sm text-muted-foreground">{count} tenants</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
