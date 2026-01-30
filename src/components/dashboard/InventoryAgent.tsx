import { useEffect, useMemo, useState } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Package, AlertTriangle, RefreshCw, Mail, Loader2, Plus, Pencil, FileUp, Download, Palette, Ruler, ImageIcon, Building2, PackagePlus, Archive, ArchiveRestore, Eye, EyeOff, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductModal } from "./ProductModal";
import { InventoryImportModal } from "./InventoryImportModal";
import { ProductVariantsModal } from "./ProductVariantsModal";
import { RestockModal } from "./RestockModal";
import { FeatureGuard } from "./FeatureGuard";
import { useTenant } from "@/hooks/useTenant";
import { useBranch } from "@/hooks/useBranch";
import { useFeatures } from "@/hooks/useFeatures";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

export function InventoryAgent() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { currentBranch, isMultiBranchEnabled } = useBranch();
  const { terminology, currencySymbol } = useFeatures();
  const { config, businessType } = useBusinessConfig();
  const formFields = config.formFields;
  const showMaterialsAndConsumables = businessType === 'fashion';

  const fetchInventory = async () => {
    if (!tenantId) return;
    
    try {
      // Fetch inventory with variant counts and location info
      let query = supabase
        .from("inventory")
        .select(`
          *,
          branches!default_location_id(name)
        `)
        .eq("tenant_id", tenantId);
      
      // Filter by branch when one is selected
      if (currentBranch && isMultiBranchEnabled) {
        query = query.eq("default_location_id", currentBranch.id);
      }
      
      const { data: inventoryData, error } = await query.order("name");

      if (error) throw error;

      // Fetch variant counts for each product
      const { data: variantsData } = await supabase
        .from("product_variants")
        .select("product_id, variant_type")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

      // Count variants per product
      const variantCounts: Record<string, { colors: number; sizes: number }> = {};
      variantsData?.forEach((v) => {
        if (!variantCounts[v.product_id]) {
          variantCounts[v.product_id] = { colors: 0, sizes: 0 };
        }
        if (v.variant_type === "color") variantCounts[v.product_id].colors++;
        if (v.variant_type === "size") variantCounts[v.product_id].sizes++;
      });

      const enrichedInventory = ((inventoryData || []) as any[]).map((item) => ({
        ...item,
        color_count: variantCounts[item.id]?.colors || 0,
        size_count: variantCounts[item.id]?.sizes || 0,
        technical_specs: item.technical_specs as unknown as TechnicalSpec[] | null,
        location_name: item.branches?.name || null,
      }));

      setInventory(enrichedInventory);
      setLowStockItems(
        enrichedInventory.filter(
          (item) => {
            // Exclude services from low stock alerts
            const serviceCategories = ['consultation', 'project', 'retainer', 'training', 'support', 'package', 'treatment', 'haircut', 'styling', 'coloring', 'spa', 'bridal', 'barbering', 'consultation_fee', 'lab_test', 'procedure', 'vaccination', 'repair', 'maintenance', 'diagnostics', 'service', 'services', 'maintenance_service'];
            const isService = (item as any).item_type === 'service' || serviceCategories.includes(item.category || '');
            return !item.is_archived && !isService && item.current_stock < (item.reorder_level || 10);
          }
        )
      );
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchInventory();
    }
  }, [tenantId, currentBranch?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchInventory();
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
      fetchInventory();
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

  const inventoryForView = useMemo(
    () => inventory.filter((item) => (showArchived ? item.is_archived === true : item.is_archived !== true)),
    [inventory, showArchived]
  );

  const visibleInventory = useMemo(
    () => inventoryForView.filter((item) => classFilter === null || (item.inventory_class || 'finished_good') === classFilter),
    [inventoryForView, classFilter]
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold text-[#003366] flex items-center gap-2">
              <Package className="w-6 h-6 text-[#0077B6]" />
              {terminology.inventoryLabel} Management
            </h2>
            <p className="text-[#004B8D]/60 mt-1">
              Track and manage {terminology.productsLabel.toLowerCase()} and stock levels
            </p>
          </div>
          <div className="flex gap-2">
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

        {/* Filter Chips - Hide empty categories and fashion-specific filters */}
        {(() => {
          const productsCount = inventoryForView.filter(i => (i.inventory_class || 'finished_good') === 'finished_good').length;
          const materialsCount = inventoryForView.filter(i => i.inventory_class === 'raw_material').length;
          const consumablesCount = inventoryForView.filter(i => i.inventory_class === 'consumable').length;
          
          return (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={classFilter === null ? "default" : "outline"}
                className={`cursor-pointer ${classFilter === null ? "bg-[#004B8D] text-white" : "hover:bg-[#004B8D]/10"}`}
                onClick={() => setClassFilter(null)}
              >
                {showArchived ? `Archived` : `All`} ({inventoryForView.length})
              </Badge>
              {productsCount > 0 && (
                <Badge
                  variant={classFilter === "finished_good" ? "default" : "outline"}
                  className={`cursor-pointer ${classFilter === "finished_good" ? "bg-[#004B8D] text-white" : "hover:bg-[#004B8D]/10"}`}
                  onClick={() => setClassFilter("finished_good")}
                >
                  📦 {terminology.productsLabel} ({productsCount})
                </Badge>
              )}
              {showMaterialsAndConsumables && materialsCount > 0 && (
                <Badge
                  variant={classFilter === "raw_material" ? "default" : "outline"}
                  className={`cursor-pointer ${classFilter === "raw_material" ? "bg-purple-600 text-white" : "hover:bg-purple-50"}`}
                  onClick={() => setClassFilter("raw_material")}
                >
                  🧵 Materials ({materialsCount})
                </Badge>
              )}
              {showMaterialsAndConsumables && consumablesCount > 0 && (
                <Badge
                  variant={classFilter === "consumable" ? "default" : "outline"}
                  className={`cursor-pointer ${classFilter === "consumable" ? "bg-gray-600 text-white" : "hover:bg-gray-50"}`}
                  onClick={() => setClassFilter("consumable")}
                >
                  📋 Consumables ({consumablesCount})
                </Badge>
              )}
            </div>
          );
        })()}

        {/* Inventory Table */}
        <Card className="bg-white border-[#004B8D]/10">
          <CardHeader>
            <CardTitle className="text-[#003366]">
              {terminology.productLabel} {terminology.inventoryLabel}
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
                    <TableHead>SKU</TableHead>
                    <TableHead>{terminology.productLabel}</TableHead>
                    {showMaterialsAndConsumables && <TableHead>Type</TableHead>}
                    <TableHead>
                      <Building2 className="w-4 h-4 inline mr-1" />
                      Location
                    </TableHead>
                    {!formFields.hideVariants && (
                      <TableHead className="text-center">
                        <Palette className="w-4 h-4 inline mr-1" />
                        Colors
                      </TableHead>
                    )}
                    {!formFields.hideVariants && (
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
                    <TableRow key={item.id}>
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
                      <TableCell>
                        {item.location_name ? (
                          <span className="text-sm text-[#004B8D]">📍 {item.location_name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {!formFields.hideVariants && (
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                            {item.color_count || 0}
                          </Badge>
                        </TableCell>
                      )}
                      {!formFields.hideVariants && (
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {item.size_count || 0}
                          </Badge>
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
      </motion.div>
    </FeatureGuard>
  );
}
