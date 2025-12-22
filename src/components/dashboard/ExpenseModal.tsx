import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ProductCombobox, ProductOption } from "./ProductCombobox";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expenseToEdit?: {
    id: string;
    date_incurred: string;
    category: string;
    amount_zmw: number;
    vendor_name: string;
    notes: string | null;
  } | null;
}

const EXPENSE_CATEGORIES = [
  "Cost of Goods Sold - Vestergaard",
  "Salaries",
  "Marketing",
  "Operations/Rent",
  "Other",
] as const;

export function ExpenseModal({ isOpen, onClose, onSuccess, expenseToEdit }: ExpenseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [formData, setFormData] = useState({
    date_incurred: new Date().toISOString().split("T")[0],
    category: "",
    amount_zmw: "",
    vendor_name: "",
    notes: "",
  });
  const { toast } = useToast();

  const isEditMode = !!expenseToEdit;

  // Populate form when editing
  useEffect(() => {
    if (expenseToEdit) {
      setFormData({
        date_incurred: expenseToEdit.date_incurred,
        category: expenseToEdit.category,
        amount_zmw: expenseToEdit.amount_zmw.toString(),
        vendor_name: expenseToEdit.vendor_name,
        notes: expenseToEdit.notes || "",
      });
    } else {
      setFormData({
        date_incurred: new Date().toISOString().split("T")[0],
        category: "",
        amount_zmw: "",
        vendor_name: "",
        notes: "",
      });
    }
  }, [expenseToEdit, isOpen]);

  // Fetch products for COGS linking
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("id, name, sku, unit_price, current_stock")
        .order("name");
      
      if (!error && data) {
        setProducts(data);
      }
    };
    
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  // Reset product selection when category changes
  useEffect(() => {
    if (formData.category !== "Cost of Goods Sold - Vestergaard") {
      setSelectedProductId("");
    }
  }, [formData.category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount_zmw || !formData.vendor_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Build notes with product reference if COGS
      let finalNotes = formData.notes.trim() || "";
      if (formData.category === "Cost of Goods Sold - Vestergaard" && selectedProductId) {
        const product = products.find(p => p.id === selectedProductId);
        if (product) {
          finalNotes = `Product: ${product.name} (${product.sku})${finalNotes ? ` - ${finalNotes}` : ""}`;
        }
      }

      if (isEditMode && expenseToEdit) {
        const { error } = await supabase.from("expenses").update({
          date_incurred: formData.date_incurred,
          category: formData.category,
          amount_zmw: parseFloat(formData.amount_zmw),
          vendor_name: formData.vendor_name.trim(),
          notes: finalNotes || null,
        }).eq("id", expenseToEdit.id);

        if (error) throw error;

        toast({
          title: "Expense Updated",
          description: "The expense has been successfully updated",
        });
      } else {
        const { error } = await supabase.from("expenses").insert({
          date_incurred: formData.date_incurred,
          category: formData.category,
          amount_zmw: parseFloat(formData.amount_zmw),
          vendor_name: formData.vendor_name.trim(),
          notes: finalNotes || null,
          recorded_by: userData.user?.id,
        });

        if (error) throw error;

        toast({
          title: "Expense Recorded",
          description: "The expense has been successfully recorded",
        });
      }

      setFormData({
        date_incurred: new Date().toISOString().split("T")[0],
        category: "",
        amount_zmw: "",
        vendor_name: "",
        notes: "",
      });
      setSelectedProductId("");
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast({
        title: "Error",
        description: "Failed to save expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-[#004B8D]/20 text-[#003366] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#003366]">{isEditMode ? "Edit Expense" : "Record Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date_incurred" className="text-[#004B8D]">
              Date Incurred *
            </Label>
            <Input
              id="date_incurred"
              type="date"
              value={formData.date_incurred}
              onChange={(e) =>
                setFormData({ ...formData, date_incurred: e.target.value })
              }
              className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-[#004B8D]">
              Category *
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#004B8D]/20 z-50">
                {EXPENSE_CATEGORIES.map((category) => (
                  <SelectItem
                    key={category}
                    value={category}
                    className="text-[#003366] hover:bg-[#004B8D]/10 focus:bg-[#004B8D]/10"
                  >
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Selection for COGS */}
          {formData.category === "Cost of Goods Sold - Vestergaard" && (
            <div className="space-y-2">
              <Label className="text-[#004B8D]">
                Link to Product (Optional)
              </Label>
              <ProductCombobox
                products={products}
                value={selectedProductId}
                onValueChange={setSelectedProductId}
                placeholder="Select product to link..."
                showStock={false}
                showPrice={true}
              />
              <p className="text-xs text-[#004B8D]/50">
                Link this expense to a specific product for better tracking
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount_zmw" className="text-[#004B8D]">
              Amount (ZMW) *
            </Label>
            <Input
              id="amount_zmw"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount_zmw}
              onChange={(e) =>
                setFormData({ ...formData, amount_zmw: e.target.value })
              }
              className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor_name" className="text-[#004B8D]">
              Vendor Name *
            </Label>
            <Input
              id="vendor_name"
              type="text"
              placeholder="Enter vendor name"
              value={formData.vendor_name}
              onChange={(e) =>
                setFormData({ ...formData, vendor_name: e.target.value })
              }
              className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[#004B8D]">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Optional notes about this expense"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-[#004B8D]/20 text-[#004B8D] hover:bg-[#004B8D]/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#004B8D] hover:bg-[#003366] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditMode ? (
                "Update Expense"
              ) : (
                "Record Expense"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
