import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  Activity, TrendingUp, Users, Package, CreditCard, MessageSquare,
  ShoppingCart, FileText, Building2, RefreshCw, Calendar, AlertCircle, CheckCircle2, XCircle,
  UserCheck, Zap
} from "lucide-react";
import { format, subDays } from "date-fns";
import { BILLING_PLANS, BillingPlan } from "@/lib/billing-plans";
import { UserActivityTab } from "./UserActivityTab";
import { FeatureInsightsTab } from "./FeatureInsightsTab";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const featureLabels: Record<string, { label: string; icon: React.ComponentType<any>; category: string }> = {
  sales: { label: "Sales", icon: ShoppingCart, category: "Core" },
  inventory: { label: "Inventory", icon: Package, category: "Add-on" },
  invoices: { label: "Invoicing", icon: FileText, category: "Core" },
  receipts: { label: "Receipts", icon: CreditCard, category: "Core" },
  payroll: { label: "HR & Payroll", icon: Users, category: "Add-on" },
  agents: { label: "Agents", icon: Building2, category: "Add-on" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, category: "Add-on" },
  accounting: { label: "Accounting", icon: TrendingUp, category: "Core" },
  website: { label: "Website CMS", icon: Activity, category: "Add-on" },
};

interface InferredFeatures {
  inventory: boolean;
  payroll: boolean;
  agents: boolean;
  whatsapp: boolean;
  website: boolean;
  accounting: boolean;
}

interface TenantUsageData {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  has_business_profile: boolean;
  billing_plan: string | null;
  billing_status: string | null;
  sales_count: number;
  invoice_count: number;
  inventory_count: number;
  employee_count: number;
  agent_count: number;
  receipt_count: number;
  payroll_count: number;
  whatsapp_messages: number;
  whatsapp_limit: number;
  last_activity: string | null;
  features_enabled: string[];
  inferred_features: InferredFeatures;
}

interface FeatureUsageStats {
  feature_key: string;
  total_usage: number;
  unique_tenants: number;
  unique_users: number;
  trend: number;
}

// Get inventory limit from billing-plans.ts (single source of truth)
function getInventoryLimit(plan: string | null): number {
  if (!plan) return BILLING_PLANS.starter.limits.inventoryItems;
  const planConfig = BILLING_PLANS[plan as BillingPlan];
  if (!planConfig) return BILLING_PLANS.starter.limits.inventoryItems;
  const limit = planConfig.limits.inventoryItems;
  return limit === Infinity ? -1 : limit; // -1 represents unlimited for UI
}

// WhatsApp limits (not in billing-plans.ts, define here)
function getWhatsAppLimit(plan: string | null): number {
  const limits: Record<string, number> = {
    starter: 100,
    growth: 500,
    enterprise: 5000,
  };
  return limits[plan || "starter"] || 100;
}

export function UsageAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<string>("30");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all tenants with comprehensive usage data
  const { data: tenantUsageData, isLoading: tenantsLoading, refetch: refetchTenants } = useQuery({
    queryKey: ["tenant-usage-analytics", dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange)).toISOString();
      
      // FIXED: Fetch tenants and business_profiles separately to avoid RLS issues with nested queries
      const [tenantsRes, profilesRes] = await Promise.all([
        supabase.from("tenants").select("id, name, status"),
        supabase.from("business_profiles").select(`
          tenant_id,
          billing_plan,
          billing_status,
          inventory_enabled,
          payroll_enabled,
          agents_enabled,
          whatsapp_enabled,
          website_enabled,
          advanced_accounting_enabled,
          whatsapp_messages_used
        `)
      ]);

      const tenants = tenantsRes.data;
      if (!tenants) return [];

      // Build a map of tenant_id -> business_profile for efficient lookup
      const profilesByTenantId = new Map(
        profilesRes.data?.map(p => [p.tenant_id, p]) || []
      );

      // For each tenant, get comprehensive usage counts
      const usagePromises = tenants.map(async (tenant) => {
        // Get profile from our map instead of nested query
        const profile = profilesByTenantId.get(tenant.id);
        const hasBusinessProfile = !!profile;
        
        // Parallel queries for each metric - comprehensive coverage
        const [
          salesRes, 
          salesTransRes, 
          invoicesRes, 
          inventoryRes, 
          employeesRes, 
          agentsRes,
          receiptsRes,
          payrollRes,
          whatsappRes,
          lastSaleRes, 
          lastTransRes
        ] = await Promise.all([
          // Sales count (both tables, in period)
          supabase.from("sales").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id).gte("created_at", startDate),
          supabase.from("sales_transactions").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id).gte("created_at", startDate),
          // Invoices (in period)
          supabase.from("invoices").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id).gte("created_at", startDate),
          // Inventory (cumulative - no date filter)
          supabase.from("inventory").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id),
          // Employees (cumulative)
          supabase.from("employees").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id),
          // Agent transactions (in period)
          supabase.from("agent_transactions").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id).gte("created_at", startDate),
          // Receipts (in period)
          supabase.from("payment_receipts").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id).gte("created_at", startDate),
          // Payroll records (cumulative to detect usage)
          supabase.from("payroll_records").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id),
          // WhatsApp logs (cumulative)
          supabase.from("whatsapp_audit_logs").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id),
          // Last activity dates
          supabase.from("sales").select("created_at")
            .eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(1),
          supabase.from("sales_transactions").select("created_at")
            .eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(1),
        ]);

        // Build features_enabled from profile (if exists)
        const featuresEnabled: string[] = [];
        if (profile?.inventory_enabled) featuresEnabled.push("inventory");
        if (profile?.payroll_enabled) featuresEnabled.push("payroll");
        if (profile?.agents_enabled) featuresEnabled.push("agents");
        if (profile?.whatsapp_enabled) featuresEnabled.push("whatsapp");
        if (profile?.website_enabled) featuresEnabled.push("website");
        if (profile?.advanced_accounting_enabled) featuresEnabled.push("accounting");

        // INFERRED features from actual data (regardless of toggle settings)
        const inferred: InferredFeatures = {
          inventory: (inventoryRes.count || 0) > 0,
          payroll: (payrollRes.count || 0) > 0,
          agents: (agentsRes.count || 0) > 0,
          whatsapp: (whatsappRes.count || 0) > 0,
          website: false, // Can't infer website usage from data
          accounting: false, // Core feature, always available
        };

        // Combine sales counts from both tables
        const totalSalesCount = (salesRes.count || 0) + (salesTransRes.count || 0);
        
        // Get the most recent activity from either table
        const lastSaleDate = lastSaleRes.data?.[0]?.created_at;
        const lastTransDate = lastTransRes.data?.[0]?.created_at;
        const lastActivity = lastSaleDate && lastTransDate 
          ? (new Date(lastSaleDate) > new Date(lastTransDate) ? lastSaleDate : lastTransDate)
          : lastSaleDate || lastTransDate || null;

        return {
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          tenant_status: tenant.status,
          has_business_profile: hasBusinessProfile,
          billing_plan: profile?.billing_plan || null,
          billing_status: profile?.billing_status || null,
          sales_count: totalSalesCount,
          invoice_count: invoicesRes.count || 0,
          inventory_count: inventoryRes.count || 0,
          employee_count: employeesRes.count || 0,
          agent_count: agentsRes.count || 0,
          receipt_count: receiptsRes.count || 0,
          payroll_count: payrollRes.count || 0,
          whatsapp_messages: profile?.whatsapp_messages_used || 0,
          whatsapp_limit: getWhatsAppLimit(profile?.billing_plan),
          last_activity: lastActivity,
          features_enabled: featuresEnabled,
          inferred_features: inferred,
        } as TenantUsageData;
      });

      return Promise.all(usagePromises);
    },
  });

  // Fetch feature usage logs for trends
  const { data: featureUsageStats, isLoading: statsLoading } = useQuery({
    queryKey: ["feature-usage-stats", dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange)).toISOString();
      
      // Get actual database activity as proxy for feature usage
      const [
        salesStats, 
        salesTransStats, 
        invoiceStats, 
        inventoryStats, 
        payrollStats, 
        agentStats, 
        whatsappStats,
        receiptsStats
      ] = await Promise.all([
        supabase.from("sales").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
        supabase.from("sales_transactions").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
        supabase.from("invoices").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
        // For inventory, use the actual inventory table (cumulative items)
        supabase.from("inventory").select("tenant_id", { count: "exact" }),
        supabase.from("payroll_records").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
        supabase.from("agent_transactions").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
        supabase.from("whatsapp_audit_logs").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
        supabase.from("payment_receipts").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
      ]);

      // Combine sales from both tables
      const combinedSalesCount = (salesStats.count || 0) + (salesTransStats.count || 0);
      const combinedSalesTenants = new Set([
        ...(salesStats.data?.map(s => s.tenant_id) || []),
        ...(salesTransStats.data?.map(s => s.tenant_id) || []),
      ]);

      return [
        { feature_key: "sales", total_usage: combinedSalesCount, unique_tenants: combinedSalesTenants.size, unique_users: 0, trend: 0 },
        { feature_key: "invoices", total_usage: invoiceStats.count || 0, unique_tenants: new Set(invoiceStats.data?.map(s => s.tenant_id)).size, unique_users: 0, trend: 0 },
        { feature_key: "receipts", total_usage: receiptsStats.count || 0, unique_tenants: new Set(receiptsStats.data?.map(s => s.tenant_id)).size, unique_users: 0, trend: 0 },
        { feature_key: "inventory", total_usage: inventoryStats.count || 0, unique_tenants: new Set(inventoryStats.data?.map(s => s.tenant_id)).size, unique_users: 0, trend: 0 },
        { feature_key: "payroll", total_usage: payrollStats.count || 0, unique_tenants: new Set(payrollStats.data?.map(s => s.tenant_id)).size, unique_users: 0, trend: 0 },
        { feature_key: "agents", total_usage: agentStats.count || 0, unique_tenants: new Set(agentStats.data?.map(s => s.tenant_id)).size, unique_users: 0, trend: 0 },
        { feature_key: "whatsapp", total_usage: whatsappStats.count || 0, unique_tenants: new Set(whatsappStats.data?.map(s => s.tenant_id)).size, unique_users: 0, trend: 0 },
      ] as FeatureUsageStats[];
    },
  });

  // Aggregated stats with proper calculations
  const aggregatedStats = useMemo(() => {
    if (!tenantUsageData) return null;
    
    // All tenants vs active tenants
    const activeTenants = tenantUsageData.filter(t => t.tenant_status === "active");
    const tenantsWithProfiles = tenantUsageData.filter(t => t.has_business_profile);
    const tenantsWithoutProfiles = tenantUsageData.filter(t => !t.has_business_profile);
    
    const totalSales = tenantUsageData.reduce((sum, t) => sum + t.sales_count, 0);
    const totalInvoices = tenantUsageData.reduce((sum, t) => sum + t.invoice_count, 0);
    const totalInventory = tenantUsageData.reduce((sum, t) => sum + t.inventory_count, 0);
    const totalReceipts = tenantUsageData.reduce((sum, t) => sum + t.receipt_count, 0);
    const totalEmployees = tenantUsageData.reduce((sum, t) => sum + t.employee_count, 0);
    const totalAgentTransactions = tenantUsageData.reduce((sum, t) => sum + t.agent_count, 0);
    
    // Active tenants with activity in period
    const activeTenantsWithActivity = activeTenants.filter(t => 
      t.sales_count > 0 || t.invoice_count > 0 || t.receipt_count > 0
    ).length;
    
    // Feature adoption - calculate based on ACTIVE tenants only (proper denominator)
    const featureAdoption = {
      inventory: activeTenants.filter(t => t.features_enabled.includes("inventory")).length,
      payroll: activeTenants.filter(t => t.features_enabled.includes("payroll")).length,
      agents: activeTenants.filter(t => t.features_enabled.includes("agents")).length,
      whatsapp: activeTenants.filter(t => t.features_enabled.includes("whatsapp")).length,
      website: activeTenants.filter(t => t.features_enabled.includes("website")).length,
      accounting: activeTenants.filter(t => t.features_enabled.includes("accounting")).length,
    };

    // INFERRED feature usage (actual data exists, regardless of toggle)
    const inferredUsage = {
      inventory: tenantUsageData.filter(t => t.inferred_features.inventory).length,
      payroll: tenantUsageData.filter(t => t.inferred_features.payroll).length,
      agents: tenantUsageData.filter(t => t.inferred_features.agents).length,
      whatsapp: tenantUsageData.filter(t => t.inferred_features.whatsapp).length,
    };

    return {
      totalTenants: tenantUsageData.length,
      activeTenants: activeTenants.length,
      activeTenantsWithActivity,
      tenantsWithProfiles: tenantsWithProfiles.length,
      tenantsWithoutProfiles: tenantsWithoutProfiles.length,
      totalSales,
      totalInvoices,
      totalReceipts,
      totalInventory,
      totalEmployees,
      totalAgentTransactions,
      featureAdoption,
      inferredUsage,
    };
  }, [tenantUsageData]);

  // Plan distribution data - handle null/missing plans
  const planDistribution = useMemo(() => {
    if (!tenantUsageData) return [];
    const distribution: Record<string, number> = {};
    tenantUsageData.forEach(t => {
      const planName = t.billing_plan 
        ? t.billing_plan.charAt(0).toUpperCase() + t.billing_plan.slice(1)
        : "No Plan";
      distribution[planName] = (distribution[planName] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [tenantUsageData]);

  // Feature adoption chart data - use active tenants as denominator
  const featureAdoptionData = useMemo(() => {
    if (!aggregatedStats || aggregatedStats.activeTenants === 0) return [];
    return Object.entries(aggregatedStats.featureAdoption).map(([feature, count]) => ({
      feature: featureLabels[feature]?.label || feature,
      adoption: Math.round((count / aggregatedStats.activeTenants) * 100),
      enabled: count,
      // Also show inferred usage for comparison
      inferred: aggregatedStats.inferredUsage[feature as keyof typeof aggregatedStats.inferredUsage] || 0,
    }));
  }, [aggregatedStats]);

  // ALL tenants sorted by activity (not capped to 10)
  const allTenantsSorted = useMemo(() => {
    if (!tenantUsageData) return [];
    return [...tenantUsageData]
      .sort((a, b) => (b.sales_count + b.invoice_count) - (a.sales_count + a.invoice_count));
  }, [tenantUsageData]);

  // Top 5 for overview
  const topTenants = useMemo(() => {
    return allTenantsSorted.slice(0, 5);
  }, [allTenantsSorted]);

  const isLoading = tenantsLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Usage Analytics</h2>
          <p className="text-muted-foreground">Track feature adoption and client activity across the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetchTenants()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Data Health Alert */}
      {aggregatedStats && aggregatedStats.tenantsWithoutProfiles > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning" />
            <div>
              <p className="text-sm font-medium">Data Integrity Notice</p>
              <p className="text-xs text-muted-foreground">
                {aggregatedStats.tenantsWithoutProfiles} tenant(s) are missing business profiles. 
                Feature flags may not be accurate for these tenants.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedStats?.activeTenants || 0}</div>
            <p className="text-xs text-muted-foreground">
              {aggregatedStats?.activeTenantsWithActivity || 0} with activity in period ({aggregatedStats?.activeTenants ? Math.round((aggregatedStats.activeTenantsWithActivity / aggregatedStats.activeTenants) * 100) : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedStats?.totalSales?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              In the last {dateRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Created</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedStats?.totalInvoices?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              In the last {dateRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedStats?.totalInventory?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all tenants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedStats?.totalEmployees?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Across all tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receipts Issued</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedStats?.totalReceipts?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">In the last {dateRange} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agent Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedStats?.totalAgentTransactions?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">In the last {dateRange} days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="user-activity" className="flex items-center gap-1">
            <UserCheck className="h-3 w-3" />
            User Activity
          </TabsTrigger>
          <TabsTrigger value="feature-insights" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Feature Insights
          </TabsTrigger>
          <TabsTrigger value="features">Feature Adoption</TabsTrigger>
          <TabsTrigger value="tenants">Tenant Details</TabsTrigger>
          <TabsTrigger value="limits">Usage Limits</TabsTrigger>
        </TabsList>

        {/* User Activity Tab - NEW */}
        <TabsContent value="user-activity">
          <UserActivityTab dateRange={dateRange} />
        </TabsContent>

        {/* Feature Insights Tab - NEW */}
        <TabsContent value="feature-insights">
          <FeatureInsightsTab dateRange={dateRange} />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Plan Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Plan Distribution</CardTitle>
                <CardDescription>Breakdown of tenants by billing plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Active Tenants */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Most Active Tenants</CardTitle>
                <CardDescription>Top 5 tenants by transaction volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topTenants.map((tenant, index) => (
                    <div key={tenant.tenant_id} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{tenant.tenant_name}</p>
                          {!tenant.has_business_profile && (
                            <AlertCircle className="h-3 w-3 text-warning" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tenant.sales_count} sales · {tenant.invoice_count} invoices
                        </p>
                      </div>
                      <Badge variant="outline">{tenant.billing_plan || "No Plan"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feature Adoption Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feature Adoption Rate</CardTitle>
              <CardDescription>
                Percentage of active tenants ({aggregatedStats?.activeTenants || 0}) with each add-on enabled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureAdoptionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="feature" width={100} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value}%`, 'Adoption Rate']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar dataKey="adoption" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Enabled vs Actually Using */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enabled vs. Actually Using</CardTitle>
              <CardDescription>Compare feature toggles to actual data usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["inventory", "payroll", "agents", "whatsapp"].map((feature) => {
                  const enabled = aggregatedStats?.featureAdoption[feature as keyof typeof aggregatedStats.featureAdoption] || 0;
                  const inferred = aggregatedStats?.inferredUsage[feature as keyof typeof aggregatedStats.inferredUsage] || 0;
                  return (
                    <div key={feature} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="font-medium capitalize">{featureLabels[feature]?.label || feature}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span>{enabled} enabled</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-chart-2" />
                          <span>{inferred} using</span>
                        </div>
                        {enabled > 0 && inferred < enabled && (
                          <Badge variant="secondary" className="text-xs">
                            {enabled - inferred} not using
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Feature Usage Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feature Usage Volume</CardTitle>
              <CardDescription>Number of records per feature (inventory is cumulative, others are in period)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureUsageStats || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="feature_key" tickFormatter={(v) => featureLabels[v]?.label || v} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString(), 'Records']}
                      labelFormatter={(label) => featureLabels[label]?.label || label}
                    />
                    <Bar dataKey="total_usage" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenant Details Tab - NOW SHOWS ALL TENANTS */}
        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Tenant Activity ({allTenantsSorted.length})</CardTitle>
              <CardDescription>Detailed breakdown of each tenant's usage (sorted by activity)</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Invoices</TableHead>
                      <TableHead className="text-right">Inventory</TableHead>
                      <TableHead className="text-right">Employees</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTenantsSorted.map((tenant) => (
                      <TableRow key={tenant.tenant_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tenant.tenant_name}</span>
                          {!tenant.has_business_profile && (
                            <span title="Missing business profile">
                              <AlertCircle className="h-3 w-3 text-warning" />
                            </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tenant.tenant_status === "active" ? "default" : "secondary"}>
                            {tenant.tenant_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tenant.billing_plan || "No Plan"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{tenant.sales_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{tenant.invoice_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{tenant.inventory_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{tenant.employee_count.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tenant.features_enabled.length === 0 ? (
                              <span className="text-xs text-muted-foreground">None</span>
                            ) : (
                              <>
                                {tenant.features_enabled.slice(0, 3).map((f) => (
                                  <Badge key={f} variant="secondary" className="text-xs">
                                    {f}
                                  </Badge>
                                ))}
                                {tenant.features_enabled.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{tenant.features_enabled.length - 3}
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {tenant.last_activity 
                            ? format(new Date(tenant.last_activity), "MMM d, yyyy")
                            : <span className="text-muted-foreground">No activity</span>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Limits Tab */}
        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">WhatsApp Usage by Tenant</CardTitle>
              <CardDescription>Monitor WhatsApp message limits and usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {tenantUsageData?.filter(t => t.features_enabled.includes("whatsapp") || t.inferred_features.whatsapp).map((tenant) => {
                  const usagePercent = tenant.whatsapp_limit > 0 
                    ? Math.min((tenant.whatsapp_messages / tenant.whatsapp_limit) * 100, 100)
                    : 0;
                  const isNearLimit = usagePercent >= 80;
                  
                  return (
                    <div key={tenant.tenant_id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{tenant.tenant_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tenant.whatsapp_messages.toLocaleString()} / {tenant.whatsapp_limit.toLocaleString()} messages
                          </p>
                        </div>
                        <Badge variant={isNearLimit ? "destructive" : "secondary"}>
                          {usagePercent.toFixed(0)}%
                        </Badge>
                      </div>
                      <Progress value={usagePercent} className={isNearLimit ? "[&>div]:bg-destructive" : ""} />
                    </div>
                  );
                })}
                {!tenantUsageData?.some(t => t.features_enabled.includes("whatsapp") || t.inferred_features.whatsapp) && (
                  <p className="text-muted-foreground text-center py-8">
                    No tenants with WhatsApp enabled or usage
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inventory Limits - Show ALL tenants with inventory, not capped */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inventory Capacity</CardTitle>
              <CardDescription>Track inventory item counts against plan limits (from billing configuration)</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-6">
                  {tenantUsageData?.filter(t => t.features_enabled.includes("inventory") || t.inferred_features.inventory).map((tenant) => {
                    const limit = getInventoryLimit(tenant.billing_plan);
                    const usagePercent = limit > 0 
                      ? Math.min((tenant.inventory_count / limit) * 100, 100)
                      : 0;
                    const isNearLimit = usagePercent >= 80;
                    
                    return (
                      <div key={tenant.tenant_id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">{tenant.tenant_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {tenant.inventory_count.toLocaleString()} / {limit === -1 ? "∞" : limit.toLocaleString()} items
                              <span className="ml-2 text-muted-foreground">({tenant.billing_plan || "No Plan"})</span>
                            </p>
                          </div>
                          {limit !== -1 && (
                            <Badge variant={isNearLimit ? "destructive" : "secondary"}>
                              {usagePercent.toFixed(0)}%
                            </Badge>
                          )}
                          {limit === -1 && (
                            <Badge variant="outline">Unlimited</Badge>
                          )}
                        </div>
                        {limit !== -1 && (
                          <Progress value={usagePercent} className={isNearLimit ? "[&>div]:bg-destructive" : ""} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
