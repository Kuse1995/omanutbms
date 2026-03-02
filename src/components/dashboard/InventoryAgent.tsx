import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Package, AlertTriangle, RefreshCw, Mail, Loader2, Plus, Pencil, FileUp, Download, Palette, Ruler, ImageIcon, Building2, PackagePlus, Archive, ArchiveRestore, Eye, EyeOff, ChevronDown, Trash2, MapPin, Search, X, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ProductModal } from "./ProductModal";
import { InventoryImportModal } from "./InventoryImportModal";
import { ProductVariantsModal } from "./ProductVariantsModal";
import { RestockModal } from "./RestockModal";
import { StockMovementsViewer } from "./StockMovementsViewer";
import { FeatureGuard } from "./FeatureGuard";
import { useTenant } from "@/hooks/useTenant";
import { useBranch } from "@/hooks/useBranch";
import { useFeatures } from "@/hooks/useFeatures";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface TechnicalSpec {
  label: string;
  value: string;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  current_stock: number;
  wholesale_stock: number;
  unit_price: number;
  cost_price?: number;
  original_price?: number;
  reorder_level: number;
  liters_per_unit: number;
  image_url?: string | null;
  color_count?: number;
  size_count?: number;
  description?: string | null;
  highlight?: string | null;
  features?: string[] | null;
  certifications?: string[] | null;
  technical_specs?: TechnicalSpec[] | null;
  category?: string | null;
  status?: string;
  item_type?: string;
  // New classification fields
  inventory_class?: string | null;
  unit_of_measure?: string | null;
  default_location_id?: string | null;
  location_name?: string | null;
  is_archived?: boolean;
}

const ITEMS_PER_PAGE = 100;

export function InventoryAgent() {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isVariantsModalOpen, setIsVariantsModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [itemToArchive, setItemToArchive] = useState<InventoryItem | null>(null);
  const [itemToRestore, setItemToRestore] = useState<InventoryItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkArchiveDialogOpen, setBulkArchiveDialogOpen] = useState(false);
  const [bulkMoveDialogOpen, setBulkMoveDialogOpen] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"inventory" | "movements">("inventory");
  const [viewAllLocations, setViewAllLocations] = useState(false);
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { currentBranch, isMultiBranchEnabled, branches } = useBranch();
  const { terminology, currencySymbol } = useFeatures();
  const { config, businessType } = useBusinessConfig();
  const queryClient = useQueryClient();
  const formFields = config.formFields;
  const showMaterialsAndConsumables = businessType === 'fashion';

  const inventoryQueryKey = useMemo(() => [
    'inventory', tenantId, currentBranch?.id, currentPage, showArchived, classFilter, debouncedSearch, viewAllLocations
  ], [tenantId, currentBranch?.id, currentPage, showArchived, classFilter, debouncedSearch, viewAllLocations]);

  const fetchInventoryData = useCallback(async () => {
    if (!tenantId) return { inventory: [], totalCount: 0, lowStockItems: [] };
    
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const useBranchInventory = currentBranch && isMultiBranchEnabled && !viewAllLocations;

    let inventoryItems: InventoryItem[] = [];
    let total = 0;

    if (useBranchInventory) {
      const [dataResult, fallbackResult, variantsResult] = await Promise.all([
        supabase.from("branch_inventory").select(`
            id, current_stock, reserved,
            inventory:inventory_id(id, sku, name, current_stock, wholesale_stock, unit_price, cost_price, original_price, reorder_level, image_url, category, status, item_type, inventory_class, unit_of_measure, default_location_id, is_archived)
          `).eq("tenant_id", tenantId).eq("branch_id", currentBranch.id).gt("current_stock", 0),
        // Fallback: items assigned to this branch via default_location_id
        supabase.from("inventory").select(`
            id, sku, name, current_stock, wholesale_stock, unit_price, cost_price, original_price,
            reorder_level, image_url, category, status, item_type, inventory_class, unit_of_measure, default_location_id, is_archived
          `).eq("tenant_id", tenantId).eq("default_location_id", currentBranch.id).eq("is_archived", showArchived),
        supabase.from("product_variants").select("product_id, variant_type").eq("tenant_id", tenantId).eq("is_active", true),
      ]);

      if (dataResult.error) throw dataResult.error;

      const branchInvIds = new Set<string>();
      let enrichedItems = (dataResult.data || [])
        .filter((item: any) => item.inventory && item.inventory.is_archived === showArchived)
        .map((item: any) => {
          branchInvIds.add(item.inventory.id);
          return { ...item.inventory, current_stock: item.current_stock, reserved: item.reserved || item.inventory.reserved || 0, location_name: currentBranch.name };
        });

      // Merge fallback items not already in branch_inventory results
      const fallbackItems = (fallbackResult.data || [])
        .filter((item: any) => !branchInvIds.has(item.id))
        .map((item: any) => ({ ...item, reserved: item.reserved || 0, location_name: currentBranch.name }));

      // Self-healing: create missing branch_inventory records in background
      if (fallbackItems.length > 0) {
        const missingRecords = fallbackItems.map((item: any) => ({
          tenant_id: tenantId,
          branch_id: currentBranch.id,
          inventory_id: item.id,
          current_stock: item.current_stock || 0,
          reorder_level: 10,
        }));
        supabase.from("branch_inventory").upsert(missingRecords, {
          onConflict: "branch_id,inventory_id",
          ignoreDuplicates: true,
        }).then(({ error }) => {
          if (error) console.warn("Self-healing branch_inventory sync failed:", error.message);
        });
      }

      enrichedItems = [...enrichedItems, ...fallbackItems];

      if (classFilter) enrichedItems = enrichedItems.filter((item: any) => item.inventory_class === classFilter);
      if (debouncedSearch.trim()) {
        const search = debouncedSearch.trim().toLowerCase();
        enrichedItems = enrichedItems.filter((item: any) => item.name?.toLowerCase().includes(search) || (item.sku && item.sku.toLowerCase().includes(search)));
      }
      enrichedItems.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

      const variantCounts: Record<string, { colors: number; sizes: number }> = {};
      variantsResult.data?.forEach((v) => {
        if (!variantCounts[v.product_id]) variantCounts[v.product_id] = { colors: 0, sizes: 0 };
        if (v.variant_type === "color") variantCounts[v.product_id].colors++;
        if (v.variant_type === "size") variantCounts[v.product_id].sizes++;
      });

      inventoryItems = enrichedItems.map((item: any) => ({
        ...item, color_count: variantCounts[item.id]?.colors || 0, size_count: variantCounts[item.id]?.sizes || 0,
        technical_specs: item.technical_specs as unknown as TechnicalSpec[] | null,
      }));
      total = inventoryItems.length;
    } else {
      let countQuery = supabase.from("inventory").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_archived", showArchived);
      if (classFilter) countQuery = countQuery.eq("inventory_class", classFilter);
      if (debouncedSearch.trim()) { const p = `%${debouncedSearch.trim()}%`; countQuery = countQuery.or(`name.ilike.${p},sku.ilike.${p}`); }

      let dataQuery = supabase.from("inventory").select(`
          id, sku, name, current_stock, wholesale_stock, unit_price, cost_price, original_price,
          reorder_level, liters_per_unit, image_url, category, status, item_type,
          inventory_class, unit_of_measure, default_location_id, is_archived,
          color_count, size_count, description, highlight, features, certifications, technical_specs,
          branches!default_location_id(name)
        `).eq("tenant_id", tenantId).eq("is_archived", showArchived);
      if (classFilter) dataQuery = dataQuery.eq("inventory_class", classFilter);
      if (debouncedSearch.trim()) { const p = `%${debouncedSearch.trim()}%`; dataQuery = dataQuery.or(`name.ilike.${p},sku.ilike.${p}`); }

      const [countResult, dataResult, variantsResult] = await Promise.all([
        countQuery,
        dataQuery.order("name").range(from, to),
        supabase.from("product_variants").select("product_id, variant_type").eq("tenant_id", tenantId).eq("is_active", true),
      ]);

      if (dataResult.error) throw dataResult.error;
      total = countResult.count || 0;

      const variantCounts: Record<string, { colors: number; sizes: number }> = {};
      variantsResult.data?.forEach((v) => {
        if (!variantCounts[v.product_id]) variantCounts[v.product_id] = { colors: 0, sizes: 0 };
        if (v.variant_type === "color") variantCounts[v.product_id].colors++;
        if (v.variant_type === "size") variantCounts[v.product_id].sizes++;
      });

      inventoryItems = ((dataResult.data || []) as any[]).map((item) => ({
        ...item, color_count: variantCounts[item.id]?.colors || 0, size_count: variantCounts[item.id]?.sizes || 0,
        technical_specs: item.technical_specs as unknown as TechnicalSpec[] | null,
        location_name: item.branches?.name || null,
      }));
    }

    // Low stock items
    const { data: lowStockData } = await supabase
      .from("inventory").select("id, name, sku, current_stock, reorder_level, item_type, category")
      .eq("tenant_id", tenantId).eq("is_archived", false).lt("current_stock", 10);

    const serviceCategories = ['consultation', 'project', 'retainer', 'training', 'support', 'package', 'treatment', 'haircut', 'styling', 'coloring', 'spa', 'bridal', 'barbering', 'consultation_fee', 'lab_test', 'procedure', 'vaccination', 'repair', 'maintenance', 'diagnostics', 'service', 'services', 'maintenance_service'];
    const lowStock = ((lowStockData || []) as any[]).filter((item) => {
      const isService = item.item_type === 'service' || serviceCategories.includes(item.category || '');
      return !isService && item.current_stock < (item.reorder_level || 10);
    });

    return { inventory: inventoryItems, totalCount: total, lowStockItems: lowStock };
  }, [tenantId, currentBranch?.id, isMultiBranchEnabled, viewAllLocations, currentPage, showArchived, classFilter, debouncedSearch]);

  const { data: inventoryData, isLoading, isFetching: isRefreshing, refetch: fetchInventory } = useQuery({
    queryKey: inventoryQueryKey,
    queryFn: fetchInventoryData,
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000, // 2 minutes — data stays fresh, no refetch on tab switch
    gcTime: 10 * 60 * 1000, // 10 minutes — keep in cache even when unmounted
    refetchOnWindowFocus: false,
  });

  const inventory = inventoryData?.inventory || [];
  const totalCount = inventoryData?.totalCount || 0;
  const lowStockItems = inventoryData?.lowStockItems || [];
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [currentBranch?.id, showArchived, classFilter, debouncedSearch]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', tenantId] });
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: InventoryItem) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleManageVariants = (product: InventoryItem) => {
    setSelectedProduct(product);
    setIsVariantsModalOpen(true);
  };

  const handleRestock = (product: InventoryItem) => {
    setSelectedProduct(product);
    setIsRestockModalOpen(true);
  };

  const openArchiveDialog = (item: InventoryItem) => {
    setItemToRestore(null);
    setItemToArchive(item);
    setArchiveDialogOpen(true);
  };

  const openRestoreDialog = (item: InventoryItem) => {
    setItemToArchive(null);
    setItemToRestore(item);
    setArchiveDialogOpen(true);
  };

  const handleArchiveOrRestoreConfirm = async () => {
    if (!tenantId) return;
    const target = itemToArchive ?? itemToRestore;
    if (!target) return;

    const nextArchived = Boolean(itemToArchive);
    try {
      const { error } = await supabase
        .from("inventory")
        .update({ is_archived: nextArchived })
        .eq("id", target.id)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast({
        title: nextArchived ? `${terminology.productLabel} Archived` : `${terminology.productLabel} Restored`,
        description: nextArchived
          ? `${target.name} has been archived and hidden from sales.`
          : `${target.name} is active again.`,
      });
      handleRefresh();
    } catch (error: any) {
      console.error("Archive/restore error:", error);
      toast({
        title: nextArchived ? "Archive Failed" : "Restore Failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setArchiveDialogOpen(false);
      setItemToArchive(null);
      setItemToRestore(null);
    }
  };

  // Server-side filtering is applied, so visible inventory is directly from fetch
  const visibleInventory = inventory;

  // Bulk selection helpers
  const allVisibleSelected = visibleInventory.length > 0 && visibleInventory.every(item => selectedIds.has(item.id));
  const someSelected = selectedIds.size > 0;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(visibleInventory.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(itemId);
    } else {
      newSet.delete(itemId);
    }
    setSelectedIds(newSet);
  };

  const handleBulkArchive = async () => {
    if (!tenantId || selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const { error } = await supabase
        .from("inventory")
        .update({ is_archived: true })
        .in("id", Array.from(selectedIds))
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast({
        title: "Items Archived",
        description: `${selectedIds.size} ${terminology.productsLabel.toLowerCase()} archived successfully. View them using "Show Archived" toggle.`,
      });
      setSelectedIds(new Set());
      handleRefresh();
    } catch (error: any) {
      console.error("Bulk archive error:", error);
      toast({
        title: "Archive Failed",
        description: error?.message || "Could not archive items",
        variant: "destructive",
      });
    } finally {
      setIsBulkProcessing(false);
      setBulkArchiveDialogOpen(false);
    }
  };

  const handleBulkMove = async () => {
    if (!tenantId || selectedIds.size === 0 || targetBranchId === null) return;
    setIsBulkProcessing(true);
    try {
      const { error } = await supabase
        .from("inventory")
        .update({ default_location_id: targetBranchId || null })
        .in("id", Array.from(selectedIds))
        .eq("tenant_id", tenantId);

      if (error) throw error;

      const targetBranch = branches.find(b => b.id === targetBranchId);
      toast({
        title: "Items Moved",
        description: `${selectedIds.size} ${terminology.productsLabel.toLowerCase()} moved to ${targetBranch?.name || 'Central Stock'}`,
      });
      setSelectedIds(new Set());
      setTargetBranchId(null);
      handleRefresh();
    } catch (error: any) {
      console.error("Bulk move error:", error);
      toast({
        title: "Move Failed",
        description: error?.message || "Could not move items",
        variant: "destructive",
      });
    } finally {
      setIsBulkProcessing(false);
      setBulkMoveDialogOpen(false);
    }
  };

  // Check if any products have variants - hide columns if none do
  const hasAnyColors = useMemo(() => visibleInventory.some(item => (item.color_count || 0) > 0), [visibleInventory]);
  const hasAnySizes = useMemo(() => visibleInventory.some(item => (item.size_count || 0) > 0), [visibleInventory]);

  const handleExport = () => {
    // Create CSV content
    const headers = ["SKU", "Name", "Stock", "Wholesale", "Price", "Reorder Level", "Status"];
    const rows = inventory.map((item) => [
      item.sku,
      item.name,
      item.current_stock,
      item.wholesale_stock,
      item.unit_price,
      item.reorder_level,
      item.status || "active",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-export.csv";
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Inventory data has been exported to CSV",
    });
  };

  const getStockBadge = (item: InventoryItem) => {
    const isLowStock = item.current_stock < item.reorder_level;
    const isOutOfStock = item.current_stock === 0;

    if (isOutOfStock) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (isLowStock) {
      return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Low Stock</Badge>;
    }
    return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">In Stock</Badge>;
  };

  return (
    <FeatureGuard feature="inventory" featureName={terminology.inventoryLabel}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-display font-bold text-[#003366] flex items-center gap-2">
              <Package className="w-6 h-6 text-[#0077B6]" />
              {terminology.inventoryLabel} Management
            </h2>
            <p className="text-[#004B8D]/60 mt-1">
              Track and manage {terminology.productsLabel.toLowerCase()} and stock levels
            </p>
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "inventory" | "movements")} className="mr-auto ml-8">
            <TabsList>
              <TabsTrigger value="inventory" className="gap-2">
                <Package className="w-4 h-4" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="movements" className="gap-2">
                <History className="w-4 h-4" />
                Movement History
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            {isMultiBranchEnabled && (
              <div className="flex items-center gap-2 mr-2">
                <Switch
                  id="view-all-locations"
                  checked={viewAllLocations}
                  onCheckedChange={setViewAllLocations}
                />
                <Label
                  htmlFor="view-all-locations"
                  className="text-sm text-[#004B8D]/70 cursor-pointer flex items-center gap-1"
                >
                  <MapPin className="w-4 h-4" />
                  All Locations
                </Label>
              </div>
            )}
            <div className="flex items-center gap-2 mr-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
              <Label
                htmlFor="show-archived"
                className="text-sm text-[#004B8D]/70 cursor-pointer flex items-center gap-1"
              >
                {showArchived ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Show Archived
              </Label>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="border-[#004B8D]/30 text-[#004B8D] hover:bg-[#004B8D]/10"
            >
              <FileUp className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              className="border-[#004B8D]/30 text-[#004B8D] hover:bg-[#004B8D]/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={isRefreshing}
              className="border-[#004B8D]/30 text-[#004B8D] hover:bg-[#004B8D]/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={handleAddProduct}
              className="bg-[#004B8D] hover:bg-[#003366]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {terminology.productLabel}
            </Button>
          </div>
        </div>

        {/* Movement History Tab */}
        {activeTab === "movements" && (
          <StockMovementsViewer branchId={currentBranch?.id} />
        )}

        {/* Inventory Tab Content */}
        {activeTab === "inventory" && (
          <>
            {/* Low Stock Alerts - Collapsible */}
            {lowStockItems.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-700 text-sm font-medium">Low Stock Alerts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {lowStockItems.length}
                      </Badge>
                      <ChevronDown className="w-4 h-4 text-amber-600" />
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Card className="bg-amber-50/50 border-amber-200">
                    <CardContent className="pt-4">
                      <div className="flex flex-wrap gap-2">
                        {lowStockItems.map((item) => (
                          <Badge key={item.id} variant="outline" className="border-amber-500/50 text-amber-700">
                            {item.name}: {item.current_stock} left
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${terminology.productsLabel.toLowerCase()} by name or SKU...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 bg-background border-input"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips - simplified with server-side counts */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={classFilter === null ? "default" : "outline"}
            className={`cursor-pointer ${classFilter === null ? "bg-[#004B8D] text-white" : "hover:bg-[#004B8D]/10"}`}
            onClick={() => setClassFilter(null)}
          >
            {showArchived ? `Archived` : `All`} ({totalCount.toLocaleString()})
          </Badge>
          <Badge
            variant={classFilter === "finished_good" ? "default" : "outline"}
            className={`cursor-pointer ${classFilter === "finished_good" ? "bg-[#004B8D] text-white" : "hover:bg-[#004B8D]/10"}`}
            onClick={() => setClassFilter("finished_good")}
          >
            📦 {terminology.productsLabel}
          </Badge>
          {showMaterialsAndConsumables && (
            <>
              <Badge
                variant={classFilter === "raw_material" ? "default" : "outline"}
                className={`cursor-pointer ${classFilter === "raw_material" ? "bg-purple-600 text-white" : "hover:bg-purple-50"}`}
                onClick={() => setClassFilter("raw_material")}
              >
                🧵 Materials
              </Badge>
              <Badge
                variant={classFilter === "consumable" ? "default" : "outline"}
                className={`cursor-pointer ${classFilter === "consumable" ? "bg-gray-600 text-white" : "hover:bg-gray-50"}`}
                onClick={() => setClassFilter("consumable")}
              >
                📋 Consumables
              </Badge>
            </>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 bg-[#004B8D]/10 border border-[#004B8D]/20 rounded-lg"
          >
            <span className="text-sm font-medium text-[#003366]">
              {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkArchiveDialogOpen(true)}
              className="border-amber-400 text-amber-700 hover:bg-amber-50"
            >
              <Archive className="w-4 h-4 mr-1" />
              Archive Selected
            </Button>
            {isMultiBranchEnabled && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#004B8D]/30 text-[#004B8D]"
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    Move to Branch
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border shadow-lg z-50">
                  <DropdownMenuItem
                    onClick={() => {
                      setTargetBranchId("");
                      setBulkMoveDialogOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    <span className="text-muted-foreground">No Branch (Central)</span>
                  </DropdownMenuItem>
                  {branches.map((branch) => (
                    <DropdownMenuItem
                      key={branch.id}
                      onClick={() => {
                        setTargetBranchId(branch.id);
                        setBulkMoveDialogOpen(true);
                      }}
                      className="cursor-pointer"
                    >
                      {branch.is_headquarters && "🏢 "}
                      {branch.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-[#004B8D]/60"
            >
              Clear
            </Button>
          </motion.div>
        )}

        {/* Inventory Table */}
        <Card className="bg-white border-[#004B8D]/10">
          <CardHeader>
            <CardTitle className="text-[#003366]">
              {terminology.inventoryLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#004B8D]" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>{terminology.productLabel}</TableHead>
                    {showMaterialsAndConsumables && <TableHead>Type</TableHead>}
                    {isMultiBranchEnabled && (
                      <TableHead>
                        <Building2 className="w-4 h-4 inline mr-1" />
                        Location
                      </TableHead>
                    )}
                    {!formFields.hideVariants && hasAnyColors && (
                      <TableHead className="text-center">
                        <Palette className="w-4 h-4 inline mr-1" />
                        Colors
                      </TableHead>
                    )}
                    {!formFields.hideVariants && hasAnySizes && (
                      <TableHead className="text-center">
                        <Ruler className="w-4 h-4 inline mr-1" />
                        Sizes
                      </TableHead>
                    )}
                    {!formFields.hideStock && <TableHead className="text-right">Stock</TableHead>}
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleInventory.map((item) => (
                    <TableRow key={item.id} data-state={selectedIds.has(item.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                          aria-label={`Select ${item.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-[#004B8D]/10 rounded flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-[#004B8D]/40" />
                            </div>
                          )}
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </TableCell>
                      {showMaterialsAndConsumables && (
                        <TableCell>
                          {item.inventory_class === 'raw_material' ? (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">🧵 Material</Badge>
                          ) : item.inventory_class === 'consumable' ? (
                            <Badge className="bg-gray-100 text-gray-700 border-gray-200">📋 Consumable</Badge>
                          ) : (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200">📦 Product</Badge>
                          )}
                        </TableCell>
                      )}
                      {isMultiBranchEnabled && (
                        <TableCell>
                          {item.location_name ? (
                            <span className="text-sm text-[#004B8D]">📍 {item.location_name}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {!formFields.hideVariants && hasAnyColors && (
                        <TableCell className="text-center">
                          {(item.color_count || 0) > 0 ? (
                            <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                              {item.color_count}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {!formFields.hideVariants && hasAnySizes && (
                        <TableCell className="text-center">
                          {(item.size_count || 0) > 0 ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {item.size_count}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {!formFields.hideStock && (
                        <TableCell className="text-right">
                          {item.current_stock} {item.unit_of_measure && item.unit_of_measure !== 'pcs' ? item.unit_of_measure : ''}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {currencySymbol} {item.unit_price.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStockBadge(item)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* Only show restock for non-service items */}
                          {item.item_type !== 'service' && !['consultation', 'project', 'retainer', 'training', 'support', 'package', 'treatment', 'haircut', 'styling', 'coloring', 'spa', 'bridal', 'barbering', 'consultation_fee', 'lab_test', 'procedure', 'vaccination', 'repair', 'maintenance', 'diagnostics', 'service', 'services', 'maintenance_service'].includes(item.category || '') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRestock(item)}
                              className="text-emerald-600 hover:bg-emerald-50"
                              title="Restock"
                            >
                              <PackagePlus className="w-4 h-4" />
                            </Button>
                          )}
                          {/* Only show variant management when variants are not hidden for this business type */}
                          {!formFields.hideVariants && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleManageVariants(item)}
                              className="text-[#004B8D] hover:bg-[#004B8D]/10"
                              title="Manage Variants"
                            >
                              <Palette className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditProduct(item)}
                            className="text-[#004B8D] hover:bg-[#004B8D]/10"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {item.is_archived ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openRestoreDialog(item)}
                              className="text-[#004B8D] hover:bg-[#004B8D]/10"
                              title="Restore"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openArchiveDialog(item)}
                              className="text-[#004B8D] hover:bg-[#004B8D]/10"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {/* Pagination Controls */}
            {totalCount > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#004B8D]/10">
                <p className="text-sm text-[#004B8D]/60">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()} items
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {/* Show page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <ProductModal
          open={isProductModalOpen}
          onOpenChange={(open) => {
            setIsProductModalOpen(open);
            if (!open) setSelectedProduct(null);
          }}
          product={selectedProduct}
          onSuccess={fetchInventory}
        />

        <InventoryImportModal
          open={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          onSuccess={fetchInventory}
        />

        <ProductVariantsModal
          open={isVariantsModalOpen}
          onOpenChange={(open) => {
            setIsVariantsModalOpen(open);
            if (!open) setSelectedProduct(null);
          }}
          product={selectedProduct}
          onSuccess={fetchInventory}
        />

        <RestockModal
          open={isRestockModalOpen}
          onOpenChange={(open) => {
            setIsRestockModalOpen(open);
            if (!open) setSelectedProduct(null);
          }}
          product={selectedProduct}
          onSuccess={fetchInventory}
          currencySymbol={currencySymbol}
        />

        <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {itemToArchive ? `Archive ${terminology.productLabel}?` : `Restore ${terminology.productLabel}?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {itemToArchive
                  ? `This will hide the ${terminology.productLabel.toLowerCase()} from sales and inventory pickers, but keep your history. You can restore it later.`
                  : `This will make the ${terminology.productLabel.toLowerCase()} active again and available for sales.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleArchiveOrRestoreConfirm}
                className="bg-[#004B8D] hover:bg-[#003366]"
              >
                {itemToArchive ? "Archive" : "Restore"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Archive Confirmation */}
        <AlertDialog open={bulkArchiveDialogOpen} onOpenChange={setBulkArchiveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive {selectedIds.size} {terminology.productsLabel}?</AlertDialogTitle>
              <AlertDialogDescription>
                These items will be hidden from sales and inventory lists but kept for historical records.
                You can restore them anytime via the "Show Archived" toggle.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isBulkProcessing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkArchive}
                disabled={isBulkProcessing}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isBulkProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive {selectedIds.size} Items
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Move Confirmation */}
        <AlertDialog open={bulkMoveDialogOpen} onOpenChange={setBulkMoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move {selectedIds.size} {terminology.productsLabel}?</AlertDialogTitle>
              <AlertDialogDescription>
                Move selected items to{" "}
                <strong>
                  {targetBranchId === "" 
                    ? "Central Stock (No Branch)" 
                    : branches.find(b => b.id === targetBranchId)?.name || "selected branch"}
                </strong>
                . This updates the default location for these items.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isBulkProcessing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkMove}
                disabled={isBulkProcessing}
                className="bg-[#004B8D] hover:bg-[#003366]"
              >
                {isBulkProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Moving...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Move Items
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
          </>
        )}
      </motion.div>
    </FeatureGuard>
  );
}
