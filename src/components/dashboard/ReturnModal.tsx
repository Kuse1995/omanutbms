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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { ProductCombobox, type ProductOption } from "./ProductCombobox";

interface ReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const RETURN_REASONS = [
  { value: "defective", label: "Defective Product" },
  { value: "wrong_item", label: "Wrong Item Delivered" },
  { value: "customer_changed_mind", label: "Customer Changed Mind" },
  { value: "damaged_in_transit", label: "Damaged in Transit" },
  { value: "not_as_described", label: "Not as Described" },
  { value: "warranty_claim", label: "Warranty Claim" },
  { value: "other", label: "Other" },
];

export function ReturnModal({ open, onOpenChange, onSuccess }: ReturnModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; sku: string; cost_price?: number } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [returnToStock, setReturnToStock] = useState(true);
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { terminology } = useBusinessConfig();

  // Fetch products for combobox
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
      setQuantity(1);
      setReason("");
      setCustomerName("");
      setNotes("");
      setReturnToStock(true);
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
      const costImpact = returnToStock ? 0 : (selectedProduct?.cost_price || 0) * quantity;

      const { error } = await supabase.from("inventory_adjustments").insert({
        tenant_id: tenantId,
        inventory_id: selectedProductId,
        adjustment_type: "return",
        quantity,
        reason: RETURN_REASONS.find((r) => r.value === reason)?.label || reason,
        customer_name: customerName.trim() || null,
        cost_impact: costImpact,
        notes: notes.trim() || null,
        return_to_stock: returnToStock,
        processed_by: user?.id || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Return Recorded",
        description: `Return of ${quantity} unit(s) has been submitted for approval`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error recording return:", error);
      toast({
        title: "Error",
        description: "Failed to record return",
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
            <RotateCcw className="w-5 h-5 text-[#0077B6]" />
            Record {terminology.product} Return
          </DialogTitle>
          <DialogDescription>
            Record a {terminology.product.toLowerCase()} return. Returns require manager approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{terminology.product} *</Label>
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
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Return Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">{terminology.customer} Name</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Optional - for tracking purposes"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="returnToStock"
              checked={returnToStock}
              onCheckedChange={(checked) => setReturnToStock(checked === true)}
            />
            <Label htmlFor="returnToStock" className="text-sm font-normal cursor-pointer">
              Return {terminology.product.toLowerCase()} to sellable stock (item is in good condition)
            </Label>
          </div>

          {!returnToStock && selectedProduct?.cost_price && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-700">
                <strong>Note:</strong> Since the {terminology.product.toLowerCase()} won't be returned to stock, this will be recorded as a loss of K{((selectedProduct.cost_price || 0) * quantity).toLocaleString()}.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
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
              className="bg-[#004B8D] hover:bg-[#003366]"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Return
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
