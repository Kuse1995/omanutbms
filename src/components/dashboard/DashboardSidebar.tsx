import { Package, DollarSign, LayoutDashboard, Settings, HelpCircle, Users, Shield, MessageSquare, Globe, ShoppingCart, Store, Heart, Receipt, Mail, Building2, Layers, Crown, LogOut } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { useBranding } from "@/hooks/useBranding";
import { PoweredByFooter } from "./PoweredByFooter";
import type { DashboardTab } from "@/pages/Dashboard";
import type { FeatureKey } from "@/lib/feature-config";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
}

interface MenuItem {
  id: DashboardTab;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  feature: FeatureKey | null;
  dynamicTitle?: 'sales';
}

const adminItems = [
  { id: "settings" as DashboardTab, title: "Access Control", icon: Shield },
  { id: "tenant-settings" as DashboardTab, title: "Tenant Settings", icon: Building2 },
  { id: "modules" as DashboardTab, title: "Modules & Plans", icon: Layers },
];

export function DashboardSidebar({ activeTab, setActiveTab }: DashboardSidebarProps) {
  const { isAdmin, isSuperAdmin, signOut } = useAuth();
  const { features, terminology, loading, companyName } = useFeatures();
  const { logoUrl, primaryColor, tagline } = useBranding();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // Define menu items with feature requirements
  const menuItems: MenuItem[] = [
    { id: "dashboard", title: "Dashboard", icon: LayoutDashboard, feature: null },
    { id: "sales", title: terminology.salesLabel, icon: ShoppingCart, feature: null, dynamicTitle: 'sales' },
    { id: "receipts", title: "Receipts", icon: Receipt, feature: null },
    { id: "accounts", title: "Accounts", icon: DollarSign, feature: null },
    { id: "hr", title: "HR & Payroll", icon: Users, feature: 'payroll' },
    { id: "agents", title: "Agents", icon: Users, feature: 'agents' },
    { id: "inventory", title: terminology.inventoryLabel, icon: Package, feature: 'inventory' },
    { id: "shop", title: "Shop Manager", icon: Store, feature: 'inventory' },
    { id: "communities", title: "Communities", icon: Heart, feature: 'impact' },
    { id: "messages", title: "Community Messages", icon: MessageSquare, feature: 'impact' },
    { id: "contacts", title: "Website Contacts", icon: Mail, feature: 'website' },
    { id: "website", title: "Website", icon: Globe, feature: 'website' },
  ];

  // Filter menu items based on enabled features
  const visibleMenuItems = menuItems.filter(
    (item) => !item.feature || features[item.feature]
  );

  // Show skeleton while loading to prevent flash of content
  if (loading) {
    return (
      <Sidebar className="border-r border-[#003366]/30 bg-gradient-to-b from-[#004B8D] to-[#003366]">
        <SidebarHeader className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg bg-white/20" />
            <div>
              <Skeleton className="h-5 w-24 bg-white/20 mb-1" />
              <Skeleton className="h-3 w-32 bg-white/20" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 py-4">
          <SidebarGroup>
            <SidebarGroupLabel className="text-white/50 uppercase text-xs tracking-wider mb-2">
              Modules
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg bg-white/10" />
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r border-[#003366]/30 bg-gradient-to-b from-[#004B8D] to-[#003366]">
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName || 'Company'} className="h-10 w-10 rounded-lg object-contain bg-white/10" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-lg">
              {(companyName || 'O').charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-display font-bold text-white text-lg">
              {companyName || 'Omanut BMS'}
            </h1>
            <p className="text-xs text-white/60">{tagline || 'Business Management'}</p>
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
              {visibleMenuItems.map((item) => (
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

        {/* Super Admin Section */}
        {isSuperAdmin && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-amber-400/80 uppercase text-xs tracking-wider mb-2">
              Platform Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setActiveTab("platform-admin")}
                    className={`w-full justify-start gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      activeTab === "platform-admin"
                        ? "bg-amber-500 text-white shadow-md"
                        : "text-amber-400/80 hover:bg-amber-500/20 hover:text-amber-300"
                    }`}
                  >
                    <Crown className="w-5 h-5" />
                    <span className="font-medium">Manage Tenants</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleSignOut}
              className="w-full justify-start gap-3 px-3 py-2 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <PoweredByFooter className="mt-4" variant="light" />
      </SidebarFooter>
    </Sidebar>
  );
}
