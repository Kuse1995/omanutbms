import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { InventoryAgent } from "@/components/dashboard/InventoryAgent";
import { AccountsAgent } from "@/components/dashboard/AccountsAgent";
import { HRAgent } from "@/components/dashboard/HRAgent";
import { SettingsManager } from "@/components/dashboard/SettingsManager";
import { CommunityMessagesManagement } from "@/components/dashboard/CommunityMessagesManagement";
import { WebsiteManager } from "@/components/dashboard/WebsiteManager";
import { SalesRecorder } from "@/components/dashboard/SalesRecorder";
import { ShopManager } from "@/components/dashboard/ShopManager";
import { WASHForumsManagement } from "@/components/dashboard/WASHForumsManagement";
import { ReceiptsManager } from "@/components/dashboard/ReceiptsManager";
import { AgentsManager } from "@/components/dashboard/AgentsManager";
import { WebsiteContactsManagement } from "@/components/dashboard/WebsiteContactsManagement";

export type DashboardTab = "dashboard" | "sales" | "receipts" | "accounts" | "hr" | "inventory" | "shop" | "agents" | "communities" | "messages" | "contacts" | "website" | "settings";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardHome />;
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
      default:
        return <DashboardHome />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-[#f0f7fa] to-[#e8f4f8]">
        <DashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
