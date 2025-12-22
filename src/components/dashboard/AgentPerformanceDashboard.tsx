import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Users, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  business_name: string;
  province: string;
  contact_person: string;
}

interface AgentTransaction {
  id: string;
  agent_id: string;
  transaction_type: string;
  amount_zmw: number;
  created_at: string;
}

interface AgentInventory {
  id: string;
  agent_id: string;
  product_type: string;
  quantity: number;
  unit_price: number;
  total_value: number;
}

interface AgentPerformance {
  id: string;
  name: string;
  province: string;
  totalSales: number;
  totalPayments: number;
  inventoryValue: number;
  inventoryTurnover: number;
  transactionCount: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const CHART_COLORS = ["#0077B6", "#00B4D8", "#90E0EF", "#CAF0F8", "#03045E"];

export function AgentPerformanceDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [transactions, setTransactions] = useState<AgentTransaction[]>([]);
  const [inventory, setInventory] = useState<AgentInventory[]>([]);
  const [performance, setPerformance] = useState<AgentPerformance[]>([]);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [agentsRes, transactionsRes, inventoryRes] = await Promise.all([
        supabase.from("agent_applications").select("id, business_name, province, contact_person").eq("status", "approved"),
        supabase.from("agent_transactions").select("*"),
        supabase.from("agent_inventory").select("*"),
      ]);

      if (agentsRes.error) throw agentsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;
      if (inventoryRes.error) throw inventoryRes.error;

      setAgents(agentsRes.data || []);
      setTransactions(transactionsRes.data || []);
      setInventory(inventoryRes.data || []);

      // Calculate performance metrics
      const performanceData: AgentPerformance[] = (agentsRes.data || []).map((agent) => {
        const agentTx = (transactionsRes.data || []).filter((t) => t.agent_id === agent.id);
        const agentInv = (inventoryRes.data || []).filter((i) => i.agent_id === agent.id);

        const totalSales = agentTx
          .filter((t) => t.transaction_type === "invoice" || t.transaction_type === "consignment")
          .reduce((sum, t) => sum + t.amount_zmw, 0);

        const totalPayments = agentTx
          .filter((t) => t.transaction_type === "payment")
          .reduce((sum, t) => sum + t.amount_zmw, 0);

        const inventoryValue = agentInv.reduce((sum, i) => sum + (i.total_value || 0), 0);

        // Inventory turnover = Sales / Average Inventory Value (simplified)
        const inventoryTurnover = inventoryValue > 0 ? totalSales / inventoryValue : 0;

        return {
          id: agent.id,
          name: agent.business_name,
          province: agent.province,
          totalSales,
          totalPayments,
          inventoryValue,
          inventoryTurnover: Math.round(inventoryTurnover * 100) / 100,
          transactionCount: agentTx.length,
        };
      });

      // Sort by total sales descending
      performanceData.sort((a, b) => b.totalSales - a.totalSales);
      setPerformance(performanceData);
    } catch (error) {
      console.error("Error fetching performance data:", error);
      toast({
        title: "Error",
        description: "Failed to load performance data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Performance data updated",
    });
  };

  // Calculate summary metrics
  const totalSalesValue = performance.reduce((sum, p) => sum + p.totalSales, 0);
  const totalInventoryValue = performance.reduce((sum, p) => sum + p.inventoryValue, 0);
  const avgTurnover = performance.length > 0 
    ? performance.reduce((sum, p) => sum + p.inventoryTurnover, 0) / performance.length 
    : 0;

  // Get top 5 agents by sales
  const topAgentsBySales = performance.slice(0, 5);

  // Get top 5 agents by inventory turnover (filter out 0s)
  const topAgentsByTurnover = [...performance]
    .filter((p) => p.inventoryTurnover > 0)
    .sort((a, b) => b.inventoryTurnover - a.inventoryTurnover)
    .slice(0, 5);

  // Province distribution
  const provinceData = agents.reduce((acc, agent) => {
    const existing = acc.find((p) => p.name === agent.province);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: agent.province, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Sales by province
  const salesByProvince = performance.reduce((acc, agent) => {
    const existing = acc.find((p) => p.name === agent.province);
    if (existing) {
      existing.sales += agent.totalSales;
    } else {
      acc.push({ name: agent.province, sales: agent.totalSales });
    }
    return acc;
  }, [] as { name: string; sales: number }[]);

  salesByProvince.sort((a, b) => b.sales - a.sales);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Agent Performance Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Track sales, inventory turnover, and agent rankings
            </p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Agents</p>
                  <p className="text-2xl font-bold text-foreground">{agents.length}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">K{totalSalesValue.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inventory Value</p>
                  <p className="text-2xl font-bold text-foreground">K{totalInventoryValue.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Turnover Rate</p>
                  <p className="text-2xl font-bold text-foreground">{avgTurnover.toFixed(2)}x</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Agents by Sales */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Top Agents by Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topAgentsBySales.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No sales data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topAgentsBySales} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(value) => `K${(value / 1000).toFixed(0)}k`} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120} 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`K${value.toLocaleString()}`, "Sales"]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="totalSales" fill="#0077B6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Agents by Inventory Turnover */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Top Agents by Inventory Turnover
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topAgentsByTurnover.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No turnover data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topAgentsByTurnover} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(value) => `${value}x`} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120} 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value}x`, "Turnover Rate"]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="inventoryTurnover" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Province */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Sales by Province
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesByProvince.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No province data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesByProvince}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tickFormatter={(value) => `K${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => [`K${value.toLocaleString()}`, "Sales"]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="sales" fill="#00B4D8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Agent Distribution by Province */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Agent Distribution by Province
              </CardTitle>
            </CardHeader>
            <CardContent>
              {provinceData.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No agent data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={provinceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {provinceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value, "Agents"]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agent Performance Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Rank</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Agent</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Province</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Total Sales</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Inventory Value</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Turnover</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.slice(0, 10).map((agent, index) => (
                    <tr key={agent.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <Badge variant={index < 3 ? "default" : "secondary"} className="w-8 justify-center">
                          {index + 1}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">{agent.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{agent.province}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-medium text-emerald-600">K{agent.totalSales.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-muted-foreground">K{agent.inventoryValue.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {agent.inventoryTurnover > avgTurnover ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-amber-500" />
                          )}
                          <span className={agent.inventoryTurnover > avgTurnover ? "text-emerald-600" : "text-amber-600"}>
                            {agent.inventoryTurnover}x
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline">{agent.transactionCount}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {performance.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No agent performance data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
