import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, BarChart3, CreditCard, Package, Activity, Settings2 } from "lucide-react";
import { TenantManager } from "./TenantManager";
import { SuperAdminUsersManager } from "./SuperAdminUsersManager";
import { PlatformStats } from "./PlatformStats";
import { PlanConfigManager } from "./PlanConfigManager";
import { AddonsConfigManager } from "./AddonsConfigManager";
import { UsageAnalyticsDashboard } from "./UsageAnalyticsDashboard";
import { PlatformConfigManager } from "./PlatformConfigManager";
import { PlatformComplianceChecklist } from "./PlatformComplianceChecklist";
import { PlatformRevenueStats } from "./PlatformRevenueStats";

export function SuperAdminPanel() {
  const [activeTab, setActiveTab] = useState("platform");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Administration</h1>
        <p className="text-muted-foreground mt-1">
          Manage your platform identity, tenants, billing plans, and settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-7 lg:w-[900px]">
          <TabsTrigger value="platform" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Platform</span>
          </TabsTrigger>
          <TabsTrigger value="tenants" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Tenants</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Plans</span>
          </TabsTrigger>
          <TabsTrigger value="addons" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Add-ons</span>
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Usage</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="space-y-6">
          <PlatformComplianceChecklist />
          <PlatformConfigManager />
        </TabsContent>

        <TabsContent value="tenants">
          <TenantManager />
        </TabsContent>

        <TabsContent value="users">
          <SuperAdminUsersManager />
        </TabsContent>

        <TabsContent value="plans">
          <PlanConfigManager />
        </TabsContent>

        <TabsContent value="addons">
          <AddonsConfigManager />
        </TabsContent>

        <TabsContent value="usage">
          <UsageAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <PlatformRevenueStats />
          <PlatformStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}
