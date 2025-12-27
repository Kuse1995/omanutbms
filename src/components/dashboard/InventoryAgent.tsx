import { useEffect, useState } from "react";
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
import { Package, AlertTriangle, RefreshCw, Mail, Loader2, Plus, Pencil, Trash2, FileUp, Download, Palette, Ruler, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductModal } from "./ProductModal";
import { InventoryImportModal } from "./InventoryImportModal";
import { ProductVariantsModal } from "./ProductVariantsModal";
import { FeatureGuard } from "./FeatureGuard";
import { useTenant } from "@/hooks/useTenant";
import { useFeatures } from "@/hooks/useFeatures";

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
}

export function InventoryAgent() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isVariantsModalOpen, setIsVariantsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { terminology, currencySymbol } = useFeatures();

  const fetchInventory = async () => {
    if (!tenantId) return;
    
    try {
      // Fetch inventory with variant counts
      const { data: inventoryData, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");

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

      const enrichedInventory = (inventoryData || []).map((item) => ({
        ...item,
        color_count: variantCounts[item.id]?.colors || 0,
        size_count: variantCounts[item.id]?.sizes || 0,
        technical_specs: item.technical_specs as unknown as TechnicalSpec[] | null,
      }));

      setInventory(enrichedInventory);
      setLowStockItems(
        enrichedInventory.filter(
          (item) => item.current_stock < (item.reorder_level || 10)
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
  }, [tenantId]);

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

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", itemToDelete);

      if (error) throw error;

      toast({
        title: "Product Deleted",
        description: "The product has been removed from inventory",
      });
      fetchInventory();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

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

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Low Stock Alerts ({lowStockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.map((item) => (
                  <Badge key={item.id} variant="outline" className="border-amber-500/50 text-amber-700">
                    {item.name}: {item.current_stock} left
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                    <TableHead className="text-center">
                      <Palette className="w-4 h-4 inline mr-1" />
                      Colors
                    </TableHead>
                    <TableHead className="text-center">
                      <Ruler className="w-4 h-4 inline mr-1" />
                      Sizes
                    </TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Wholesale</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
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
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                          {item.color_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {item.size_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.current_stock}</TableCell>
                      <TableCell className="text-right">{item.wholesale_stock}</TableCell>
                      <TableCell className="text-right">
                        {currencySymbol} {item.unit_price.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStockBadge(item)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleManageVariants(item)}
                            className="text-[#004B8D] hover:bg-[#004B8D]/10"
                            title="Manage Variants"
                          >
                            <Palette className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditProduct(item)}
                            className="text-[#004B8D] hover:bg-[#004B8D]/10"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(item.id)}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {terminology.productLabel}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the {terminology.productLabel.toLowerCase()} and all associated variants.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </FeatureGuard>
  );
}
