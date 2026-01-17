import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, BarChart3, CreditCard, Package } from "lucide-react";
import { TenantManager } from "./TenantManager";
import { SuperAdminUsersManager } from "./SuperAdminUsersManager";
import { PlatformStats } from "./PlatformStats";
import { PlanConfigManager } from "./PlanConfigManager";
import { AddonsConfigManager } from "./AddonsConfigManager";

export function SuperAdminPanel() {
  const [activeTab, setActiveTab] = useState("tenants");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Administration</h1>
        <p className="text-muted-foreground mt-1">
          Manage tenants, users, billing plans, add-ons, and platform settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-[625px]">
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
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
        </TabsList>

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

        <TabsContent value="stats">
          <PlatformStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}
