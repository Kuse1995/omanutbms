import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, PackageX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { ProductCombobox, type ProductOption } from "./ProductCombobox";

interface DamageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const DAMAGE_TYPES = [
  { value: "damage", label: "Damaged" },
  { value: "loss", label: "Lost/Missing" },
  { value: "expired", label: "Expired" },
];

const DAMAGE_REASONS = [
  { value: "shipping_damage", label: "Shipping/Transit Damage" },
  { value: "handling_damage", label: "Handling Damage" },
  { value: "storage_damage", label: "Storage Damage" },
  { value: "manufacturing_defect", label: "Manufacturing Defect" },
  { value: "water_damage", label: "Water Damage" },
  { value: "expired_product", label: "Product Expired" },
  { value: "theft_suspected", label: "Theft Suspected" },
  { value: "inventory_count", label: "Inventory Count Discrepancy" },
  { value: "other", label: "Other" },
];

export function DamageModal({ open, onOpenChange, onSuccess }: DamageModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; sku: string; cost_price?: number } | null>(null);
  const [damageType, setDamageType] = useState("damage");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { user } = useAuth();

  useEffect(() => {
    const fetchProducts = async () => {
      if (!tenantId) return;
      
      const { data } = await supabase
        .from("inventory")
        .select("id, name, sku, unit_price, current_stock, cost_price")
        .eq("tenant_id", tenantId)
        .order("name");
      
      setProducts((data || []).map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit_price: p.unit_price,
        current_stock: p.current_stock,
      })));
    };
    
    if (open) {
      fetchProducts();
    }
  }, [tenantId, open]);

  useEffect(() => {
    if (!open) {
      setSelectedProductId("");
      setSelectedProduct(null);
      setDamageType("damage");
      setQuantity(1);
      setReason("");
      setNotes("");
    }
  }, [open]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!selectedProductId) {
        setSelectedProduct(null);
        return;
      }

      const { data } = await supabase
        .from("inventory")
        .select("id, name, sku, cost_price")
        .eq("id", selectedProductId)
        .single();

      setSelectedProduct(data);
    };

    fetchProduct();
  }, [selectedProductId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId || !reason) {
      toast({
        title: "Validation Error",
        description: "Please select a product and reason",
        variant: "destructive",
      });
      return;
    }

    if (quantity < 1) {
      toast({
        title: "Validation Error",
        description: "Quantity must be at least 1",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const costImpact = (selectedProduct?.cost_price || 0) * quantity;

      const { error } = await supabase.from("inventory_adjustments").insert({
        tenant_id: tenantId,
        inventory_id: selectedProductId,
        adjustment_type: damageType,
        quantity,
        reason: DAMAGE_REASONS.find((r) => r.value === reason)?.label || reason,
        customer_name: null,
        cost_impact: costImpact,
        notes: notes.trim() || null,
        return_to_stock: false,
        processed_by: user?.id || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Damage Recorded",
        description: `${DAMAGE_TYPES.find((t) => t.value === damageType)?.label || damageType} of ${quantity} unit(s) has been submitted for approval`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error recording damage:", error);
      toast({
        title: "Error",
        description: "Failed to record damage",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#003366]">
            <PackageX className="w-5 h-5 text-red-500" />
            Record Damage / Loss
          </DialogTitle>
          <DialogDescription>
            Record damaged, lost, or expired products. This requires manager approval before stock is adjusted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Product *</Label>
            <ProductCombobox
              products={products}
              value={selectedProductId}
              onValueChange={setSelectedProductId}
              showStock={false}
            />
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                SKU: {selectedProduct.sku}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="damageType">Type *</Label>
              <Select value={damageType} onValueChange={setDamageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAMAGE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {DAMAGE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct?.cost_price && quantity > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                <strong>Estimated Loss:</strong> K{((selectedProduct.cost_price || 0) * quantity).toLocaleString()}
              </p>
              <p className="text-xs text-red-600 mt-1">
                This represents the cost value of the {damageType === "expired" ? "expired" : "damaged/lost"} inventory.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the damage, circumstances, etc..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
