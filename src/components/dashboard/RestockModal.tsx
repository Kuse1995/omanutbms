import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useBranch } from "@/hooks/useBranch";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { Loader2, PackagePlus, TrendingUp, TrendingDown } from "lucide-react";

interface ProductVariant {
  id: string;
  variant_type: string;
  variant_value: string;
  variant_display: string | null;
  hex_code: string | null;
  stock: number;
}

interface RestockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    sku: string;
    current_stock: number;
    cost_price?: number;
  } | null;
  onSuccess: () => void;
  currencySymbol?: string;
}

export function RestockModal({ 
  open, 
  onOpenChange, 
  product, 
  onSuccess,
  currencySymbol = "K"
}: RestockModalProps) {
  const [quantity, setQuantity] = useState<number>(0);
  const [costPerUnit, setCostPerUnit] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [costRecordingOption, setCostRecordingOption] = useState<"opening" | "expense">("opening");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("base");
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { currentBranch } = useBranch();
  const { user } = useAuth();
  const { businessType, terminology } = useBusinessConfig();

  const isFashionMode = businessType === "fashion";
  const selectedVariant = variants.find(v => v.id === selectedVariantId);

  // Fetch variants when modal opens for fashion mode
  useEffect(() => {
    const fetchVariants = async () => {
      if (!open || !product || !tenantId || !isFashionMode) {
        setVariants([]);
        return;
      }

      setIsLoadingVariants(true);
      try {
        const { data, error } = await supabase
          .from("product_variants")
          .select("id, variant_type, variant_value, variant_display, hex_code, stock")
          .eq("product_id", product.id)
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("variant_type")
          .order("variant_value");

        if (error) throw error;
        setVariants(data || []);
      } catch (error) {
        console.error("Error fetching variants:", error);
      } finally {
        setIsLoadingVariants(false);
      }
    };

    fetchVariants();
  }, [open, product, tenantId, isFashionMode]);

  // Reset form when product changes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setQuantity(0);
      setCostPerUnit(product?.cost_price || 0);
      setNotes("");
      setCostRecordingOption("opening");
      setSelectedVariantId("base");
    } else if (product) {
      setCostPerUnit(product.cost_price || 0);
    }
    onOpenChange(isOpen);
  };

  const currentStock = selectedVariantId === "base" 
    ? product?.current_stock || 0 
    : selectedVariant?.stock || 0;

  const totalCost = quantity * costPerUnit;
  const newStock = currentStock + quantity;

  const handleSubmit = async () => {
    if (!product || !tenantId || quantity <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid quantity greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update stock based on whether we're restocking a variant or base product
      if (selectedVariantId !== "base" && selectedVariant) {
        // Update variant stock
        const { error: variantError } = await supabase
          .from("product_variants")
          .update({ stock: newStock })
          .eq("id", selectedVariantId);

        if (variantError) throw variantError;
      } else {
        // Update base inventory stock
        const { error: updateError } = await supabase
          .from("inventory")
          .update({ 
            current_stock: newStock,
            // Update cost_price if a new cost is provided
            ...(costPerUnit > 0 && { cost_price: costPerUnit })
          })
          .eq("id", product.id);

        if (updateError) throw updateError;
      }

      // 2. Record restock history
      const variantLabel = selectedVariant 
        ? `${selectedVariant.variant_type}: ${selectedVariant.variant_value}`
        : null;
      
      const { error: historyError } = await supabase
        .from("restock_history")
        .insert({
          tenant_id: tenantId,
          inventory_id: product.id,
          quantity,
          cost_per_unit: costPerUnit,
          total_cost: totalCost,
          recorded_as_expense: costRecordingOption === "expense",
          notes: variantLabel ? `[${variantLabel}] ${notes || ''}`.trim() : notes || null,
          restocked_by: user?.id,
          branch_id: currentBranch?.id || null,
        });

      if (historyError) throw historyError;

      // 3. If recording as expense, create expense record
      if (costRecordingOption === "expense" && totalCost > 0) {
        const { error: expenseError } = await supabase
          .from("expenses")
          .insert({
            tenant_id: tenantId,
            vendor_name: "Inventory Restock",
            category: "Cost of Goods Sold - Vestergaard",
            amount_zmw: totalCost,
            date_incurred: new Date().toISOString().split("T")[0],
            notes: `Restocked ${quantity} units of ${product.name} (SKU: ${product.sku})${notes ? ` - ${notes}` : ""}`,
            recorded_by: user?.id,
            branch_id: currentBranch?.id || null,
          });

        if (expenseError) throw expenseError;
      }

      const stockLabel = selectedVariant 
        ? `${selectedVariant.variant_value}` 
        : product.name;
      
      toast({
        title: "Stock updated",
        description: `Added ${quantity} units to ${stockLabel}. New stock: ${newStock}`,
      });

      handleOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error restocking:", error);
      toast({
        title: "Error",
        description: "Failed to update stock. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-[#0077B6]" />
            Restock {terminology.product}
          </DialogTitle>
          <DialogDescription>
            Add stock for <span className="font-semibold text-[#003366]">{product.name}</span> ({product.sku})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Variant Selection - Fashion mode only */}
          {isFashionMode && variants.length > 0 && (
            <div className="space-y-2">
              <Label>Restock Target</Label>
              <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <SelectTrigger className="bg-[#f0f7fa] border-[#004B8D]/20">
                  <SelectValue placeholder="Select what to restock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">
                    Base {terminology.product} (all stock)
                  </SelectItem>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="flex items-center gap-2">
                        {v.variant_type === "color" && v.hex_code && (
                          <span
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: v.hex_code }}
                          />
                        )}
                        {v.variant_type === "size" ? `Size ${v.variant_value}` : v.variant_value}
                        <span className="text-xs text-muted-foreground">
                          ({v.stock} in stock)
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Current Stock Display */}
          <div className="flex items-center justify-between p-3 bg-[#f0f7fa] rounded-lg">
            <span className="text-sm text-[#004B8D]">
              {selectedVariantId !== "base" && selectedVariant
                ? `Current ${selectedVariant.variant_type === "size" ? "Size" : "Color"} Stock`
                : "Current Stock"
              }
            </span>
            <span className="text-lg font-bold text-[#003366]">{currentStock} units</span>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Add</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity || ""}
              onChange={(e) => setQuantity(Number(e.target.value) || 0)}
              placeholder="Enter quantity"
              className="text-lg"
            />
          </div>

          {/* Cost Per Unit Input */}
          <div className="space-y-2">
            <Label htmlFor="cost">Cost Per Unit ({currencySymbol})</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              value={costPerUnit || ""}
              onChange={(e) => setCostPerUnit(Number(e.target.value) || 0)}
              placeholder={product.cost_price ? `Last: ${currencySymbol}${product.cost_price}` : "Enter cost"}
            />
          </div>

          {/* Total Cost Display */}
          {totalCost > 0 && (
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-sm text-amber-700">Total Restock Cost</span>
              <span className="text-lg font-bold text-amber-800">{currencySymbol}{totalCost.toLocaleString()}</span>
            </div>
          )}

          {/* Cost Recording Options */}
          {totalCost > 0 && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-[#003366] font-medium">
                How should we record this cost?
              </p>

              <RadioGroup
                value={costRecordingOption}
                onValueChange={(value: "opening" | "expense") => setCostRecordingOption(value)}
                className="space-y-2"
              >
                {/* Option 1: Opening Stock */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    costRecordingOption === "opening"
                      ? "bg-white border-[#0077B6] ring-1 ring-[#0077B6]"
                      : "bg-white/50 border-[#004B8D]/20 hover:border-[#004B8D]/40"
                  }`}
                >
                  <RadioGroupItem value="opening" className="mt-1" />
                  <div className="flex-1">
                    <span className="font-medium text-[#003366] block flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      Don't Record as Expense
                    </span>
                    <span className="text-xs text-[#004B8D]/70 block mt-1">
                      Stock will be added but <strong>profit won't be affected</strong>. Good for inventory corrections or stock you already owned.
                    </span>
                  </div>
                </label>

                {/* Option 2: Record as Expense */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    costRecordingOption === "expense"
                      ? "bg-white border-[#0077B6] ring-1 ring-[#0077B6]"
                      : "bg-white/50 border-[#004B8D]/20 hover:border-[#004B8D]/40"
                  }`}
                >
                  <RadioGroupItem value="expense" className="mt-1" />
                  <div className="flex-1">
                    <span className="font-medium text-[#003366] block flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-amber-600" />
                      Record as Today's Expense
                    </span>
                    <span className="text-xs text-[#004B8D]/70 block mt-1">
                      This will <strong>reduce today's profit</strong> by {currencySymbol}{totalCost.toLocaleString()}. Use for new purchases made today.
                    </span>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Supplier name, invoice number..."
              className="resize-none h-20"
            />
          </div>

          {/* New Stock Preview */}
          {quantity > 0 && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-sm text-emerald-700">New Stock Level</span>
              <span className="text-lg font-bold text-emerald-800">{newStock} units</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || quantity <= 0}
            className="bg-[#004B8D] hover:bg-[#003366]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <PackagePlus className="h-4 w-4 mr-2" />
                Add Stock
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}