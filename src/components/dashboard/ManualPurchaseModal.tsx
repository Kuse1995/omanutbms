import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";

interface PurchaseItem {
  name: string;
  quantity: number;
  unit_price: number;
  tax_code: string;
}

interface ManualPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ManualPurchaseModal({ isOpen, onClose, onSuccess }: ManualPurchaseModalProps) {
  const [supplierName, setSupplierName] = useState("");
  const [supplierTin, setSupplierTin] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([{ name: "", quantity: 1, unit_price: 0, tax_code: "F" }]);
  const [submitting, setSubmitting] = useState(false);
  const { tenant } = useTenant();
  const { toast } = useToast();

  const addItem = () => setItems([...items, { name: "", quantity: 1, unit_price: 0, tax_code: "F" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof PurchaseItem, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleSubmit = async () => {
    if (!tenant?.id || !invoiceNumber || items.length === 0) {
      toast({ title: "Missing fields", description: "Please fill in invoice number and at least one item.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Submit purchase to ZRA via edge function
      const { data, error } = await supabase.functions.invoke("zra-smart-invoice", {
        body: {
          action: "save_purchase",
          tenant_id: tenant.id,
          invoice_num: invoiceNumber,
          client_name: supplierName,
          client_tin: supplierTin,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_code: item.tax_code,
          })),
          related_table: "manual_purchase",
        },
      });

      if (error) throw error;
      if (data?.success) {
        toast({ title: "Purchase recorded", description: `Purchase ${invoiceNumber} submitted to ZRA successfully.` });
        onSuccess?.();
        onClose();
        resetForm();
      } else {
        toast({ title: "ZRA submission failed", description: data?.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSupplierName("");
    setSupplierTin("");
    setInvoiceNumber("");
    setNotes("");
    setItems([{ name: "", quantity: 1, unit_price: 0, tax_code: "F" }]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Record Manual Purchase</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Supplier Name</Label>
              <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Supplier name" />
            </div>
            <div>
              <Label>Supplier TPIN</Label>
              <Input value={supplierTin} onChange={e => setSupplierTin(e.target.value)} placeholder="TPIN (optional)" />
            </div>
          </div>

          <div>
            <Label>Invoice / Receipt Number *</Label>
            <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g. PUR-2026-001" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items</Label>
              <Button variant="ghost" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input className="flex-1" placeholder="Item name" value={item.name} onChange={e => updateItem(idx, "name", e.target.value)} />
                    {items.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="text-xs">Unit Price</Label>
                      <Input type="number" min={0} step={0.01} value={item.unit_price} onChange={e => updateItem(idx, "unit_price", Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="text-xs">Tax Code</Label>
                      <Select value={item.tax_code} onValueChange={v => updateItem(idx, "tax_code", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A - Exempt</SelectItem>
                          <SelectItem value="B">B - 0%</SelectItem>
                          <SelectItem value="C">C - Tourism Levy</SelectItem>
                          <SelectItem value="D">D - Insurance</SelectItem>
                          <SelectItem value="E">E - Export</SelectItem>
                          <SelectItem value="F">F - 16% VAT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-right">
            <span className="text-muted-foreground">Total: </span>
            <span className="text-lg font-bold">K {total.toLocaleString()}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit to ZRA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
