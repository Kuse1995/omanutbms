import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, FileCheck, ArrowRight, Package, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/useTenant";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

// Item type for database - aligns with business type
type ItemType = 'product' | 'service' | 'item' | 'resource';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  item_type?: ItemType;
}

interface ConversionItem extends QuotationItem {
  original_amount: number;
  adjusted_price: number;
  discount_applied: number;
}

interface Quotation {
  id: string;
  quotation_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  quotation_date: string;
  valid_until: string | null;
  status: string;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number | null;
  total_amount: number;
  notes: string | null;
}

interface QuotationToInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  quotation: Quotation | null;
}

export function QuotationToInvoiceModal({ isOpen, onClose, onSuccess, quotation }: QuotationToInvoiceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { terminology, logoUrl, companyName } = useBusinessConfig();
  
  const defaultItemType = terminology.defaultItemType;

  useEffect(() => {
    if (quotation && isOpen) {
      fetchQuotationItems();
      setTaxRate(quotation.tax_rate || 0);
      setNotes(quotation.notes || "");
      // Set due date to 30 days from now
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      setDueDate(thirtyDaysFromNow.toISOString().split("T")[0]);
    }
  }, [quotation, isOpen]);

  const fetchQuotationItems = async () => {
    if (!quotation) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", quotation.id);

    if (!error && data) {
      setItems(data.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        amount: Number(item.amount),
        item_type: defaultItemType,
        original_amount: Number(item.amount),
        adjusted_price: Number(item.unit_price),
        discount_applied: 0,
      })));
    }
    setIsLoading(false);
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    const newItems = [...items];
    const item = newItems[index];
    const newAmount = item.quantity * newPrice;
    const discount = item.original_amount - newAmount;
    
    newItems[index] = {
      ...item,
      adjusted_price: newPrice,
      amount: newAmount,
      discount_applied: discount > 0 ? discount : 0,
    };
    setItems(newItems);
  };

  const handleQuantityChange = (index: number, newQty: number) => {
    const newItems = [...items];
    const item = newItems[index];
    const originalUnitPrice = item.original_amount / item.quantity;
    const newOriginalAmount = newQty * originalUnitPrice;
    const newAmount = newQty * item.adjusted_price;
    
    newItems[index] = {
      ...item,
      quantity: newQty,
      original_amount: newOriginalAmount,
      amount: newAmount,
      discount_applied: newOriginalAmount - newAmount > 0 ? newOriginalAmount - newAmount : 0,
    };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const originalSubtotal = items.reduce((sum, item) => sum + item.original_amount, 0);
  const adjustedSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalDiscount = originalSubtotal - adjustedSubtotal;
  const taxAmount = adjustedSubtotal * (taxRate / 100);
  const totalAmount = adjustedSubtotal + taxAmount;

  const handleConvert = async () => {
    if (!quotation) return;
    
    if (!tenantId) {
      toast({ title: "Error", description: "Organization context missing. Please log in again.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create invoice with discount info and source quotation reference
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          tenant_id: tenantId,
          invoice_number: "",
          client_name: quotation.client_name,
          client_email: quotation.client_email,
          client_phone: quotation.client_phone,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          status: "draft",
          subtotal: adjustedSubtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes: notes || null,
          created_by: user?.id || null,
          discount_amount: totalDiscount,
          discount_reason: discountReason || null,
          source_quotation_id: quotation.id,
        })
        .select("id")
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items with discount tracking
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        tenant_id: tenantId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.adjusted_price,
        amount: item.amount,
        item_type: item.item_type || defaultItemType,
        original_amount: item.original_amount,
        discount_applied: item.discount_applied,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update quotation status
      await supabase
        .from("quotations")
        .update({ 
          status: "converted", 
          converted_to_invoice_id: invoice.id 
        })
        .eq("id", quotation.id);

      toast({ 
        title: "Success", 
        description: `Quotation ${quotation.quotation_number} converted to invoice${totalDiscount > 0 ? ` with K ${totalDiscount.toLocaleString()} discount` : ""}` 
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error converting quotation:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!quotation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white text-gray-900 max-h-[90vh] flex flex-col">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-gray-900">
            {logoUrl && <img src={logoUrl} alt={companyName || 'Company'} className="h-10 w-auto" />}
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-green-600" />
              <span>Convert Quotation to {terminology.invoice}</span>
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {quotation.quotation_number}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">New {terminology.invoice}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Client Info (read-only) */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Client</h3>
              <p className="font-semibold">{quotation.client_name}</p>
              {quotation.client_email && <p className="text-sm text-muted-foreground">{quotation.client_email}</p>}
              {quotation.client_phone && <p className="text-sm text-muted-foreground">{quotation.client_phone}</p>}
            </div>

            {/* Invoice Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items with Discount Editing */}
            <div>
              <Label className="mb-2 block">Line Items (adjust prices to apply discounts)</Label>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
                  <div className="col-span-4">Description</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-2 text-right">Original</div>
                  <div className="col-span-2 text-right">Adjusted</div>
                  <div className="col-span-2 text-right">Discount</div>
                  <div className="col-span-1"></div>
                </div>

                {items.map((item, index) => {
                  const hasDiscount = item.discount_applied > 0;
                  return (
                    <div 
                      key={item.id} 
                      className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${hasDiscount ? "bg-green-50 border border-green-200" : "bg-muted/30"}`}
                    >
                      <div className="col-span-4 flex items-center gap-2">
                        {item.description.toLowerCase().includes("delivery") || 
                         item.description.toLowerCase().includes("installation") ||
                         item.description.toLowerCase().includes("maintenance") ||
                         item.description.toLowerCase().includes("labor") ? (
                          <Wrench className="h-4 w-4 text-amber-600 shrink-0" />
                        ) : (
                          <Package className="h-4 w-4 text-blue-600 shrink-0" />
                        )}
                        <span className="truncate text-sm">{item.description}</span>
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, Number(e.target.value) || 1)}
                          className="h-8 text-center text-sm"
                        />
                      </div>
                      <div className="col-span-2 text-right text-sm text-muted-foreground">
                        K {item.original_amount.toLocaleString()}
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.adjusted_price}
                          onChange={(e) => handlePriceChange(index, Number(e.target.value) || 0)}
                          className={`h-8 text-right text-sm ${hasDiscount ? "border-green-400 bg-white" : ""}`}
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        {hasDiscount ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            -K {item.discount_applied.toLocaleString()}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Discount Reason */}
            {totalDiscount > 0 && (
              <div>
                <Label htmlFor="discountReason">Discount Reason</Label>
                <Input
                  id="discountReason"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="e.g., Loyalty discount, Volume discount, Negotiated rate..."
                />
              </div>
            )}

            {/* Tax Rate */}
            <div className="w-48">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Invoice notes..."
                rows={2}
              />
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2 p-4 bg-muted/30 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Original Subtotal:</span>
                  <span className="line-through text-muted-foreground">K {originalSubtotal.toLocaleString()}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount Applied:</span>
                    <span>- K {totalDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>K {adjustedSubtotal.toLocaleString()}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({taxRate}%):</span>
                    <span>K {taxAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>K {totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleConvert} 
            disabled={isSaving || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4 mr-2" />
                Create Invoice
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
