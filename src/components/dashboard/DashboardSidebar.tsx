import { useState, useEffect } from "react";
import { 
  Package, DollarSign, LayoutDashboard, Settings, HelpCircle, Users, Shield, 
  MessageSquare, Globe, ShoppingCart, Store, Heart, Receipt, Mail, Building2, 
  Layers, Crown, LogOut, Truck, GraduationCap, Briefcase, GitBranch, RotateCcw, 
  Scissors, UserCircle, Shirt, Warehouse, ArrowLeftRight, MapPin, Factory, 
  ChevronDown, Landmark, type LucideIcon 
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { useBranding } from "@/hooks/useBranding";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { useTenant } from "@/hooks/useTenant";
import { useEnterpriseFeatures } from "@/hooks/useEnterpriseFeatures";
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

interface MenuCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  items: DashboardTab[];
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
  Landmark,
};

// Category definitions for organized navigation
const menuCategories: MenuCategory[] = [
  {
    id: 'sales-finance',
    label: 'Sales & Finance',
    icon: DollarSign,
    items: ['sales', 'receipts', 'accounts', 'assets'],
  },
  {
    id: 'inventory-stock',
    label: 'Inventory & Stock',
    icon: Package,
    items: ['inventory', 'returns', 'shop', 'warehouse', 'stock-transfers', 'locations'],
  },
  {
    id: 'custom-workflow',
    label: 'Custom Workflow',
    icon: Scissors,
    items: ['custom-orders', 'production-floor', 'customers'],
  },
  {
    id: 'team-hr',
    label: 'Team',
    icon: Users,
    items: ['hr', 'agents'],
  },
  {
    id: 'community-web',
    label: 'Community & Web',
    icon: Globe,
    items: ['communities', 'messages', 'website', 'contacts'],
  },
];

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
  { id: "assets", title: "Assets", icon: Landmark, feature: null },
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
  const { isCustomDesignerEnabled, isProductionTrackingEnabled } = useEnterpriseFeatures();
  const navigate = useNavigate();
  
  const isMultiBranchEnabled = businessProfile?.multi_branch_enabled ?? false;

  // Track which categories are open
  const [openCategories, setOpenCategories] = useState<string[]>(['sales-finance']);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // Get menu items ordered and filtered by business type layout and role
  const getVisibleMenuItems = (): MenuItem[] => {
    const { tabOrder, hiddenTabs } = layout;
    
    // Filter out hidden tabs, items without enabled features, and items user doesn't have role access to
    return baseMenuItems.filter(item => {
      // Check if tab is hidden by business type
      if (hiddenTabs.includes(item.id)) return false;
      // Check if feature is enabled
      if (item.feature && !features[item.feature]) return false;
      // Check role-based access
      if (!hasModuleAccess(role, item.id as ModuleKey)) return false;
      // Check enterprise feature gating for custom workflow tabs
      // Hide entire "Custom Workflow" category for non-authorized tenants
      if (item.id === 'custom-orders' && !isCustomDesignerEnabled) return false;
      if (item.id === 'production-floor' && !isCustomDesignerEnabled && !isProductionTrackingEnabled) return false;
      // "Customers" is part of custom workflow, so hide it too if the workflow isn't enabled
      if (item.id === 'customers' && !isCustomDesignerEnabled) return false;
      return true;
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

  const visibleMenuItems = getVisibleMenuItems();

  // Get visible items for a category
  const getCategoryItems = (category: MenuCategory): MenuItem[] => {
    return visibleMenuItems.filter(item => category.items.includes(item.id));
  };

  // Get visible categories (only those with at least one visible item)
  const getVisibleCategories = (): MenuCategory[] => {
    return menuCategories.filter(category => getCategoryItems(category).length > 0);
  };

  // Find which category contains the active tab
  const findActiveCategory = (): string | null => {
    for (const category of menuCategories) {
      if (category.items.includes(activeTab)) {
        return category.id;
      }
    }
    return null;
  };

  // Auto-expand category when active tab changes
  useEffect(() => {
    const activeCategory = findActiveCategory();
    if (activeCategory && !openCategories.includes(activeCategory)) {
      setOpenCategories(prev => [...prev, activeCategory]);
    }
  }, [activeTab]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Dashboard item (always visible at top)
  const dashboardItem = visibleMenuItems.find(item => item.id === 'dashboard');

  // Show skeleton while loading to prevent flash of content
  if (loading) {
    return (
      <Sidebar className="border-r border-sidebar-border bg-gradient-to-b from-[var(--brand-primary,#004B8D)] to-[var(--brand-secondary,#003366)]">
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

  const visibleCategories = getVisibleCategories();

  return (
    <Sidebar className="border-r border-sidebar-border bg-gradient-to-b from-[var(--brand-primary,#004B8D)] to-[var(--brand-secondary,#003366)]" data-tour="sidebar">
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
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard - Always visible at top */}
              {dashboardItem && (
                <SidebarMenuItem data-tour="dashboard-nav">
                  <SidebarMenuButton
                    onClick={() => setActiveTab(dashboardItem.id)}
                    className={`w-full justify-start gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      activeTab === dashboardItem.id
                        ? "bg-white text-[var(--brand-primary,#004B8D)] shadow-md"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <dashboardItem.icon className="w-5 h-5" />
                    <span className="font-medium">{getItemTitle(dashboardItem)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Collapsible Categories */}
              {visibleCategories.map((category) => {
                const categoryItems = getCategoryItems(category);
                const isOpen = openCategories.includes(category.id);
                const hasActiveItem = categoryItems.some(item => item.id === activeTab);

                return (
                  <Collapsible
                    key={category.id}
                    open={isOpen}
                    onOpenChange={() => toggleCategory(category.id)}
                    className="group/collapsible"
                    data-tour={`category-${category.id}`}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={`w-full justify-between gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            hasActiveItem && !isOpen
                              ? "bg-white/20 text-white"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <category.icon className="w-5 h-5" />
                            <span className="font-medium">{category.label}</span>
                          </div>
                          <ChevronDown 
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`} 
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                        <SidebarMenuSub className="ml-4 border-l border-white/20 pl-2 mt-1">
                          {categoryItems.map((item) => (
                            <SidebarMenuSubItem key={item.id} data-tour={`${item.id}-nav`}>
                              <SidebarMenuSubButton
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full justify-start gap-3 px-3 py-2 rounded-lg transition-all text-sm ${
                                  activeTab === item.id
                                    ? "bg-white text-[var(--brand-primary,#004B8D)] shadow-md"
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <item.icon className="w-4 h-4" />
                                <span>{getItemTitle(item)}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup className="mt-4" data-tour="admin-section">
            <SidebarGroupLabel className="text-white/50 uppercase text-xs tracking-wider mb-2">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems
                  .filter(item => !item.requiresMultiBranch || isMultiBranchEnabled)
                  .map((item) => (
                  <SidebarMenuItem key={item.id} data-tour={item.id === 'modules' ? 'modules-nav' : undefined}>
                    <SidebarMenuButton
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full justify-start gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        activeTab === item.id
                          ? "bg-[var(--brand-secondary,#0077B6)] text-white shadow-md"
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
