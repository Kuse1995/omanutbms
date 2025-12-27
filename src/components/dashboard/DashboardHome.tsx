import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, Users, AlertTriangle, TrendingUp, Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatures } from "@/hooks/useFeatures";
import { useTenant } from "@/hooks/useTenant";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { features, terminology, loading: featuresLoading, companyName, currencySymbol } = useFeatures();
  const { tenantId } = useTenant();

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch inventory data (only if inventory is enabled)
        let inventoryData: { current_stock: number; unit_price: number; reorder_level: number | null }[] = [];
        if (features.inventory) {
          const { data } = await supabase
            .from("inventory")
            .select("current_stock, unit_price, reorder_level")
            .eq("tenant_id", tenantId);
          inventoryData = data || [];
        }

        // Fetch pending transactions (always fetch - core feature)
        const { data: transactions } = await supabase
          .from("transactions")
          .select("status")
          .eq("tenant_id", tenantId)
          .eq("status", "pending");

        // Fetch approved agents (only if agents is enabled)
        let agentsData: { status: string }[] = [];
        if (features.agents) {
          const { data } = await supabase
            .from("agent_applications")
            .select("status")
            .eq("tenant_id", tenantId)
            .eq("status", "approved");
          agentsData = data || [];
        }

        const totalValue = inventoryData.reduce(
          (sum, item) => sum + item.current_stock * Number(item.unit_price),
          0
        );
        const lowStock = inventoryData.filter(
          (item) => item.current_stock < (item.reorder_level || 10)
        ).length;

        setMetrics({
          totalInventoryValue: totalValue,
          pendingInvoices: transactions?.length || 0,
          activeAgents: agentsData.length,
          lowStockAlerts: lowStock,
        });
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!featuresLoading) {
      fetchMetrics();
    }
  }, [tenantId, features, featuresLoading]);

  // Define cards with feature requirements
  const allCards = [
    {
      title: `Total ${terminology.inventoryLabel} Value`,
      value: `${currencySymbol} ${metrics.totalInventoryValue.toLocaleString()}`,
      icon: Package,
      color: "text-[#004B8D]",
      bgColor: "bg-[#004B8D]/10",
      feature: 'inventory' as const,
    },
    {
      title: `Pending ${terminology.invoicesLabel}`,
      value: metrics.pendingInvoices.toString(),
      icon: DollarSign,
      color: "text-[#0077B6]",
      bgColor: "bg-[#0077B6]/10",
      feature: null,
    },
    {
      title: "Active Agents",
      value: metrics.activeAgents.toString(),
      icon: Users,
      color: "text-teal-600",
      bgColor: "bg-teal-500/10",
      feature: 'agents' as const,
    },
    {
      title: "Low Stock Alerts",
      value: metrics.lowStockAlerts.toString(),
      icon: AlertTriangle,
      color: metrics.lowStockAlerts > 0 ? "text-red-500" : "text-gray-400",
      bgColor: metrics.lowStockAlerts > 0 ? "bg-red-500/10" : "bg-gray-200",
      feature: 'inventory' as const,
    },
  ];

  // Filter cards based on enabled features
  const visibleCards = allCards.filter(
    (card) => !card.feature || features[card.feature]
  );

  // Show loading state while features are loading
  if (featuresLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-[#003366] mb-2">Dashboard Overview</h2>
        <p className="text-[#004B8D]/60">
          Welcome to {companyName || 'Omanut'} Business Management System
        </p>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${visibleCards.length >= 4 ? 'lg:grid-cols-4' : `lg:grid-cols-${visibleCards.length}`} gap-4 mb-8`}>
        {visibleCards.map((card, index) => (
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
              Navigate to specific sections using the sidebar to manage {terminology.inventoryLabel.toLowerCase()}, accounts, and HR operations.
            </p>
          </CardContent>
        </Card>

        {features.impact && (
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
        )}
      </div>
    </motion.div>
  );
}
