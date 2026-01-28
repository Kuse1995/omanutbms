import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit, Trash2, Loader2, Palette, Ruler, ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProductModal } from "./ProductModal";
import { ProductVariantsModal } from "./ProductVariantsModal";
import { useTenant } from "@/hooks/useTenant";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
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

interface TechnicalSpec {
  label: string;
  value: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  current_stock: number;
  unit_price: number;
  original_price?: number;
  cost_price?: number;
  reorder_level: number;
  liters_per_unit: number;
  status: string;
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
  item_type?: string | null;
}

// Categories that are considered services (no stock tracking)
const SERVICE_CATEGORIES = [
  'consultation', 'project', 'retainer', 'training', 'support', 'package',
  'treatment', 'haircut', 'styling', 'coloring', 'spa', 'bridal', 'barbering',
  'consultation_fee', 'lab_test', 'procedure', 'vaccination',
  'repair', 'maintenance', 'diagnostics', 'service', 'services',
  'maintenance_service'
];

function isServiceItem(product: Product): boolean {
  return product.item_type === 'service' || SERVICE_CATEGORIES.includes(product.category || '');
}

export function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isVariantsModalOpen, setIsVariantsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { terminology } = useBusinessConfig();

  useEffect(() => {
    if (tenantId) {
      fetchProducts();
    }
  }, [tenantId]);

  const fetchProducts = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      // Fetch products with variant counts - filtered by tenant
      const { data: productsData, error: productsError } = await supabase
        .from("inventory")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");

      if (productsError) throw productsError;

      // Fetch variant counts for each product - filtered by tenant
      const { data: variantsData, error: variantsError } = await supabase
        .from("product_variants")
        .select("product_id, variant_type")
        .eq("tenant_id", tenantId);

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

      const enrichedProducts: Product[] = (productsData || []).map(p => ({
        ...p,
        color_count: variantCounts[p.id]?.colors || 0,
        size_count: variantCounts[p.id]?.sizes || 0,
        technical_specs: (p.technical_specs as unknown as TechnicalSpec[]) || null,
      }));

      setProducts(enrichedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: `Failed to fetch ${terminology.products.toLowerCase()}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete || !tenantId) return;

    try {
      const productId = productToDelete.id;
      const criticalErrors: string[] = [];
      
      console.log(`[ProductDelete] Starting deletion of product ${productId}`);
      
      // Helper to safely delete records
      const safeDelete = async (table: string, column: string, value: string, addTenant = true) => {
        try {
          let query = supabase.from(table as any).delete().eq(column, value);
          if (addTenant) {
            query = query.eq("tenant_id", tenantId);
          }
          const { error, count } = await query;
          if (error) {
            console.warn(`[Delete] ${table}: ${error.message}`);
          } else {
            console.log(`[Delete] ${table}: success`);
          }
        } catch (e: any) {
          console.warn(`[Delete] ${table}: ${e.message}`);
        }
      };
      
      // Helper to nullify FK references - CRITICAL for deletion
      const safeNullify = async (table: string, column: string, value: string, addTenant = true): Promise<boolean> => {
        try {
          let query = supabase.from(table as any).update({ [column]: null } as any).eq(column, value);
          if (addTenant) {
            query = query.eq("tenant_id", tenantId);
          }
          const { error, count } = await query;
          if (error) {
            console.warn(`[Nullify] ${table}.${column}: ${error.message}`);
            return false;
          }
          console.log(`[Nullify] ${table}.${column}: success`);
          return true;
        } catch (e: any) {
          console.warn(`[Nullify] ${table}.${column}: ${e.message}`);
          return false;
        }
      };
      
      // === STEP 1: Delete direct child records (no FK pointing TO them) ===
      console.log("[ProductDelete] Step 1: Deleting child records...");
      await safeDelete("product_variants", "product_id", productId);
      await safeDelete("branch_inventory", "inventory_id", productId);
      await safeDelete("restock_history", "inventory_id", productId);
      await safeDelete("inventory_adjustments", "inventory_id", productId);
      await safeDelete("job_material_usage", "inventory_item_id", productId);
      
      // === STEP 2: Nullify ALL FK references to this inventory item ===
      console.log("[ProductDelete] Step 2: Nullifying FK references...");
      
      // Critical FKs that must be nullified for deletion to succeed
      const nullifyResults = await Promise.all([
        safeNullify("sale_items", "inventory_id", productId),
        safeNullify("stock_transfers", "inventory_id", productId),
        safeNullify("agent_inventory", "product_id", productId),
        safeNullify("sales_transactions", "product_id", productId),
        safeNullify("invoice_items", "product_id", productId),
        safeNullify("quotation_items", "product_id", productId),
        safeNullify("purchase_order_items", "inventory_id", productId),
        safeNullify("inventory_movements", "inventory_id", productId),
      ]);
      
      // Check if any critical nullify failed
      const allNullified = nullifyResults.every(r => r !== false);
      if (!allNullified) {
        console.warn("[ProductDelete] Some FK references could not be nullified, attempting deletion anyway...");
      }

      // === STEP 3: Delete the inventory item ===
      console.log("[ProductDelete] Step 3: Deleting inventory item...");
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", productId)
        .eq("tenant_id", tenantId);

      if (error) {
        console.error("[ProductDelete] Failed to delete inventory item:", error);
        throw new Error(error.message);
      }

      console.log("[ProductDelete] Deletion successful!");
      toast({
        title: `${terminology.product} Deleted`,
        description: `${productToDelete.name} has been removed`,
      });
      fetchProducts();
    } catch (error: any) {
      console.error("[ProductDelete] Error:", error);
      toast({
        title: "Cannot Delete Item",
        description: `Failed to delete. Error: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setProductToDelete(null);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#004B8D]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="bg-white border-[#004B8D]/10 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#003366]">All {terminology.products}</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#004B8D]/50" />
              <Input
                placeholder={`Search ${terminology.products.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-[#f0f7fa] border-[#004B8D]/20"
              />
            </div>
            <Button
              onClick={() => {
                setSelectedProduct(null);
                setIsProductModalOpen(true);
              }}
              className="bg-[#004B8D] hover:bg-[#003366] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {terminology.product}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#004B8D]/10">
                <TableHead className="text-[#004B8D]/70">{terminology.product}</TableHead>
                <TableHead className="text-[#004B8D]/70">SKU</TableHead>
                <TableHead className="text-[#004B8D]/70">Cost</TableHead>
                <TableHead className="text-[#004B8D]/70">Price</TableHead>
                <TableHead className="text-[#004B8D]/70">Margin</TableHead>
                <TableHead className="text-[#004B8D]/70">Stock</TableHead>
                <TableHead className="text-[#004B8D]/70">Variants</TableHead>
                <TableHead className="text-[#004B8D]/70">Status</TableHead>
                <TableHead className="text-[#004B8D]/70 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-[#004B8D]/50 py-8">
                    No {terminology.products.toLowerCase()} found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="border-[#004B8D]/10">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border border-[#004B8D]/10 overflow-hidden bg-[#f0f7fa] flex items-center justify-center">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-[#004B8D]/30" />
                          )}
                        </div>
                        <span className="text-[#003366] font-medium">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#004B8D]/70 font-mono text-sm">
                      {product.sku}
                    </TableCell>
                    <TableCell className="text-[#004B8D]/70">
                      {product.cost_price && product.cost_price > 0 ? (
                        <span>K{product.cost_price.toLocaleString()}</span>
                      ) : (
                        <span className="text-[#004B8D]/40 italic text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#0077B6] font-medium">
                      K{product.unit_price.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {product.cost_price && product.cost_price > 0 ? (
                        (() => {
                          const margin = product.unit_price - product.cost_price;
                          const marginPercent = ((margin / product.cost_price) * 100).toFixed(0);
                          const isPositive = margin > 0;
                          const isNegative = margin < 0;
                          return (
                            <div className="flex flex-col">
                              <span className={`font-medium text-sm ${
                                isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-amber-600'
                              }`}>
                                {isNegative ? '-' : '+'}K{Math.abs(margin).toLocaleString()}
                              </span>
                              <span className={`text-xs ${
                                isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-amber-500'
                              }`}>
                                {marginPercent}%
                              </span>
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-[#004B8D]/40 italic text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#003366]">
                      {isServiceItem(product) ? (
                        <span className="text-[#004B8D]/50 italic">N/A</span>
                      ) : (
                        product.current_stock
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product.color_count > 0 && (
                          <Badge variant="outline" className="border-purple-300 text-purple-600">
                            <Palette className="w-3 h-3 mr-1" />
                            {product.color_count}
                          </Badge>
                        )}
                        {product.size_count > 0 && (
                          <Badge variant="outline" className="border-blue-300 text-blue-600">
                            <Ruler className="w-3 h-3 mr-1" />
                            {product.size_count}
                          </Badge>
                        )}
                        {product.color_count === 0 && product.size_count === 0 && (
                          <span className="text-[#004B8D]/40 text-sm">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isServiceItem(product) ? (
                        <Badge
                          variant="outline"
                          className="border-purple-300 text-purple-600 bg-purple-50"
                        >
                          Service
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={
                            product.status === "healthy"
                              ? "border-green-300 text-green-600 bg-green-50"
                              : product.status === "warning"
                              ? "border-amber-300 text-amber-600 bg-amber-50"
                              : "border-red-300 text-red-600 bg-red-50"
                          }
                        >
                          {product.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsVariantsModalOpen(true);
                          }}
                          className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                        >
                          <Palette className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsProductModalOpen(true);
                          }}
                          className="text-[#004B8D] hover:text-[#003366] hover:bg-[#004B8D]/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductToDelete(product)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductModal
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        product={selectedProduct}
        onSuccess={fetchProducts}
      />

      <ProductVariantsModal
        open={isVariantsModalOpen}
        onOpenChange={setIsVariantsModalOpen}
        product={selectedProduct}
        onSuccess={fetchProducts}
      />

      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#003366]">Delete {terminology.product}?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#004B8D]/70">
              This will permanently delete "{productToDelete?.name}" and all its variants.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#004B8D]/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
