import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { PoweredByFooter } from "@/components/dashboard/PoweredByFooter";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import { WelcomeVideoModal } from "@/components/dashboard/WelcomeVideoModal";
import { BusinessTypeSetupWizard } from "@/components/dashboard/BusinessTypeSetupWizard";
import { SubscriptionActivationGate } from "@/components/dashboard/SubscriptionActivationGate";
import { Loader2 } from "lucide-react";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { useFeatures } from "@/hooks/useFeatures";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEnterpriseFeatures } from "@/hooks/useEnterpriseFeatures";
import { BranchProvider } from "@/hooks/useBranch";
import { useTenant } from "@/hooks/useTenant";
import { useBranding } from "@/hooks/useBranding";
import { useApplyTenantBranding } from "@/contexts/BrandingContext";
import { useTrackedNavigation } from "@/hooks/useTrackedNavigation";

// Lazy-loaded tab components
const InventoryAgent = lazy(() => import("@/components/dashboard/InventoryAgent").then(m => ({ default: m.InventoryAgent })));
const AccountsAgent = lazy(() => import("@/components/dashboard/AccountsAgent").then(m => ({ default: m.AccountsAgent })));
const HRAgent = lazy(() => import("@/components/dashboard/HRAgent").then(m => ({ default: m.HRAgent })));
const SettingsManager = lazy(() => import("@/components/dashboard/SettingsManager").then(m => ({ default: m.SettingsManager })));
const TenantSettings = lazy(() => import("@/components/dashboard/TenantSettings").then(m => ({ default: m.TenantSettings })));
const ModulesMarketplace = lazy(() => import("@/components/dashboard/ModulesMarketplace").then(m => ({ default: m.ModulesMarketplace })));
const CommunityMessagesManagement = lazy(() => import("@/components/dashboard/CommunityMessagesManagement").then(m => ({ default: m.CommunityMessagesManagement })));
const WebsiteManager = lazy(() => import("@/components/dashboard/WebsiteManager").then(m => ({ default: m.WebsiteManager })));
const SalesRecorder = lazy(() => import("@/components/dashboard/SalesRecorder").then(m => ({ default: m.SalesRecorder })));
const ShopManager = lazy(() => import("@/components/dashboard/ShopManager").then(m => ({ default: m.ShopManager })));
const WASHForumsManagement = lazy(() => import("@/components/dashboard/WASHForumsManagement").then(m => ({ default: m.WASHForumsManagement })));
const ReceiptsManager = lazy(() => import("@/components/dashboard/ReceiptsManager").then(m => ({ default: m.ReceiptsManager })));
const AgentsManager = lazy(() => import("@/components/dashboard/AgentsManager").then(m => ({ default: m.AgentsManager })));
const QuotationsManager = lazy(() => import("@/components/dashboard/QuotationsManager").then(m => ({ default: m.QuotationsManager })));
const WebsiteContactsManagement = lazy(() => import("@/components/dashboard/WebsiteContactsManagement").then(m => ({ default: m.WebsiteContactsManagement })));
const SuperAdminPanel = lazy(() => import("@/components/dashboard/SuperAdminPanel").then(m => ({ default: m.SuperAdminPanel })));
const BranchesManager = lazy(() => import("@/components/dashboard/BranchesManager").then(m => ({ default: m.BranchesManager })));
const ReturnsAndDamagesManager = lazy(() => import("@/components/dashboard/ReturnsAndDamagesManager").then(m => ({ default: m.ReturnsAndDamagesManager })));
const CustomersManager = lazy(() => import("@/components/dashboard/CustomersManager").then(m => ({ default: m.CustomersManager })));
const CustomOrdersManager = lazy(() => import("@/components/dashboard/CustomOrdersManager").then(m => ({ default: m.CustomOrdersManager })));
const LocationsManager = lazy(() => import("@/components/dashboard/LocationsManager").then(m => ({ default: m.LocationsManager })));
const StockTransfersManager = lazy(() => import("@/components/dashboard/StockTransfersManager").then(m => ({ default: m.StockTransfersManager })));
const WarehouseView = lazy(() => import("@/components/dashboard/WarehouseView").then(m => ({ default: m.WarehouseView })));
const ProductionFloor = lazy(() => import("@/components/dashboard/ProductionFloor").then(m => ({ default: m.ProductionFloor })));
const AssetsManager = lazy(() => import("@/components/dashboard/AssetsManager").then(m => ({ default: m.AssetsManager })));
const JobCardsManager = lazy(() => import("@/components/dashboard/JobCardsManager").then(m => ({ default: m.JobCardsManager })));

export type DashboardTab = "dashboard" | "sales" | "receipts" | "quotations" | "accounts" | "assets" | "hr" | "inventory" | "shop" | "agents" | "communities" | "messages" | "contacts" | "website" | "settings" | "tenant-settings" | "modules" | "platform-admin" | "branches" | "returns" | "customers" | "custom-orders" | "warehouse" | "stock-transfers" | "locations" | "production-floor" | "job-cards";

const validTabs: DashboardTab[] = ["dashboard", "sales", "receipts", "quotations", "accounts", "assets", "hr", "inventory", "shop", "agents", "communities", "messages", "contacts", "website", "settings", "tenant-settings", "modules", "platform-admin", "branches", "returns", "customers", "custom-orders", "warehouse", "stock-transfers", "locations", "production-floor", "job-cards"];

// Heavy tabs that stay mounted (CSS hidden) once visited for instant switch-back
const PERSISTENT_TABS: DashboardTab[] = ["inventory", "sales", "accounts", "hr", "shop"];

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { layout, loading: configLoading } = useBusinessConfig();
  
  const getInitialTab = (): DashboardTab => {
    const urlTab = searchParams.get("tab") as DashboardTab;
    if (urlTab && validTabs.includes(urlTab)) {
      return urlTab;
    }
    return layout.defaultTab;
  };
  
  const [activeTab, setActiveTab] = useState<DashboardTab>(getInitialTab());
  const { canAccessTab, loading } = useFeatures();
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const { isCustomDesignerEnabled, isProductionTrackingEnabled } = useEnterpriseFeatures();
  const { runTour, completeTour, isLoading: tourLoading, welcomeVideoCompleted, onWelcomeVideoComplete } = useOnboardingTour();
  const { businessProfile, tenantUser, refetchTenant } = useTenant();
  const branding = useBranding();
  const applyBranding = useApplyTenantBranding();
  const { trackAction } = useTrackedNavigation({ activeTab });

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
    branding.companyName, branding.logoUrl, branding.primaryColor,
    branding.secondaryColor, branding.accentColor, branding.tagline,
    branding.slogan, branding.isWhiteLabel, applyBranding,
  ]);

  const brandingStyles = useMemo(() => ({
    '--brand-primary': branding.primaryColor,
    '--brand-secondary': branding.secondaryColor,
    '--brand-accent': branding.accentColor,
  } as React.CSSProperties), [branding.primaryColor, branding.secondaryColor, branding.accentColor]);

  useEffect(() => {
    const urlTab = searchParams.get("tab") as DashboardTab;
    if (urlTab && validTabs.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const currentUrlTab = searchParams.get("tab");
    if (activeTab !== "dashboard" && currentUrlTab !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    } else if (activeTab === "dashboard" && currentUrlTab) {
      setSearchParams({}, { replace: true });
    }
  }, [activeTab, setSearchParams]);

  useEffect(() => {
    if (loading) return;
    
    if (activeTab === "platform-admin" && !isSuperAdmin) {
      toast({ title: "Access denied", description: "You don't have permission to access this section.", variant: "destructive" });
      setActiveTab("dashboard");
      return;
    }

    if (activeTab === "custom-orders" && !isCustomDesignerEnabled) {
      toast({ title: "Feature not available", description: "The Custom Design Wizard is an exclusive feature for authorized tenants.", variant: "destructive" });
      setActiveTab("dashboard");
      return;
    }

    if (activeTab === "production-floor" && !isCustomDesignerEnabled && !isProductionTrackingEnabled) {
      toast({ title: "Feature not available", description: "The Production Floor is an exclusive feature for authorized tenants.", variant: "destructive" });
      setActiveTab("dashboard");
      return;
    }
    
    if (activeTab !== "platform-admin" && !canAccessTab(activeTab)) {
      toast({ title: "Feature not available", description: "This feature is not enabled for your organization.", variant: "destructive" });
      setActiveTab("dashboard");
    }
  }, [activeTab, canAccessTab, loading, toast, isSuperAdmin, isCustomDesignerEnabled, isProductionTrackingEnabled]);

  const handleSetActiveTab = (tab: DashboardTab) => {
    if (tab === "platform-admin") {
      if (isSuperAdmin) {
        setActiveTab(tab);
      } else {
        toast({ title: "Access denied", description: "You don't have permission to access this section.", variant: "destructive" });
      }
      return;
    }
    
    if (canAccessTab(tab)) {
      setActiveTab(tab);
    } else {
      toast({ title: "Feature not available", description: "This feature is not enabled for your organization.", variant: "destructive" });
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
      case "quotations":
        return <QuotationsManager />;
      case "accounts":
        return <AccountsAgent />;
      case "assets":
        return <AssetsManager />;
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
      case "job-cards":
        return <JobCardsManager />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <>
      <BranchProvider>
        <SidebarProvider>
          <div 
            className="min-h-screen flex w-full bg-gradient-to-br from-brand-bg-light to-brand-bg-dark"
            style={brandingStyles}
          >
            <DashboardSidebar activeTab={activeTab} setActiveTab={handleSetActiveTab} />
            <div className="flex-1 flex flex-col">
              <DashboardHeader />
              <main className="flex-1 p-3 sm:p-6 overflow-auto">
                <Suspense fallback={<TabFallback />}>
                  {renderContent()}
                </Suspense>
              </main>
            </div>
          </div>
          
          {!businessProfile?.onboarding_completed && tenantUser?.is_owner === true && (
            <BusinessTypeSetupWizard onComplete={refetchTenant} />
          )}
          
          {businessProfile?.onboarding_completed && 
           businessProfile?.billing_status === 'inactive' && 
           tenantUser?.is_owner === true && (
            <SubscriptionActivationGate />
          )}
          
          {!tourLoading && !welcomeVideoCompleted && businessProfile?.onboarding_completed && (
            <WelcomeVideoModal onComplete={onWelcomeVideoComplete} />
          )}
          
          {!tourLoading && welcomeVideoCompleted && businessProfile?.onboarding_completed && (
            <OnboardingTour run={runTour} onComplete={completeTour} />
          )}
        </SidebarProvider>
      </BranchProvider>
    </>
  );
};

export default Dashboard;
