import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  ShoppingCart, FileText, Package, Users, Receipt, MessageSquare,
  TrendingUp, Zap, Target, BarChart3
} from "lucide-react";
import { subDays, format, getHours, getDay } from "date-fns";

interface FeatureStats {
  feature_key: string;
  total_usage: number;
  unique_users: number;
  unique_tenants: number;
}

interface FeatureInsightsTabProps {
  dateRange: string;
}

const COLORS = [
  'hsl(var(--primary))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))', 
  'hsl(var(--chart-5))',
  'hsl(221, 83%, 53%)',
  'hsl(142, 71%, 45%)',
];

const featureLabels: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  sales: { label: "Sales", icon: ShoppingCart, color: "hsl(var(--primary))" },
  sales_transactions: { label: "Sales", icon: ShoppingCart, color: "hsl(var(--primary))" },
  invoices: { label: "Invoices", icon: FileText, color: "hsl(var(--chart-2))" },
  inventory: { label: "Inventory", icon: Package, color: "hsl(var(--chart-3))" },
  payment_receipts: { label: "Receipts", icon: Receipt, color: "hsl(var(--chart-4))" },
  payroll_records: { label: "Payroll", icon: Users, color: "hsl(var(--chart-5))" },
  employees: { label: "HR", icon: Users, color: "hsl(221, 83%, 53%)" },
  whatsapp_audit_logs: { label: "WhatsApp", icon: MessageSquare, color: "hsl(142, 71%, 45%)" },
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hourLabels = ["12am", "3am", "6am", "9am", "12pm", "3pm", "6pm", "9pm"];

export function FeatureInsightsTab({ dateRange }: FeatureInsightsTabProps) {
  // Fetch feature usage from audit_log (more reliable than feature_usage_logs)
  const { data: featureStats, isLoading: statsLoading } = useQuery({
    queryKey: ["feature-insights", dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange)).toISOString();
      
      // Try RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_feature_usage_stats", {
        p_start_date: startDate,
      });

      if (!rpcError && rpcData) {
        return rpcData as FeatureStats[];
      }

      // Fallback to direct query
      return fetchFeatureStatsFallback(startDate);
    },
  });

  // Fetch activity heatmap data
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ["activity-heatmap", dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange)).toISOString();
      
      const { data, error } = await supabase
        .from("audit_log")
        .select("changed_at")
        .gte("changed_at", startDate)
        .not("changed_by", "is", null)
        .limit(10000);

      if (error || !data) return [];

      // Build heatmap grid (7 days x 8 time blocks)
      const grid: number[][] = Array.from({ length: 7 }, () => Array(8).fill(0));
      
      data.forEach(row => {
        const date = new Date(row.changed_at);
        const dayOfWeek = getDay(date);
        const hour = getHours(date);
        const timeBlock = Math.floor(hour / 3); // 0-7 for 3-hour blocks
        grid[dayOfWeek][timeBlock]++;
      });

      // Flatten for visualization
      const flatData: { day: string; hour: string; value: number }[] = [];
      grid.forEach((dayData, dayIdx) => {
        dayData.forEach((value, hourIdx) => {
          flatData.push({
            day: dayNames[dayIdx],
            hour: hourLabels[hourIdx],
            value,
          });
        });
      });

      return flatData;
    },
  });

  // Process feature stats for charts
  const chartData = useMemo(() => {
    if (!featureStats) return [];
    
    // Combine similar features and map to friendly names
    const combined = new Map<string, { total: number; users: number; tenants: number }>();
    
    featureStats.forEach(stat => {
      // Map database table names to feature categories
      let key = stat.feature_key;
      if (key === "sales_transactions") key = "sales";
      if (key === "payment_receipts") key = "receipts";
      if (key === "payroll_records") key = "payroll";
      if (key === "whatsapp_audit_logs") key = "whatsapp";
      
      const existing = combined.get(key);
      if (existing) {
        existing.total += Number(stat.total_usage);
        existing.users = Math.max(existing.users, Number(stat.unique_users));
        existing.tenants = Math.max(existing.tenants, Number(stat.unique_tenants));
      } else {
        combined.set(key, {
          total: Number(stat.total_usage),
          users: Number(stat.unique_users),
          tenants: Number(stat.unique_tenants),
        });
      }
    });

    return Array.from(combined.entries())
      .map(([key, data]) => ({
        feature: featureLabels[key]?.label || key,
        usage: data.total,
        users: data.users,
        tenants: data.tenants,
        color: featureLabels[key]?.color || "hsl(var(--primary))",
      }))
      .sort((a, b) => b.usage - a.usage);
  }, [featureStats]);

  // Calculate max value for heatmap color scaling
  const maxHeatmapValue = useMemo(() => {
    if (!heatmapData?.length) return 1;
    return Math.max(...heatmapData.map(d => d.value));
  }, [heatmapData]);

  const isLoading = statsLoading || heatmapLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feature Popularity Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Feature Popularity
          </CardTitle>
          <CardDescription>
            Total usage count per feature in the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                dataKey="feature" 
                type="category" 
                tick={{ fontSize: 12 }}
                width={90}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
                formatter={(value: number) => [value.toLocaleString(), "Total Actions"]}
              />
              <Bar 
                dataKey="usage" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Feature Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Usage Distribution
            </CardTitle>
            <CardDescription>
              Proportion of total usage by feature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="usage"
                  nameKey="feature"
                  label={({ feature, percent }) => `${feature} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tenant Adoption by Feature */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tenant Adoption
            </CardTitle>
            <CardDescription>
              Number of unique tenants using each feature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.slice(0, 6).map((item, index) => (
                <div key={item.feature} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{item.feature}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.tenants} tenants</Badge>
                    <Badge variant="outline">{item.users} users</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Activity Heatmap
          </CardTitle>
          <CardDescription>
            When users are most active (day of week vs time of day)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Time labels */}
              <div className="flex mb-2 ml-12">
                {hourLabels.map(hour => (
                  <div key={hour} className="flex-1 text-center text-xs text-muted-foreground">
                    {hour}
                  </div>
                ))}
              </div>
              
              {/* Heatmap grid */}
              {dayNames.map(day => (
                <div key={day} className="flex items-center mb-1">
                  <div className="w-12 text-xs text-muted-foreground">{day}</div>
                  <div className="flex flex-1 gap-1">
                    {hourLabels.map(hour => {
                      const cell = heatmapData?.find(d => d.day === day && d.hour === hour);
                      const value = cell?.value || 0;
                      const intensity = maxHeatmapValue > 0 ? value / maxHeatmapValue : 0;
                      
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className="flex-1 h-8 rounded transition-colors cursor-default"
                          style={{
                            backgroundColor: intensity > 0 
                              ? `hsla(var(--primary), ${0.2 + intensity * 0.8})` 
                              : "hsl(var(--muted))",
                          }}
                          title={`${day} ${hour}: ${value} actions`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* Legend */}
              <div className="flex items-center justify-end mt-4 gap-2 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-1">
                  {[0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded"
                      style={{
                        backgroundColor: `hsla(var(--primary), ${intensity})`,
                      }}
                    />
                  ))}
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Fallback function if RPC fails
async function fetchFeatureStatsFallback(startDate: string): Promise<FeatureStats[]> {
  // Query audit_log directly
  const { data, error } = await supabase
    .from("audit_log")
    .select("table_name, changed_by, tenant_id")
    .gte("changed_at", startDate)
    .limit(10000);

  if (error || !data) return [];

  // Aggregate by table_name
  const statsMap = new Map<string, { total: number; users: Set<string>; tenants: Set<string> }>();
  
  data.forEach(row => {
    const key = row.table_name;
    const existing = statsMap.get(key);
    
    if (existing) {
      existing.total++;
      if (row.changed_by) existing.users.add(row.changed_by);
      if (row.tenant_id) existing.tenants.add(row.tenant_id);
    } else {
      statsMap.set(key, {
        total: 1,
        users: new Set(row.changed_by ? [row.changed_by] : []),
        tenants: new Set(row.tenant_id ? [row.tenant_id] : []),
      });
    }
  });

  return Array.from(statsMap.entries())
    .map(([feature_key, data]) => ({
      feature_key,
      total_usage: data.total,
      unique_users: data.users.size,
      unique_tenants: data.tenants.size,
    }))
    .filter(stat => 
      ["sales", "sales_transactions", "invoices", "inventory", "payment_receipts", 
       "payroll_records", "employees", "whatsapp_audit_logs"].includes(stat.feature_key)
    );
}
