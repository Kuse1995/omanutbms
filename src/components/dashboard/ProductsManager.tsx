import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit, Loader2, Palette, Ruler, ImageIcon, Archive, ArchiveRestore, Eye, EyeOff } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  is_archived?: boolean;
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
  const [productToArchive, setProductToArchive] = useState<Product | null>(null);
  const [productToRestore, setProductToRestore] = useState<Product | null>(null);
  const [showArchived, setShowArchived] = useState(false);
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

  const handleArchive = async () => {
    if (!productToArchive || !tenantId) return;

    try {
      const { error } = await supabase
        .from("inventory")
        .update({ is_archived: true })
        .eq("id", productToArchive.id)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast({
        title: `${terminology.product} Archived`,
        description: `${productToArchive.name} has been archived and hidden from sales`,
      });
      fetchProducts();
    } catch (error: any) {
      console.error("Archive error:", error);
      toast({
        title: "Archive Failed",
        description: error.message || "Failed to archive item",
        variant: "destructive",
      });
    } finally {
      setProductToArchive(null);
    }
  };

  const handleRestore = async () => {
    if (!productToRestore || !tenantId) return;

    try {
      const { error } = await supabase
        .from("inventory")
        .update({ is_archived: false })
        .eq("id", productToRestore.id)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast({
        title: `${terminology.product} Restored`,
        description: `${productToRestore.name} is now active again`,
      });
      fetchProducts();
    } catch (error: any) {
      console.error("Restore error:", error);
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore item",
        variant: "destructive",
      });
    } finally {
      setProductToRestore(null);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      (showArchived ? p.is_archived === true : p.is_archived !== true) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const archivedCount = products.filter(p => p.is_archived === true).length;
  const activeCount = products.filter(p => p.is_archived !== true).length;

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
          <div>
            <CardTitle className="text-[#003366]">
              {showArchived ? `Archived ${terminology.products}` : `All ${terminology.products}`}
            </CardTitle>
            <p className="text-sm text-[#004B8D]/60 mt-1">
              {showArchived 
                ? `${archivedCount} archived item${archivedCount !== 1 ? 's' : ''}`
                : `${activeCount} active item${activeCount !== 1 ? 's' : ''}${archivedCount > 0 ? ` • ${archivedCount} archived` : ''}`
              }
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
              <Label htmlFor="show-archived" className="text-sm text-[#004B8D]/70 cursor-pointer flex items-center gap-1">
                {showArchived ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Show Archived
              </Label>
            </div>
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
                  <TableRow key={product.id} className={`border-[#004B8D]/10 ${product.is_archived ? 'opacity-60' : ''}`}>
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
                      {product.is_archived ? (
                        <Badge
                          variant="outline"
                          className="border-gray-300 text-gray-600 bg-gray-50"
                        >
                          <Archive className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      ) : isServiceItem(product) ? (
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
                        {product.is_archived ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setProductToRestore(product)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50"
                            title="Restore"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setProductToArchive(product)}
                            className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        )}
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

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!productToArchive} onOpenChange={() => setProductToArchive(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#003366] flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-600" />
              Archive {terminology.product}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#004B8D]/70">
              "{productToArchive?.name}" will be hidden from sales and inventory views but all historical records will be preserved. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#004B8D]/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!productToRestore} onOpenChange={() => setProductToRestore(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#003366] flex items-center gap-2">
              <ArchiveRestore className="w-5 h-5 text-green-600" />
              Restore {terminology.product}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#004B8D]/70">
              "{productToRestore?.name}" will be restored and appear in your active inventory again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#004B8D]/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <ArchiveRestore className="w-4 h-4 mr-2" />
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
