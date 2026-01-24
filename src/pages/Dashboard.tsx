import { useState, useEffect, useMemo } from "react";
import { OmanutAdvisor } from "@/components/dashboard/OmanutAdvisor";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { InventoryAgent } from "@/components/dashboard/InventoryAgent";
import { AccountsAgent } from "@/components/dashboard/AccountsAgent";
import { HRAgent } from "@/components/dashboard/HRAgent";
import { SettingsManager } from "@/components/dashboard/SettingsManager";
import { TenantSettings } from "@/components/dashboard/TenantSettings";
import { ModulesMarketplace } from "@/components/dashboard/ModulesMarketplace";
import { CommunityMessagesManagement } from "@/components/dashboard/CommunityMessagesManagement";
import { WebsiteManager } from "@/components/dashboard/WebsiteManager";
import { SalesRecorder } from "@/components/dashboard/SalesRecorder";
import { ShopManager } from "@/components/dashboard/ShopManager";
import { WASHForumsManagement } from "@/components/dashboard/WASHForumsManagement";
import { ReceiptsManager } from "@/components/dashboard/ReceiptsManager";
import { AgentsManager } from "@/components/dashboard/AgentsManager";
import { WebsiteContactsManagement } from "@/components/dashboard/WebsiteContactsManagement";
import { PoweredByFooter } from "@/components/dashboard/PoweredByFooter";
import { SuperAdminPanel } from "@/components/dashboard/SuperAdminPanel";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import { BranchesManager } from "@/components/dashboard/BranchesManager";
import { ReturnsAndDamagesManager } from "@/components/dashboard/ReturnsAndDamagesManager";
import { CustomersManager } from "@/components/dashboard/CustomersManager";
import { CustomOrdersManager } from "@/components/dashboard/CustomOrdersManager";
import { LocationsManager } from "@/components/dashboard/LocationsManager";
import { StockTransfersManager } from "@/components/dashboard/StockTransfersManager";
import { WarehouseView } from "@/components/dashboard/WarehouseView";
import { ProductionFloor } from "@/components/dashboard/ProductionFloor";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { useFeatures } from "@/hooks/useFeatures";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEnterpriseFeatures } from "@/hooks/useEnterpriseFeatures";
import { BranchProvider } from "@/hooks/useBranch";
import { useBranding } from "@/hooks/useBranding";
import { useApplyTenantBranding } from "@/contexts/BrandingContext";

export type DashboardTab = "dashboard" | "sales" | "receipts" | "accounts" | "hr" | "inventory" | "shop" | "agents" | "communities" | "messages" | "contacts" | "website" | "settings" | "tenant-settings" | "modules" | "platform-admin" | "branches" | "returns" | "customers" | "custom-orders" | "warehouse" | "stock-transfers" | "locations" | "production-floor";

const Dashboard = () => {
  const { layout, loading: configLoading } = useBusinessConfig();
  const [activeTab, setActiveTab] = useState<DashboardTab>(layout.defaultTab);
  const { canAccessTab, loading } = useFeatures();
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const { isCustomDesignerEnabled, isProductionTrackingEnabled } = useEnterpriseFeatures();
  const { runTour, completeTour, isLoading: tourLoading } = useOnboardingTour();
  const branding = useBranding();
  const applyBranding = useApplyTenantBranding();

  // Apply tenant branding globally when in dashboard
  useEffect(() => {
    applyBranding({
      companyName: branding.companyName,
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor: branding.accentColor,
      tagline: branding.tagline,
      slogan: branding.slogan,
      isWhiteLabel: branding.isWhiteLabel,
    });
  }, [
    branding.companyName,
    branding.logoUrl,
    branding.primaryColor,
    branding.secondaryColor,
    branding.accentColor,
    branding.tagline,
    branding.slogan,
    branding.isWhiteLabel,
    applyBranding,
  ]);

  // Generate dynamic CSS variables from tenant branding (local fallback)
  const brandingStyles = useMemo(() => ({
    '--brand-primary': branding.primaryColor,
    '--brand-secondary': branding.secondaryColor,
    '--brand-accent': branding.accentColor,
  } as React.CSSProperties), [branding.primaryColor, branding.secondaryColor, branding.accentColor]);

  // Route protection: redirect to dashboard if user tries to access disabled feature
  useEffect(() => {
    if (loading) return;
    
    // Super admin can access platform-admin tab
    if (activeTab === "platform-admin" && !isSuperAdmin) {
      toast({
        title: "Access denied",
        description: "You don't have permission to access this section.",
        variant: "destructive",
      });
      setActiveTab("dashboard");
      return;
    }

    // Enterprise feature gating for custom workflow tabs
    if (activeTab === "custom-orders" && !isCustomDesignerEnabled) {
      toast({
        title: "Feature not available",
        description: "The Custom Design Wizard is an exclusive feature for authorized tenants.",
        variant: "destructive",
      });
      setActiveTab("dashboard");
      return;
    }

    if (activeTab === "production-floor" && !isCustomDesignerEnabled && !isProductionTrackingEnabled) {
      toast({
        title: "Feature not available",
        description: "The Production Floor is an exclusive feature for authorized tenants.",
        variant: "destructive",
      });
      setActiveTab("dashboard");
      return;
    }
    
    if (activeTab !== "platform-admin" && !canAccessTab(activeTab)) {
      toast({
        title: "Feature not available",
        description: "This feature is not enabled for your organization.",
        variant: "destructive",
      });
      setActiveTab("dashboard");
    }
  }, [activeTab, canAccessTab, loading, toast, isSuperAdmin, isCustomDesignerEnabled, isProductionTrackingEnabled]);

  // Safe tab setter that checks feature access
  const handleSetActiveTab = (tab: DashboardTab) => {
    // Super admin can access platform-admin
    if (tab === "platform-admin") {
      if (isSuperAdmin) {
        setActiveTab(tab);
      } else {
        toast({
          title: "Access denied",
          description: "You don't have permission to access this section.",
          variant: "destructive",
        });
      }
      return;
    }
    
    if (canAccessTab(tab)) {
      setActiveTab(tab);
    } else {
      toast({
        title: "Feature not available",
        description: "This feature is not enabled for your organization.",
        variant: "destructive",
      });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardHome setActiveTab={handleSetActiveTab} />;
      case "sales":
        return <SalesRecorder />;
      case "receipts":
        return <ReceiptsManager />;
      case "accounts":
        return <AccountsAgent />;
      case "hr":
        return <HRAgent />;
      case "inventory":
        return <InventoryAgent />;
      case "shop":
        return <ShopManager />;
      case "agents":
        return <AgentsManager />;
      case "communities":
        return <WASHForumsManagement />;
      case "messages":
        return <CommunityMessagesManagement />;
      case "contacts":
        return <WebsiteContactsManagement />;
      case "website":
        return <WebsiteManager />;
      case "settings":
        return <SettingsManager />;
      case "tenant-settings":
        return <TenantSettings />;
      case "modules":
        return <ModulesMarketplace />;
      case "platform-admin":
        return <SuperAdminPanel />;
      case "branches":
        return <BranchesManager />;
      case "returns":
        return <ReturnsAndDamagesManager />;
      case "customers":
        return <CustomersManager />;
      case "custom-orders":
        return <CustomOrdersManager />;
      case "warehouse":
        return <WarehouseView />;
      case "stock-transfers":
        return <StockTransfersManager />;
      case "locations":
        return <LocationsManager />;
      case "production-floor":
        return <ProductionFloor />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <BranchProvider>
      <SidebarProvider>
        <div 
          className="min-h-screen flex w-full bg-gradient-to-br from-brand-bg-light to-brand-bg-dark"
          style={brandingStyles}
        >
          <DashboardSidebar activeTab={activeTab} setActiveTab={handleSetActiveTab} />
          <div className="flex-1 flex flex-col">
            <DashboardHeader />
            <main className="flex-1 p-6 overflow-auto">
              {renderContent()}
            </main>
          </div>
        </div>
        
        {/* Onboarding Tour */}
        {!tourLoading && (
          <OnboardingTour run={runTour} onComplete={completeTour} />
        )}
        
        {/* AI Advisor Chat */}
        <OmanutAdvisor />
      </SidebarProvider>
    </BranchProvider>
  );
};

export default Dashboard;
