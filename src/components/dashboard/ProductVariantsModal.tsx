import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, Palette, Ruler } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface ProductVariantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
  } | null;
  onSuccess: () => void;
}

interface Variant {
  id: string;
  variant_type: string;
  variant_value: string;
  variant_display: string | null;
  hex_code: string | null;
  additional_price: number;
  stock: number;
  is_active: boolean;
}

export function ProductVariantsModal({ open, onOpenChange, product, onSuccess }: ProductVariantsModalProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("colors");
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { terminology } = useBusinessConfig();

  // New variant form state
  const [newColor, setNewColor] = useState({ value: "", display: "", hex: "#000000", price: 0, stock: 0 });
  const [newSize, setNewSize] = useState({ value: "", display: "", price: 0, stock: 0 });

  useEffect(() => {
    if (open && product) {
      fetchVariants();
    }
  }, [open, product]);

  const fetchVariants = async () => {
    if (!product) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .order("variant_type", { ascending: true })
        .order("variant_value", { ascending: true });

      if (error) throw error;
      setVariants(data || []);
    } catch (error) {
      console.error("Error fetching variants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addColorVariant = async () => {
    if (!product || !newColor.value.trim()) {
      toast({
        title: "Validation Error",
        description: "Color name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!tenantId) {
      toast({ title: "Error", description: "Organization context missing.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("product_variants").insert({
        tenant_id: tenantId,
        product_id: product.id,
        variant_type: "color",
        variant_value: newColor.value.trim(),
        variant_display: newColor.display.trim() || newColor.value.trim(),
        hex_code: newColor.hex,
        additional_price: newColor.price,
        stock: newColor.stock,
      });

      if (error) throw error;

      toast({ title: "Color Added", description: `${newColor.value} has been added` });
      setNewColor({ value: "", display: "", hex: "#000000", price: 0, stock: 0 });
      fetchVariants();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add color",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addSizeVariant = async () => {
    if (!product || !newSize.value.trim()) {
      toast({
        title: "Validation Error",
        description: "Size value is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!tenantId) {
      toast({ title: "Error", description: "Organization context missing.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("product_variants").insert({
        tenant_id: tenantId,
        product_id: product.id,
        variant_type: "size",
        variant_value: newSize.value.trim(),
        variant_display: newSize.display.trim() || newSize.value.trim(),
        additional_price: newSize.price,
        stock: newSize.stock,
      });

      if (error) throw error;

      toast({ title: "Size Added", description: `${newSize.value} has been added` });
      setNewSize({ value: "", display: "", price: 0, stock: 0 });
      fetchVariants();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add size",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
      fetchVariants();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete variant",
        variant: "destructive",
      });
    }
  };

  const colorVariants = variants.filter(v => v.variant_type === "color");
  const sizeVariants = variants.filter(v => v.variant_type === "size");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white border-[#004B8D]/20 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#003366] flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-500" />
            Manage {terminology.product} Variants
          </DialogTitle>
          <DialogDescription className="text-[#004B8D]/60">
            Add colors and sizes for <strong>{product?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#004B8D]" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full bg-[#004B8D]/10">
              <TabsTrigger value="colors" className="flex-1 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                <Palette className="w-4 h-4 mr-2" />
                Colors ({colorVariants.length})
              </TabsTrigger>
              <TabsTrigger value="sizes" className="flex-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <Ruler className="w-4 h-4 mr-2" />
                Sizes ({sizeVariants.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-4 mt-4">
              {/* Add Color Form */}
              <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-purple-800">Add New Color</h4>
                <div className="grid grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700">Color Name *</Label>
                    <Input
                      value={newColor.value}
                      onChange={(e) => setNewColor({ ...newColor, value: e.target.value })}
                      placeholder="e.g., Black"
                      className="bg-white border-purple-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700">Display Name</Label>
                    <Input
                      value={newColor.display}
                      onChange={(e) => setNewColor({ ...newColor, display: e.target.value })}
                      placeholder="Optional"
                      className="bg-white border-purple-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700">Color</Label>
                    <Input
                      type="color"
                      value={newColor.hex}
                      onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                      className="h-9 p-1 bg-white border-purple-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700">Stock</Label>
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      value={newColor.stock}
                      onChange={(e) => setNewColor({ ...newColor, stock: parseFloat(e.target.value) || 0 })}
                      className="bg-white border-purple-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700">+Price</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newColor.price}
                      onChange={(e) => setNewColor({ ...newColor, price: parseFloat(e.target.value) || 0 })}
                      className="bg-white border-purple-200"
                    />
                  </div>
                </div>
                <Button
                  onClick={addColorVariant}
                  disabled={isSaving}
                  size="sm"
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Color
                </Button>
              </div>

              {/* Existing Colors */}
              <div className="space-y-2">
                {colorVariants.length === 0 ? (
                  <p className="text-[#004B8D]/50 text-center py-4">No colors added yet</p>
                ) : (
                  colorVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-3 bg-[#f0f7fa] rounded-lg border border-[#004B8D]/10"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white shadow"
                          style={{ backgroundColor: variant.hex_code || "#ccc" }}
                        />
                        <div>
                          <span className="text-[#003366] font-medium">{variant.variant_value}</span>
                          {variant.variant_display && variant.variant_display !== variant.variant_value && (
                            <span className="text-[#004B8D]/50 text-sm ml-2">({variant.variant_display})</span>
                          )}
                        </div>
                        <span className="text-blue-600 text-sm font-medium">{variant.stock || 0} in stock</span>
                        {variant.additional_price > 0 && (
                          <span className="text-green-600 text-sm">+K{variant.additional_price}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteVariant(variant)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="sizes" className="space-y-4 mt-4">
              {/* Add Size Form */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-blue-800">Add New Size</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-700">Size Value *</Label>
                    <Input
                      value={newSize.value}
                      onChange={(e) => setNewSize({ ...newSize, value: e.target.value })}
                      placeholder="e.g., M, L, XL"
                      className="bg-white border-blue-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-700">Display Name</Label>
                    <Input
                      value={newSize.display}
                      onChange={(e) => setNewSize({ ...newSize, display: e.target.value })}
                      placeholder="e.g., Medium"
                      className="bg-white border-blue-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-700">Stock</Label>
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      value={newSize.stock}
                      onChange={(e) => setNewSize({ ...newSize, stock: parseFloat(e.target.value) || 0 })}
                      className="bg-white border-blue-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-700">+Price</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newSize.price}
                      onChange={(e) => setNewSize({ ...newSize, price: parseFloat(e.target.value) || 0 })}
                      className="bg-white border-blue-200"
                    />
                  </div>
                </div>
                <Button
                  onClick={addSizeVariant}
                  disabled={isSaving}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Size
                </Button>
              </div>

              {/* Existing Sizes */}
              <div className="space-y-2">
                {sizeVariants.length === 0 ? (
                  <p className="text-[#004B8D]/50 text-center py-4">No sizes added yet</p>
                ) : (
                  sizeVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-3 bg-[#f0f7fa] rounded-lg border border-[#004B8D]/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                          <Ruler className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <span className="text-[#003366] font-medium">{variant.variant_value}</span>
                          {variant.variant_display && variant.variant_display !== variant.variant_value && (
                            <span className="text-[#004B8D]/50 text-sm ml-2">({variant.variant_display})</span>
                          )}
                        </div>
                        <span className="text-blue-600 text-sm font-medium">{variant.stock || 0} in stock</span>
                        {variant.additional_price > 0 && (
                          <span className="text-green-600 text-sm">+K{variant.additional_price}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteVariant(variant)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
