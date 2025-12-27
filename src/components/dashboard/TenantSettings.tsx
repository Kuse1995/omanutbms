import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Eye, Package, CreditCard } from "lucide-react";
import { BrandingSettings } from "./BrandingSettings";
import { WhiteLabelSettings } from "./WhiteLabelSettings";
import { ModulesMarketplace } from "./ModulesMarketplace";
import { PlanOverview } from "./PlanOverview";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX } from "lucide-react";

export function TenantSettings() {
  const [activeTab, setActiveTab] = useState("branding");
  const { isAdmin } = useAuth();

  // Only admins can access tenant settings
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full bg-muted/50 border-muted">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <ShieldX className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl text-foreground">
              Admin Access Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Only administrators can access tenant settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Tenant Settings</h2>
        <p className="text-muted-foreground">
          Configure branding, white-label settings, and manage your modules.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="whitelabel" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            White-Label
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="plan" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Plan Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <BrandingSettings />
        </TabsContent>

        <TabsContent value="whitelabel">
          <WhiteLabelSettings />
        </TabsContent>

        <TabsContent value="modules">
          <ModulesMarketplace />
        </TabsContent>

        <TabsContent value="plan">
          <PlanOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}
