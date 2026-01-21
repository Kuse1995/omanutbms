import { 
  Package, DollarSign, LayoutDashboard, Settings, HelpCircle, Users, Shield, 
  MessageSquare, Globe, ShoppingCart, Store, Heart, Receipt, Mail, Building2, 
  Layers, Crown, LogOut, Truck, GraduationCap, Briefcase, GitBranch, RotateCcw, 
  Scissors, UserCircle, Shirt, Warehouse, ArrowLeftRight, MapPin, Factory, type LucideIcon 
} from "lucide-react";
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
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { useTenant } from "@/hooks/useTenant";
import { PoweredByFooter } from "./PoweredByFooter";
import type { DashboardTab } from "@/pages/Dashboard";
import type { FeatureKey } from "@/lib/feature-config";
import { Skeleton } from "@/components/ui/skeleton";
import { hasModuleAccess, type ModuleKey } from "@/lib/role-config";

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
}

interface MenuItem {
  id: DashboardTab;
  title: string;
  icon: LucideIcon;
  feature: FeatureKey | null;
  dynamicTitle?: 'sales' | 'inventory';
}

// Icon mapping for dashboard icons from config
const iconMap: Record<string, LucideIcon> = {
  Truck,
  Store,
  GraduationCap,
  Heart,
  Briefcase,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  DollarSign,
  Users,
  MessageSquare,
  Globe,
  Mail,
  Shield,
  Building2,
  Layers,
  Crown,
  RotateCcw,
  Scissors,
  UserCircle,
  Shirt,
  Warehouse,
  ArrowLeftRight,
  MapPin,
  Factory,
};

const adminItems: { id: DashboardTab; title: string; icon: LucideIcon; requiresMultiBranch?: boolean }[] = [
  { id: "branches", title: "Branches", icon: GitBranch, requiresMultiBranch: true },
  { id: "settings", title: "Access Control", icon: Shield },
  { id: "tenant-settings", title: "Tenant Settings", icon: Building2 },
  { id: "modules", title: "Modules & Plans", icon: Layers },
];

// Base menu items with feature requirements
const baseMenuItems: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard, feature: null },
  { id: "sales", title: "Sales", icon: ShoppingCart, feature: null, dynamicTitle: 'sales' },
  { id: "receipts", title: "Receipts", icon: Receipt, feature: null },
  { id: "accounts", title: "Accounts", icon: DollarSign, feature: null },
  { id: "hr", title: "HR & Payroll", icon: Users, feature: 'payroll' },
  { id: "agents", title: "Agents", icon: Users, feature: 'agents' },
  { id: "inventory", title: "Inventory", icon: Package, feature: 'inventory', dynamicTitle: 'inventory' },
  { id: "returns", title: "Returns & Damages", icon: RotateCcw, feature: 'inventory' },
  { id: "custom-orders", title: "Custom Orders", icon: Scissors, feature: 'inventory' },
  { id: "customers", title: "Customers", icon: UserCircle, feature: 'inventory' },
  { id: "shop", title: "Shop Manager", icon: Store, feature: 'inventory' },
  { id: "warehouse", title: "Warehouse", icon: Warehouse, feature: 'warehouse' },
  { id: "stock-transfers", title: "Stock Transfers", icon: ArrowLeftRight, feature: 'warehouse' },
  { id: "locations", title: "Locations", icon: MapPin, feature: 'warehouse' },
  { id: "communities", title: "Communities", icon: Heart, feature: 'impact' },
  { id: "messages", title: "Community Messages", icon: MessageSquare, feature: 'impact' },
  { id: "contacts", title: "Website Contacts", icon: Mail, feature: 'website' },
  { id: "website", title: "Website", icon: Globe, feature: 'website' },
  { id: "production-floor", title: "Production Floor", icon: Factory, feature: 'inventory' },
];

export function DashboardSidebar({ activeTab, setActiveTab }: DashboardSidebarProps) {
  const { isAdmin, isSuperAdmin, signOut, role } = useAuth();
  const { features, terminology, loading, companyName } = useFeatures();
  const { logoUrl, primaryColor, tagline } = useBranding();
  const { layout, businessType } = useBusinessConfig();
  const { businessProfile } = useTenant();
  const navigate = useNavigate();
  
  const isMultiBranchEnabled = businessProfile?.multi_branch_enabled ?? false;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // Get menu items ordered and filtered by business type layout and role
  const getOrderedMenuItems = (): MenuItem[] => {
    const { tabOrder, hiddenTabs } = layout;
    
    // Filter out hidden tabs, items without enabled features, and items user doesn't have role access to
    const visibleItems = baseMenuItems.filter(item => {
      // Check if tab is hidden by business type
      if (hiddenTabs.includes(item.id)) return false;
      // Check if feature is enabled
      if (item.feature && !features[item.feature]) return false;
      // Check role-based access
      if (!hasModuleAccess(role, item.id as ModuleKey)) return false;
      return true;
    });

    // Sort by tab order from layout config
    return visibleItems.sort((a, b) => {
      const aIndex = tabOrder.indexOf(a.id);
      const bIndex = tabOrder.indexOf(b.id);

      // Items not in tabOrder go to the end (keep their relative order)
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  };

  // Apply dynamic titles based on terminology
  const getItemTitle = (item: MenuItem): string => {
    if (item.dynamicTitle === 'sales') return terminology.salesLabel;
    if (item.dynamicTitle === 'inventory') return terminology.inventoryLabel;
    return item.title;
  };

  // Get dashboard icon from layout config
  const DashboardIcon = iconMap[layout.dashboardIcon] || LayoutDashboard;

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

  const orderedMenuItems = getOrderedMenuItems();

  return (
    <Sidebar className="border-r border-[#003366]/30 bg-gradient-to-b from-[#004B8D] to-[#003366]" data-tour="sidebar">
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName || 'Company'} className="h-10 w-10 rounded-lg object-contain bg-white/10" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center text-white">
              <DashboardIcon className="h-5 w-5" />
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
              {orderedMenuItems.map((item) => (
                <SidebarMenuItem key={item.id} data-tour={`${item.id}-nav`}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full justify-start gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      activeTab === item.id
                        ? "bg-white text-[#004B8D] shadow-md"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{getItemTitle(item)}</span>
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
                {adminItems
                  .filter(item => !item.requiresMultiBranch || isMultiBranchEnabled)
                  .map((item) => (
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
          <SidebarMenuItem data-tour="settings-nav">
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