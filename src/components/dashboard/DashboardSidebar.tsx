import { Package, DollarSign, LayoutDashboard, Settings, HelpCircle, Users, Shield, MessageSquare, Globe, ShoppingCart, Store, Heart, Receipt, Mail } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import type { DashboardTab } from "@/pages/Dashboard";
import finchLogo from "@/assets/finch-logo.png";

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
}

const menuItems = [
  { id: "dashboard" as DashboardTab, title: "Dashboard", icon: LayoutDashboard },
  { id: "sales" as DashboardTab, title: "Sales", icon: ShoppingCart },
  { id: "receipts" as DashboardTab, title: "Receipts", icon: Receipt },
  { id: "accounts" as DashboardTab, title: "Accounts", icon: DollarSign },
  { id: "hr" as DashboardTab, title: "HR & Payroll", icon: Users },
  { id: "agents" as DashboardTab, title: "Agents", icon: Users },
  { id: "inventory" as DashboardTab, title: "Inventory", icon: Package },
  { id: "shop" as DashboardTab, title: "Shop Manager", icon: Store },
  { id: "communities" as DashboardTab, title: "Communities", icon: Heart },
  { id: "messages" as DashboardTab, title: "Community Messages", icon: MessageSquare },
  { id: "contacts" as DashboardTab, title: "Website Contacts", icon: Mail },
  { id: "website" as DashboardTab, title: "Website", icon: Globe },
];

const adminItems = [
  { id: "settings" as DashboardTab, title: "Access Control", icon: Shield },
];

export function DashboardSidebar({ activeTab, setActiveTab }: DashboardSidebarProps) {
  const { isAdmin } = useAuth();

  return (
    <Sidebar className="border-r border-[#003366]/30 bg-gradient-to-b from-[#004B8D] to-[#003366]">
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={finchLogo} alt="Finch" className="h-10 w-auto rounded-lg" />
          <div>
            <h1 className="font-display font-bold text-white text-lg">Finch BMS</h1>
            <p className="text-xs text-white/60">Business Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 uppercase text-xs tracking-wider mb-2">
            Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full justify-start gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      activeTab === item.id
                        ? "bg-white text-[#004B8D] shadow-md"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-white/50 uppercase text-xs tracking-wider mb-2">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full justify-start gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        activeTab === item.id
                          ? "bg-[#0077B6] text-white shadow-md"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => setActiveTab("settings")}
              className={`w-full justify-start gap-3 px-3 py-2 rounded-lg transition-all ${
                activeTab === "settings"
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="w-full justify-start gap-3 px-3 py-2 text-white/60 hover:bg-white/10 hover:text-white rounded-lg">
              <HelpCircle className="w-4 h-4" />
              <span>Help & Support</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarTrigger className="mt-4 w-full text-white/60 hover:text-white" />
      </SidebarFooter>
    </Sidebar>
  );
}
