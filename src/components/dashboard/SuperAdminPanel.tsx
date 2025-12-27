import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, BarChart3 } from "lucide-react";
import { TenantManager } from "./TenantManager";
import { SuperAdminUsersManager } from "./SuperAdminUsersManager";
import { PlatformStats } from "./PlatformStats";

export function SuperAdminPanel() {
  const [activeTab, setActiveTab] = useState("tenants");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Administration</h1>
        <p className="text-muted-foreground mt-1">
          Manage tenants, users, and platform settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="tenants" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants">
          <TenantManager />
        </TabsContent>

        <TabsContent value="users">
          <SuperAdminUsersManager />
        </TabsContent>

        <TabsContent value="stats">
          <PlatformStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}
