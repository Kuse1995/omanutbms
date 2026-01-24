import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Palette, Ruler, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

interface Variant {
  id: string;
  product_id: string;
  variant_type: string;
  variant_value: string;
  variant_display: string | null;
  hex_code: string | null;
  additional_price: number;
  is_active: boolean;
  product_name?: string;
}

interface Product {
  id: string;
  name: string;
}

export function VariantsManager() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();
  const { tenantId } = useTenant();

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  const fetchData = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      const [productsRes, variantsRes] = await Promise.all([
        supabase.from("inventory").select("id, name").eq("tenant_id", tenantId).order("name"),
        supabase.from("product_variants").select("*").eq("tenant_id", tenantId).order("variant_type").order("variant_value"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (variantsRes.error) throw variantsRes.error;

      setProducts(productsRes.data || []);

      // Map product names to variants
      const productMap = (productsRes.data || []).reduce((acc, p) => {
        acc[p.id] = p.name;
        return acc;
      }, {} as Record<string, string>);

      const enrichedVariants = (variantsRes.data || []).map(v => ({
        ...v,
        product_name: productMap[v.product_id] || "Unknown Product",
      }));

      setVariants(enrichedVariants);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load variants",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteVariant = async (variant: Variant) => {
    try {
      const { error } = await supabase
        .from("product_variants")
        .delete()
        .eq("id", variant.id);

      if (error) throw error;

      toast({ title: "Variant Deleted", description: `${variant.variant_value} has been removed` });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete variant",
        variant: "destructive",
      });
    }
  };

  const filteredVariants = variants.filter(v => {
    if (filterProduct !== "all" && v.product_id !== filterProduct) return false;
    if (filterType !== "all" && v.variant_type !== filterType) return false;
    return true;
  });

  const colorCount = variants.filter(v => v.variant_type === "color").length;
  const sizeCount = variants.filter(v => v.variant_type === "size").length;

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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-purple-600 text-sm">Total Colors</p>
                <p className="text-2xl font-bold text-purple-800">{colorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <Ruler className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-blue-600 text-sm">Total Sizes</p>
                <p className="text-2xl font-bold text-blue-800">{sizeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variants Table */}
      <Card className="bg-white border-[#004B8D]/10 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-[#003366]">All Variants</CardTitle>
            <CardDescription className="text-[#004B8D]/60">
              Filter and manage all product variants
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-48 bg-[#f0f7fa] border-[#004B8D]/20">
                <SelectValue placeholder="Filter by product" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Products</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32 bg-[#f0f7fa] border-[#004B8D]/20">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="color">Colors</SelectItem>
                <SelectItem value="size">Sizes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#004B8D]/10">
                <TableHead className="text-[#004B8D]/70">Product</TableHead>
                <TableHead className="text-[#004B8D]/70">Type</TableHead>
                <TableHead className="text-[#004B8D]/70">Value</TableHead>
                <TableHead className="text-[#004B8D]/70">Display</TableHead>
                <TableHead className="text-[#004B8D]/70">Preview</TableHead>
                <TableHead className="text-[#004B8D]/70">+Price</TableHead>
                <TableHead className="text-[#004B8D]/70 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVariants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[#004B8D]/50 py-8">
                    No variants found
                  </TableCell>
                </TableRow>
              ) : (
                filteredVariants.map((variant) => (
                  <TableRow key={variant.id} className="border-[#004B8D]/10">
                    <TableCell className="text-[#003366] font-medium">
                      {variant.product_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          variant.variant_type === "color"
                            ? "border-purple-300 text-purple-600 bg-purple-50"
                            : "border-blue-300 text-blue-600 bg-blue-50"
                        }
                      >
                        {variant.variant_type === "color" ? (
                          <Palette className="w-3 h-3 mr-1" />
                        ) : (
                          <Ruler className="w-3 h-3 mr-1" />
                        )}
                        {variant.variant_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#003366]">{variant.variant_value}</TableCell>
                    <TableCell className="text-[#004B8D]/70">
                      {variant.variant_display || "-"}
                    </TableCell>
                    <TableCell>
                      {variant.variant_type === "color" && variant.hex_code ? (
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white shadow"
                          style={{ backgroundColor: variant.hex_code }}
                        />
                      ) : (
                        <span className="text-[#004B8D]/40">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {variant.additional_price > 0 ? `+K${variant.additional_price}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteVariant(variant)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
