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
  category?: string | null;
  certifications?: string[] | null;
  datasheet_url?: string | null;
  manual_url?: string | null;
  technical_specs?: TechnicalSpec[] | null;
}

export function InventoryAgent() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isVariantsModalOpen, setIsVariantsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<InventoryItem | null>(null);
  const [variantsProduct, setVariantsProduct] = useState<InventoryItem | null>(null);
  const { toast } = useToast();

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("name");

      if (error) throw error;

      // Fetch variant counts
      const { data: variantsData, error: variantsError } = await supabase
        .from("product_variants")
        .select("product_id, variant_type");

      if (variantsError) throw variantsError;

      // Count variants by product
      const variantCounts = (variantsData || []).reduce((acc, v) => {
        if (!acc[v.product_id]) {
          acc[v.product_id] = { colors: 0, sizes: 0 };
        }
        if (v.variant_type === "color") acc[v.product_id].colors++;
        if (v.variant_type === "size") acc[v.product_id].sizes++;
        return acc;
      }, {} as Record<string, { colors: number; sizes: number }>);

      const enrichedInventory: InventoryItem[] = (data || []).map(item => ({
        ...item,
        color_count: variantCounts[item.id]?.colors || 0,
        size_count: variantCounts[item.id]?.sizes || 0,
        technical_specs: (item.technical_specs as unknown as TechnicalSpec[]) || null,
      }));

      setInventory(enrichedInventory);
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
    fetchInventory();

    const channel = supabase
      .channel("inventory-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        () => fetchInventory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchInventory();
    toast({
      title: "Refreshed",
      description: "Inventory data has been updated",
    });
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: InventoryItem) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;

    try {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", deletingProduct.id);

      if (error) throw error;

      toast({
        title: "Product Deleted",
        description: `${deletingProduct.name} has been removed from inventory`,
      });
      setDeletingProduct(null);
      fetchInventory();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const lowStockItems = inventory.filter(
    (item) => item.current_stock < item.reorder_level
  );

  const hasLowStock = lowStockItems.length > 0;

  const handleRestock = () => {
    const subject = encodeURIComponent("Restock Request - Finch Investments Ltd");
    const body = encodeURIComponent(
      `Dear Vestergaard Team,\n\nWe would like to place a restock order for the following items:\n\n${lowStockItems.map((item) => `- ${item.name} (SKU: ${item.sku}): ${item.current_stock} in stock, needs ${item.reorder_level - item.current_stock} units`).join("\n")}\n\nPlease confirm availability and expected delivery date.\n\nBest regards,\nFinch Investments Ltd`
    );

    window.location.href = `mailto:orders@vestergaard.com?subject=${subject}&body=${body}`;

    toast({
      title: "Email Draft Opened",
      description: "Your email client should open with the restock request",
    });
  };

  const handleExportCSV = () => {
    const headers = ["sku", "name", "retail_stock", "agent_stock", "total_stock", "unit_price", "reorder_level", "liters_per_unit"];
    const rows = inventory.map(item => [
      item.sku,
      item.name,
      item.current_stock,
      item.wholesale_stock || 0,
      item.current_stock + (item.wholesale_stock || 0),
      item.unit_price,
      item.reorder_level,
      item.liters_per_unit
    ].join(","));
    
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${inventory.length} items to CSV`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#004B8D]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-[#003366] mb-2">Inventory Agent</h2>
          <p className="text-[#004B8D]/60">Stock Management & Reorder System</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-[#004B8D]/20 text-[#004B8D] hover:bg-[#004B8D]/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={inventory.length === 0}
            className="border-[#004B8D]/20 text-[#004B8D] hover:bg-[#004B8D]/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="border-[#004B8D]/20 text-[#004B8D] hover:bg-[#004B8D]/10"
          >
            <FileUp className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            onClick={handleAddProduct}
            className="bg-[#004B8D] hover:bg-[#003366] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
          {hasLowStock && (
            <Button
              onClick={handleRestock}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Mail className="h-4 w-4 mr-2" />
              Restock
            </Button>
          )}
        </div>
      </div>

      {hasLowStock && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <div>
                <p className="text-amber-800 font-semibold">
                  ⚠️ Warning: Low Stock Alert
                </p>
                <p className="text-amber-700 text-sm">
                  {lowStockItems.length} item(s) below reorder level
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card className="bg-white border-[#004B8D]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#003366] flex items-center gap-2">
            <Package className="h-5 w-5 text-[#0077B6]" />
            Stock Overview
            <Badge variant="secondary" className="ml-2 bg-[#004B8D]/10 text-[#004B8D]">
              {inventory.length} Products
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#004B8D]/10 hover:bg-transparent">
                <TableHead className="text-[#004B8D]/70 w-16">Image</TableHead>
                <TableHead className="text-[#004B8D]/70">Product Name</TableHead>
                <TableHead className="text-[#004B8D]/70">SKU</TableHead>
                <TableHead className="text-[#004B8D]/70 text-right">Retail Stock</TableHead>
                <TableHead className="text-[#004B8D]/70 text-right">Agent Stock</TableHead>
                <TableHead className="text-[#004B8D]/70 text-right">Total Stock</TableHead>
                <TableHead className="text-[#004B8D]/70 text-right">Unit Price (ZMW)</TableHead>
                <TableHead className="text-[#004B8D]/70 text-right">Reorder Level</TableHead>
                <TableHead className="text-[#004B8D]/70">Variants</TableHead>
                <TableHead className="text-[#004B8D]/70">Status</TableHead>
                <TableHead className="text-[#004B8D]/70 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-[#004B8D]/50 py-8">
                    No inventory items found. Click "Add Product" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => {
                  const isLowStock = item.current_stock < item.reorder_level;
                  return (
                    <TableRow key={item.id} className="border-[#004B8D]/10 hover:bg-[#004B8D]/5">
                      <TableCell>
                        <div className="w-10 h-10 rounded-lg border border-[#004B8D]/10 overflow-hidden bg-[#f0f7fa] flex items-center justify-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-[#004B8D]/30" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-[#003366] font-medium">{item.name}</TableCell>
                      <TableCell className="text-[#004B8D]/70 font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="text-right">
                        <span className={isLowStock ? "text-red-600 font-semibold" : "text-[#003366]"}>
                          {item.current_stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-purple-600 font-medium">
                        {item.wholesale_stock || 0}
                      </TableCell>
                      <TableCell className="text-right text-[#003366] font-semibold">
                        {item.current_stock + (item.wholesale_stock || 0)}
                      </TableCell>
                      <TableCell className="text-right text-[#003366]">
                        K {Number(item.unit_price).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-[#003366]">{item.reorder_level}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(item.color_count ?? 0) > 0 && (
                            <Badge variant="outline" className="border-purple-300 text-purple-600">
                              <Palette className="w-3 h-3 mr-1" />
                              {item.color_count}
                            </Badge>
                          )}
                          {(item.size_count ?? 0) > 0 && (
                            <Badge variant="outline" className="border-blue-300 text-blue-600">
                              <Ruler className="w-3 h-3 mr-1" />
                              {item.size_count}
                            </Badge>
                          )}
                          {(item.color_count ?? 0) === 0 && (item.size_count ?? 0) === 0 && (
                            <span className="text-[#004B8D]/40 text-sm">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isLowStock ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            In Stock
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setVariantsProduct(item);
                              setIsVariantsModalOpen(true);
                            }}
                            className="h-8 w-8 text-purple-600 hover:bg-purple-50"
                            title="Manage Variants"
                          >
                            <Palette className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditProduct(item)}
                            className="h-8 w-8 text-[#004B8D] hover:bg-[#004B8D]/10"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingProduct(item)}
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Product Modal */}
      <ProductModal
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        product={editingProduct}
        onSuccess={fetchInventory}
      />

      {/* Variants Modal */}
      <ProductVariantsModal
        open={isVariantsModalOpen}
        onOpenChange={setIsVariantsModalOpen}
        product={variantsProduct}
        onSuccess={fetchInventory}
      />

      {/* Import Modal */}
      <InventoryImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={fetchInventory}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent className="bg-white border-[#004B8D]/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#003366]">Delete Product</AlertDialogTitle>
            <AlertDialogDescription className="text-[#004B8D]/60">
              Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#004B8D]/20 text-[#004B8D]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
