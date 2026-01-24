import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, DollarSign, Users, AlertTriangle, TrendingUp, Droplets, 
  ShoppingCart, Receipt, FileText, Heart, CreditCard, Clock, 
  GraduationCap, Briefcase, Truck, Wheat, UtensilsCrossed, Scissors,
  Stethoscope, Wrench, Calendar, Pill, Store, Sparkles, type LucideIcon 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatures } from "@/hooks/useFeatures";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { useTenant } from "@/hooks/useTenant";
import { useEnterpriseFeatures } from "@/hooks/useEnterpriseFeatures";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpiryAlertsCard } from "@/components/dashboard/ExpiryAlertsCard";
import { VariantLowStockAlerts } from "@/components/dashboard/VariantLowStockAlerts";
import { CustomDesignWizard } from "@/components/dashboard/CustomDesignWizard";
import type { DashboardTab } from "@/pages/Dashboard";

interface DashboardHomeProps {
  setActiveTab?: (tab: DashboardTab) => void;
}

interface DashboardMetrics {
  inventoryValue: number;
  pendingInvoices: number;
  activeAgents: number;
  lowStockAlerts: number;
  totalRevenue: number;
  todaySales: number;
  activeClients: number;
  studentsEnrolled: number;
  donationsReceived: number;
  // New metrics for Zambian SME types
  bookingsToday: number;
  appointmentsToday: number;
  patientsToday: number;
  jobsInProgress: number;
  livestockCount: number;
}

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Package, DollarSign, Users, AlertTriangle, TrendingUp, Droplets,
  ShoppingCart, Receipt, FileText, Heart, CreditCard, Clock,
  GraduationCap, Briefcase, Truck, Wheat, UtensilsCrossed, Scissors,
  Stethoscope, Wrench, Calendar, Pill, Store
};

export function DashboardHome({ setActiveTab }: DashboardHomeProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    inventoryValue: 0,
    pendingInvoices: 0,
    activeAgents: 0,
    lowStockAlerts: 0,
    totalRevenue: 0,
    todaySales: 0,
    activeClients: 0,
    studentsEnrolled: 0,
    donationsReceived: 0,
    bookingsToday: 0,
    appointmentsToday: 0,
    patientsToday: 0,
    jobsInProgress: 0,
    livestockCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomDesignWizard, setShowCustomDesignWizard] = useState(false);
  const { features, loading: featuresLoading, companyName, currencySymbol } = useFeatures();
  const { layout, terminology, businessType } = useBusinessConfig();
  const { tenantId } = useTenant();
  const { isCustomDesignerEnabled, isProductionTrackingEnabled } = useEnterpriseFeatures();

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

      // Fetch pending invoices (actual invoices, not transactions)
      const { data: pendingInvoicesData } = await supabase
        .from("invoices")
        .select("id")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "draft"]);

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

      // Fetch sales for revenue (this month) - source: sales_transactions
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: salesData } = await supabase
        .from("sales_transactions")
        .select("total_amount_zmw, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", startOfMonth.toISOString());

      // Fetch unique clients from invoices
      const { data: clientsData } = await supabase
        .from("invoices")
        .select("client_email")
        .eq("tenant_id", tenantId);

      const uniqueClients = new Set(clientsData?.map(c => c.client_email).filter(Boolean)).size;

      const totalValue = inventoryData.reduce(
        (sum, item) => sum + item.current_stock * Number(item.unit_price),
        0
      );
      const lowStock = inventoryData.filter(
        (item) => item.current_stock < (item.reorder_level || 10)
      ).length;
      const totalRevenue = salesData?.reduce((sum, sale: any) => sum + Number(sale.total_amount_zmw ?? 0), 0) || 0;

      // Get today's date for daily metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch today's sales (revenue + count) from sales_transactions
      const { data: todaySalesData } = await supabase
        .from("sales_transactions")
        .select("id, total_amount_zmw, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", today.toISOString());

      const todaySalesCount = todaySalesData?.length || 0;
      const todaySalesRevenue =
        todaySalesData?.reduce((sum, sale: any) => sum + Number(sale.total_amount_zmw || 0), 0) || 0;

      // Fetch pending/in-progress invoices for jobs in progress
      const { data: pendingJobs } = await supabase
        .from("invoices")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "pending");

      // Fetch livestock count (items in livestock category)
      let livestockCount = 0;
      if (features.inventory) {
        const { data: livestockData } = await supabase
          .from("inventory")
          .select("current_stock")
          .eq("tenant_id", tenantId)
          .eq("category", "livestock");
        livestockCount = livestockData?.reduce((sum, item) => sum + item.current_stock, 0) || 0;
      }

      setMetrics({
        inventoryValue: totalValue,
        pendingInvoices: pendingInvoicesData?.length || 0,
        activeAgents: agentsData.length,
        lowStockAlerts: lowStock,
        totalRevenue,
        todaySales: todaySalesRevenue,
        activeClients: uniqueClients,
        studentsEnrolled: uniqueClients,
        donationsReceived: totalRevenue,
        bookingsToday: todaySalesCount,
        appointmentsToday: todaySalesCount,
        patientsToday: todaySalesCount,
        jobsInProgress: pendingJobs?.length || 0,
        livestockCount,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!featuresLoading && tenantId) {
      fetchMetrics();

      // Set up real-time subscriptions for inventory and invoices
      const inventoryChannel = supabase
        .channel('dashboard-inventory')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inventory',
            filter: `tenant_id=eq.${tenantId}`
          },
          () => {
            fetchMetrics();
          }
        )
        .subscribe();

      const invoicesChannel = supabase
        .channel('dashboard-invoices')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'invoices',
            filter: `tenant_id=eq.${tenantId}`
          },
          () => {
            fetchMetrics();
          }
        )
        .subscribe();

      const salesChannel = supabase
        .channel('dashboard-sales-transactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sales_transactions',
            filter: `tenant_id=eq.${tenantId}`,
          },
          () => {
            fetchMetrics();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(inventoryChannel);
        supabase.removeChannel(invoicesChannel);
        supabase.removeChannel(salesChannel);
      };
    }
  }, [tenantId, features, featuresLoading]);

  // Get metric value based on metric type
  const getMetricValue = (metric: string): string => {
    switch (metric) {
      case 'inventory_value':
        return `${currencySymbol} ${metrics.inventoryValue.toLocaleString()}`;
      case 'pending_invoices':
        return metrics.pendingInvoices.toString();
      case 'active_agents':
        return metrics.activeAgents.toString();
      case 'low_stock':
        return metrics.lowStockAlerts.toString();
      case 'total_revenue':
        return `${currencySymbol} ${metrics.totalRevenue.toLocaleString()}`;
      case 'today_sales':
        return `${currencySymbol} ${metrics.todaySales.toLocaleString()}`;
      case 'active_clients':
        return metrics.activeClients.toString();
      case 'students_enrolled':
        return metrics.studentsEnrolled.toString();
      case 'donations_received':
        return `${currencySymbol} ${metrics.donationsReceived.toLocaleString()}`;
      case 'bookings_today':
        return metrics.bookingsToday.toString();
      case 'appointments_today':
        return metrics.appointmentsToday.toString();
      case 'patients_today':
        return metrics.patientsToday.toString();
      case 'jobs_in_progress':
        return metrics.jobsInProgress.toString();
      case 'livestock_count':
        return metrics.livestockCount.toString();
      case 'harvest_value':
        return `${currencySymbol} ${metrics.totalRevenue.toLocaleString()}`;
      default:
        return '0';
    }
  };

  // Get dynamic color for low stock alerts
  const getCardColor = (card: typeof layout.kpiCards[0]): string => {
    if (card.metric === 'low_stock' && metrics.lowStockAlerts > 0) {
      return 'text-red-500';
    }
    return card.color;
  };

  const getCardBgColor = (card: typeof layout.kpiCards[0]): string => {
    if (card.metric === 'low_stock' && metrics.lowStockAlerts > 0) {
      return 'bg-red-500/10';
    }
    return card.bgColor;
  };

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

  const kpiCards = layout.kpiCards;
  const quickActions = layout.quickActions;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      data-tour="dashboard-home"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-[#003366] mb-2">Dashboard Overview</h2>
        <p className="text-[#004B8D]/60">
          Welcome to {companyName || 'Omanut'} — {layout.welcomeMessage}
        </p>
      </div>

      {/* Dynamic KPI Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${kpiCards.length >= 4 ? 'lg:grid-cols-4' : `lg:grid-cols-${kpiCards.length}`} gap-4 mb-8`}>
        {kpiCards.map((card, index) => {
          const Icon = iconMap[card.icon] || Package;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="bg-white border-[#004B8D]/10 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-[#004B8D]/70">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${getCardBgColor(card)}`}>
                    <Icon className={`h-4 w-4 ${getCardColor(card)}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#003366]">
                    {isLoading ? "..." : getMetricValue(card.metric)}
                  </div>
                  {card.subtitle && (
                    <p className="text-xs text-[#004B8D]/50 mt-1">{card.subtitle}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Expiry Alerts for inventory-enabled tenants */}
      {features.inventory && <ExpiryAlertsCard />}

      {/* Variant Low Stock Alerts for fashion businesses */}
      <VariantLowStockAlerts />

      {/* Quick Actions & Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-[#004B8D]/10 shadow-sm" data-tour="quick-actions">
          <CardHeader>
            <CardTitle className="text-[#003366] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {/* Enterprise Custom Designer Button - Gold themed */}
              {isCustomDesignerEnabled && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowCustomDesignWizard(true)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  New Custom Order
                </Button>
              )}
              
              {quickActions.map((action) => {
                // Hide standard "New Sale" if custom designer is enabled
                if (isCustomDesignerEnabled && action.id === 'new-sale') {
                  return null;
                }
                
                // Hide "Custom Orders" quick action if custom designer is NOT enabled
                if (action.id === 'custom-orders' && !isCustomDesignerEnabled) {
                  return null;
                }
                
                const ActionIcon = iconMap[action.icon] || Package;
                return (
                  <Button
                    key={action.id}
                    variant={action.highlight ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab?.(action.targetTab)}
                    className={action.highlight ? "bg-[#004B8D] hover:bg-[#003366]" : ""}
                  >
                    <ActionIcon className="h-4 w-4 mr-2" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-[#004B8D]/60 text-sm mt-3">
              Navigate to specific sections using the sidebar to manage your business operations.
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

        {!features.impact && (
          <Card className="bg-white border-[#004B8D]/10 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#003366] flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Performance Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#004B8D]/60 text-sm">
                Use the Accounts section to view detailed financial reports and analytics for your business.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Custom Design Wizard Modal */}
      <CustomDesignWizard 
        open={showCustomDesignWizard} 
        onClose={() => setShowCustomDesignWizard(false)} 
      />
    </motion.div>
  );
}