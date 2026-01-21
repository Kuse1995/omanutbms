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
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { 
  Activity, TrendingUp, Users, Package, CreditCard, MessageSquare,
  ShoppingCart, FileText, Building2, RefreshCw, Download, Calendar
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

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

interface TenantUsageData {
  tenant_id: string;
  tenant_name: string;
  billing_plan: string;
  billing_status: string;
  sales_count: number;
  invoice_count: number;
  inventory_count: number;
  employee_count: number;
  agent_count: number;
  whatsapp_messages: number;
  whatsapp_limit: number;
  last_activity: string | null;
  features_enabled: string[];
}

interface FeatureUsageStats {
  feature_key: string;
  total_usage: number;
  unique_tenants: number;
  unique_users: number;
  trend: number;
}

export function UsageAnalyticsDashboard() {
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all tenants with their usage data
  const { data: tenantUsageData, isLoading: tenantsLoading, refetch: refetchTenants } = useQuery({
    queryKey: ["tenant-usage-analytics", dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange)).toISOString();
      
      // Get all tenants with business profiles
      const { data: tenants } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          status,
          business_profiles (
            billing_plan,
            billing_status,
            inventory_enabled,
            payroll_enabled,
            agents_enabled,
            whatsapp_enabled,
            website_enabled,
            advanced_accounting_enabled,
            whatsapp_messages_used
          )
        `)
        .eq("status", "active");

      if (!tenants) return [];

      // For each tenant, get usage counts
      const usagePromises = tenants.map(async (tenant) => {
        const profile = tenant.business_profiles?.[0] || {};
        
        // Parallel queries for each metric
        const [salesRes, invoicesRes, inventoryRes, employeesRes, agentsRes, lastActivityRes] = await Promise.all([
          supabase.from("sales_transactions").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id).gte("created_at", startDate),
          supabase.from("invoices").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id).gte("created_at", startDate),
          supabase.from("inventory").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id),
          supabase.from("employees").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id),
          supabase.from("agent_transactions").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id).gte("created_at", startDate),
          supabase.from("sales_transactions").select("created_at")
            .eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(1),
        ]);

        const featuresEnabled: string[] = [];
        if (profile.inventory_enabled) featuresEnabled.push("inventory");
        if (profile.payroll_enabled) featuresEnabled.push("payroll");
        if (profile.agents_enabled) featuresEnabled.push("agents");
        if (profile.whatsapp_enabled) featuresEnabled.push("whatsapp");
        if (profile.website_enabled) featuresEnabled.push("website");
        if (profile.advanced_accounting_enabled) featuresEnabled.push("accounting");

        return {
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          billing_plan: profile.billing_plan || "starter",
          billing_status: profile.billing_status || "active",
          sales_count: salesRes.count || 0,
          invoice_count: invoicesRes.count || 0,
          inventory_count: inventoryRes.count || 0,
          employee_count: employeesRes.count || 0,
          agent_count: agentsRes.count || 0,
          whatsapp_messages: profile.whatsapp_messages_used || 0,
          whatsapp_limit: getWhatsAppLimit(profile.billing_plan),
          last_activity: lastActivityRes.data?.[0]?.created_at || null,
          features_enabled: featuresEnabled,
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
      const [salesStats, invoiceStats, inventoryStats, payrollStats, agentStats, whatsappStats] = await Promise.all([
        supabase.from("sales_transactions").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
        supabase.from("invoices").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
        supabase.from("inventory_adjustments").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
        supabase.from("payroll_records").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
        supabase.from("agent_transactions").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
        supabase.from("whatsapp_audit_logs").select("tenant_id", { count: "exact" }).gte("created_at", startDate),
      ]);

      return [
        { feature_key: "sales", total_usage: salesStats.count || 0, unique_tenants: new Set(salesStats.data?.map(s => s.tenant_id)).size, unique_users: 0, trend: 0 },
        { feature_key: "invoices", total_usage: invoiceStats.count || 0, unique_tenants: new Set(invoiceStats.data?.map(s => s.tenant_id)).size, unique_users: 0, trend: 0 },
        { feature_key: "inventory", total_usage: inventoryStats.count || 0, unique_tenants: new Set(inventoryStats.data?.map(s => s.tenant_id)).size, unique_users: 0, trend: 0 },
        { feature_key: "payroll", total_usage: payrollStats.count || 0, unique_tenants: new Set(payrollStats.data?.map(s => s.tenant_id)).size, unique_users: 0, trend: 0 },
        { feature_key: "agents", total_usage: agentStats.count || 0, unique_tenants: new Set(agentStats.data?.map(s => s.tenant_id)).size, unique_users: 0, trend: 0 },
        { feature_key: "whatsapp", total_usage: whatsappStats.count || 0, unique_tenants: new Set(whatsappStats.data?.map(s => s.tenant_id)).size, unique_users: 0, trend: 0 },
      ] as FeatureUsageStats[];
    },
  });

  // Aggregated stats
  const aggregatedStats = useMemo(() => {
    if (!tenantUsageData) return null;
    
    const totalSales = tenantUsageData.reduce((sum, t) => sum + t.sales_count, 0);
    const totalInvoices = tenantUsageData.reduce((sum, t) => sum + t.invoice_count, 0);
    const totalInventory = tenantUsageData.reduce((sum, t) => sum + t.inventory_count, 0);
    const totalAgentTransactions = tenantUsageData.reduce((sum, t) => sum + t.agent_count, 0);
    const activeTenantsCount = tenantUsageData.filter(t => t.sales_count > 0 || t.invoice_count > 0).length;
    
    const featureAdoption = {
      inventory: tenantUsageData.filter(t => t.features_enabled.includes("inventory")).length,
      payroll: tenantUsageData.filter(t => t.features_enabled.includes("payroll")).length,
      agents: tenantUsageData.filter(t => t.features_enabled.includes("agents")).length,
      whatsapp: tenantUsageData.filter(t => t.features_enabled.includes("whatsapp")).length,
      website: tenantUsageData.filter(t => t.features_enabled.includes("website")).length,
      accounting: tenantUsageData.filter(t => t.features_enabled.includes("accounting")).length,
    };

    return {
      totalTenants: tenantUsageData.length,
      activeTenantsCount,
      totalSales,
      totalInvoices,
      totalInventory,
      totalAgentTransactions,
      featureAdoption,
    };
  }, [tenantUsageData]);

  // Plan distribution data
  const planDistribution = useMemo(() => {
    if (!tenantUsageData) return [];
    const distribution: Record<string, number> = {};
    tenantUsageData.forEach(t => {
      distribution[t.billing_plan] = (distribution[t.billing_plan] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [tenantUsageData]);

  // Feature adoption chart data
  const featureAdoptionData = useMemo(() => {
    if (!aggregatedStats) return [];
    return Object.entries(aggregatedStats.featureAdoption).map(([feature, count]) => ({
      feature: featureLabels[feature]?.label || feature,
      adoption: Math.round((count / aggregatedStats.totalTenants) * 100),
      count,
    }));
  }, [aggregatedStats]);

  // Top tenants by activity
  const topTenants = useMemo(() => {
    if (!tenantUsageData) return [];
    return [...tenantUsageData]
      .sort((a, b) => (b.sales_count + b.invoice_count) - (a.sales_count + a.invoice_count))
      .slice(0, 10);
  }, [tenantUsageData]);

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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregatedStats?.activeTenantsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {aggregatedStats?.totalTenants || 0} total ({aggregatedStats?.totalTenants ? Math.round((aggregatedStats.activeTenantsCount / aggregatedStats.totalTenants) * 100) : 0}% active)
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

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Feature Adoption</TabsTrigger>
          <TabsTrigger value="tenants">Tenant Details</TabsTrigger>
          <TabsTrigger value="limits">Usage Limits</TabsTrigger>
        </TabsList>

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
                  {topTenants.slice(0, 5).map((tenant, index) => (
                    <div key={tenant.tenant_id} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tenant.tenant_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tenant.sales_count} sales · {tenant.invoice_count} invoices
                        </p>
                      </div>
                      <Badge variant="outline">{tenant.billing_plan}</Badge>
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
              <CardDescription>Percentage of tenants using each add-on feature</CardDescription>
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

          {/* Feature Usage Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feature Usage Volume</CardTitle>
              <CardDescription>Number of actions per feature in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureUsageStats || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="feature_key" tickFormatter={(v) => featureLabels[v]?.label || v} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString(), 'Actions']}
                      labelFormatter={(label) => featureLabels[label]?.label || label}
                    />
                    <Bar dataKey="total_usage" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenant Details Tab */}
        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tenant Activity Details</CardTitle>
              <CardDescription>Detailed breakdown of each tenant's usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
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
                    {topTenants.map((tenant) => (
                      <TableRow key={tenant.tenant_id}>
                        <TableCell className="font-medium">{tenant.tenant_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tenant.billing_plan}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{tenant.sales_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{tenant.invoice_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{tenant.inventory_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{tenant.employee_count.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
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
              </div>
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
                {tenantUsageData?.filter(t => t.features_enabled.includes("whatsapp")).map((tenant) => {
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
                {!tenantUsageData?.some(t => t.features_enabled.includes("whatsapp")) && (
                  <p className="text-muted-foreground text-center py-8">
                    No tenants with WhatsApp enabled
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inventory Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inventory Capacity</CardTitle>
              <CardDescription>Track inventory item counts against plan limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {tenantUsageData?.filter(t => t.features_enabled.includes("inventory")).slice(0, 10).map((tenant) => {
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
                          </p>
                        </div>
                        {limit !== -1 && (
                          <Badge variant={isNearLimit ? "destructive" : "secondary"}>
                            {usagePercent.toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                      {limit !== -1 && (
                        <Progress value={usagePercent} className={isNearLimit ? "[&>div]:bg-destructive" : ""} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
function getWhatsAppLimit(plan: string): number {
  const limits: Record<string, number> = {
    starter: 100,
    growth: 500,
    professional: 1000,
    enterprise: 5000,
  };
  return limits[plan] || 100;
}

function getInventoryLimit(plan: string): number {
  const limits: Record<string, number> = {
    starter: 100,
    growth: 500,
    professional: 2000,
    enterprise: -1, // unlimited
  };
  return limits[plan] || 100;
}
