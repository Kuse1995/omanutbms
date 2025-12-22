import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, Users, AlertTriangle, TrendingUp, Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardMetrics {
  totalInventoryValue: number;
  pendingInvoices: number;
  activeAgents: number;
  lowStockAlerts: number;
}

export function DashboardHome() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalInventoryValue: 0,
    pendingInvoices: 0,
    activeAgents: 0,
    lowStockAlerts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch inventory data
        const { data: inventory } = await supabase
          .from("inventory")
          .select("current_stock, unit_price, reorder_level");

        // Fetch pending transactions
        const { data: transactions } = await supabase
          .from("transactions")
          .select("status")
          .eq("status", "pending");

        // Fetch approved agents
        const { data: agents } = await supabase
          .from("agent_applications")
          .select("status")
          .eq("status", "approved");

        if (inventory) {
          const totalValue = inventory.reduce(
            (sum, item) => sum + item.current_stock * Number(item.unit_price),
            0
          );
          const lowStock = inventory.filter(
            (item) => item.current_stock < (item.reorder_level || 10)
          ).length;

          setMetrics({
            totalInventoryValue: totalValue,
            pendingInvoices: transactions?.length || 0,
            activeAgents: agents?.length || 0,
            lowStockAlerts: lowStock,
          });
        }
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const cards = [
    {
      title: "Total Inventory Value",
      value: `K ${metrics.totalInventoryValue.toLocaleString()}`,
      icon: Package,
      color: "text-[#004B8D]",
      bgColor: "bg-[#004B8D]/10",
    },
    {
      title: "Pending Invoices",
      value: metrics.pendingInvoices.toString(),
      icon: DollarSign,
      color: "text-[#0077B6]",
      bgColor: "bg-[#0077B6]/10",
    },
    {
      title: "Active Agents",
      value: metrics.activeAgents.toString(),
      icon: Users,
      color: "text-teal-600",
      bgColor: "bg-teal-500/10",
    },
    {
      title: "Low Stock Alerts",
      value: metrics.lowStockAlerts.toString(),
      icon: AlertTriangle,
      color: metrics.lowStockAlerts > 0 ? "text-red-500" : "text-gray-400",
      bgColor: metrics.lowStockAlerts > 0 ? "bg-red-500/10" : "bg-gray-200",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-[#003366] mb-2">Dashboard Overview</h2>
        <p className="text-[#004B8D]/60">Welcome to Finch Investments Business Management System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="bg-white border-[#004B8D]/10 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-[#004B8D]/70">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#003366]">
                  {isLoading ? "..." : card.value}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-[#004B8D]/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#003366] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[#004B8D]/60 text-sm">
              Navigate to specific sections using the sidebar to manage inventory, accounts, and HR operations.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#004B8D]/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#003366] flex items-center gap-2">
              <Droplets className="h-5 w-5 text-[#0077B6]" />
              Impact Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#004B8D]/60 text-sm">
              View detailed impact metrics and generate certificates in the Accounts section.
            </p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
