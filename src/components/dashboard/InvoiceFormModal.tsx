import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Package, Wrench, Truck, Settings, HardHat } from "lucide-react";
import { ProductCombobox, ProductOption } from "./ProductCombobox";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/useTenant";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

// Item type for database - aligns with business type
type ItemType = 'product' | 'service' | 'item' | 'resource';

interface InvoiceItem {
  id?: string;
  productId?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  item_type: ItemType;
  is_sourcing?: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  invoice_date: string;
  due_date: string | null;
  status: string;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number | null;
  total_amount: number;
  paid_amount: number | null;
  notes: string | null;
}

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice?: Invoice | null;
}

const QUICK_SERVICES = [
  { label: "Delivery", icon: Truck, description: "Delivery" },
  { label: "Installation", icon: Settings, description: "Installation" },
  { label: "Maintenance", icon: Wrench, description: "Maintenance" },
  { label: "Labor", icon: HardHat, description: "Labor" },
];

export function InvoiceFormModal({ isOpen, onClose, onSuccess, invoice }: InvoiceFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const { tenantId, businessProfile } = useTenant();
  const { terminology } = useBusinessConfig();
  const sourcingLabel = (businessProfile as any)?.sourcing_label || "Sourcing Required";
  
  // Get the default item type from business configuration
  const defaultItemType = terminology.defaultItemType;
  const isServiceBased = terminology.isServiceBased;
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_price: 0, amount: 0, item_type: defaultItemType },
  ]);

  useEffect(() => {
    if (tenantId) {
      fetchProducts();
    }
  }, [tenantId]);

  const fetchProducts = async () => {
    if (!tenantId) return;
    
    const { data } = await supabase
      .from("inventory")
      .select("id, name, sku, unit_price, current_stock")
      .eq("tenant_id", tenantId)
      .order("name");
    if (data) {
      setProducts(data.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit_price: Number(p.unit_price),
        current_stock: p.current_stock,
      })));
    }
  };

  useEffect(() => {
    if (invoice) {
      setClientName(invoice.client_name);
      setClientEmail(invoice.client_email || "");
      setClientPhone(invoice.client_phone || "");
      setInvoiceDate(invoice.invoice_date);
      setDueDate(invoice.due_date || "");
      setStatus(invoice.status);
      setTaxRate(invoice.tax_rate || 0);
      setNotes(invoice.notes || "");
      
      // Fetch invoice items
      fetchInvoiceItems(invoice.id);
    } else {
      resetForm();
    }
  }, [invoice, isOpen]);

  const fetchInvoiceItems = async (invoiceId: string) => {
    const { data, error } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);
    
    if (!error && data && data.length > 0) {
      setItems(data.map(item => ({
        id: item.id,
        productId: (item as any).product_id || undefined,
        description: item.description,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        amount: Number(item.amount),
        item_type: (item.item_type as ItemType) || defaultItemType,
        is_sourcing: (item as any).is_sourcing || false,
      })));
    }
  };

  const resetForm = () => {
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setStatus("draft");
    setTaxRate(0);
    setNotes("");
    setItems([{ description: "", quantity: 1, unit_price: 0, amount: 0, item_type: defaultItemType }]);
  };

  const handleAddItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, amount: 0, item_type: defaultItemType }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    if (field === "quantity" || field === "unit_price") {
      const numValue = Number(value) || 0;
      newItems[index] = {
        ...newItems[index],
        [field]: numValue,
        amount: field === "quantity" 
          ? numValue * newItems[index].unit_price 
          : newItems[index].quantity * numValue,
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...items];
      const isOutOfStock = product.current_stock === 0;
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        description: product.name,
        unit_price: product.unit_price,
        amount: newItems[index].quantity * product.unit_price,
        item_type: 'product',
        is_sourcing: isOutOfStock,
      };
      setItems(newItems);
    } else {
      // Clear product selection
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        productId: undefined,
        is_sourcing: false,
      };
      setItems(newItems);
    }
  };

  const handleItemTypeToggle = (index: number, newType: 'product' | 'service') => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      item_type: newType,
      productId: newType === 'service' ? undefined : newItems[index].productId,
      is_sourcing: newType === 'service' ? false : newItems[index].is_sourcing,
    };
    setItems(newItems);
  };

  const handleQuickService = (index: number, serviceDescription: string) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      description: serviceDescription,
      item_type: 'service',
      productId: undefined,
      is_sourcing: false,
    };
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName.trim()) {
      toast({ title: "Error", description: `${terminology.customer} name is required`, variant: "destructive" });
      return;
    }

    if (items.some(item => !item.description.trim())) {
      toast({ title: "Error", description: "All items must have a description", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const invoiceData = {
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || null,
        client_phone: clientPhone.trim() || null,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        status,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes: notes.trim() || null,
        created_by: user?.id || null,
        // Sync paid_amount with status: if "paid", set to total; otherwise preserve existing or 0
        paid_amount: status === "paid" ? totalAmount : (invoice?.paid_amount || 0),
      };

      let invoiceId: string;
      const isNewInvoice = !invoice;

      if (!tenantId) {
        toast({ title: "Error", description: "Organization context missing. Please log in again.", variant: "destructive" });
        return;
      }

      if (invoice) {
        // Update existing invoice
        const { error } = await supabase
          .from("invoices")
          .update(invoiceData)
          .eq("id", invoice.id);

        if (error) throw error;
        invoiceId = invoice.id;

        // Delete existing items and re-insert
        await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
      } else {
        // Create new invoice
        const { data, error } = await supabase
          .from("invoices")
          .insert({ ...invoiceData, invoice_number: "", tenant_id: tenantId })
          .select("id")
          .single();

        if (error) throw error;
        invoiceId = data.id;
      }

      // Insert items with product_id for tracking
      const itemsData = items.map(item => ({
        invoice_id: invoiceId,
        tenant_id: tenantId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        item_type: item.item_type,
        product_id: item.productId || null,
        is_sourcing: item.is_sourcing || false,
        sourcing_status: item.is_sourcing ? 'pending' : null,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(itemsData as any);

      if (itemsError) throw itemsError;

      // Deduct inventory for NEW invoices only (not edits) for product items that are NOT sourcing
      if (isNewInvoice) {
        for (const item of items) {
          if (item.item_type === 'product' && item.productId && !item.is_sourcing) {
            const product = products.find(p => p.id === item.productId);
            if (product && product.current_stock > 0) {
              const newStock = Math.max(0, product.current_stock - item.quantity);
              await supabase
                .from('inventory')
                .update({ current_stock: newStock })
                .eq('id', item.productId)
                .eq('tenant_id', tenantId);
            }
          }
        }
      }

      toast({
        title: "Success",
        description: invoice ? "Invoice updated successfully" : "Invoice created successfully",
      });

      // Refresh products to get updated stock
      fetchProducts();
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save invoice",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white text-gray-900 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            {invoice ? "Edit Invoice" : "Create New Invoice"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Client Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="clientName">{terminology.customer} Name *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={`${terminology.customer} name`}
                required
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">{terminology.customer} Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder={`${terminology.customer.toLowerCase()}@email.com`}
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">{terminology.customer} Phone</Label>
              <Input
                id="clientPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+260..."
              />
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
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
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="p-3 border rounded-lg bg-muted/20 space-y-2">
                  {/* Item Type Toggle */}
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      type="button"
                      variant={item.item_type === 'product' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleItemTypeToggle(index, 'product')}
                      className="h-7 text-xs"
                    >
                      <Package className="h-3 w-3 mr-1" />
                      {terminology.product}
                    </Button>
                    <Button
                      type="button"
                      variant={item.item_type === 'service' ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleItemTypeToggle(index, 'service')}
                      className="h-7 text-xs"
                    >
                      <Wrench className="h-3 w-3 mr-1" />
                      Service
                    </Button>
                    
                    {item.item_type === 'service' && (
                      <div className="flex gap-1 ml-2">
                        {QUICK_SERVICES.map(service => (
                          <Button
                            key={service.label}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuickService(index, service.description)}
                            className="h-7 text-xs px-2"
                            title={service.label}
                          >
                            <service.icon className="h-3 w-3" />
                          </Button>
                        ))}
                      </div>
                    )}

                    {item.is_sourcing && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs ml-auto">
                        {sourcingLabel || "Sourcing Required"}
                      </Badge>
                    )}
                  </div>

                  {/* Item Details Row */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {item.item_type === 'product' ? (
                        <ProductCombobox
                          products={products}
                          value={item.productId || ""}
                          onValueChange={(productId) => handleProductSelect(index, productId)}
                          placeholder="Select product..."
                          showStock={true}
                          showPrice={true}
                        />
                      ) : (
                        <Input
                          placeholder="Service description"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        />
                      )}
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Price"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="text"
                        value={`K ${item.amount.toLocaleString()}`}
                        disabled
                        className="bg-muted/50"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>K {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Tax Rate (%):</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                  className="w-20"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax Amount:</span>
                <span>K {taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>K {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#004B8D] hover:bg-[#003a6d]">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {invoice ? "Update Invoice" : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
