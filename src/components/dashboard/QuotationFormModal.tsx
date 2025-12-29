import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Package, Wrench, Truck, Settings, HardHat } from "lucide-react";
import { ProductCombobox, ProductOption } from "./ProductCombobox";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/useTenant";

interface QuotationItem {
  id?: string;
  productId?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  item_type: "product" | "service";
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

interface QuotationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  quotation?: Quotation | null;
}

const QUICK_SERVICES = [
  { label: "Delivery", icon: Truck, description: "Delivery" },
  { label: "Installation", icon: Settings, description: "Installation" },
  { label: "Maintenance", icon: Wrench, description: "Maintenance" },
  { label: "Labor", icon: HardHat, description: "Labor" },
];

export function QuotationFormModal({ isOpen, onClose, onSuccess, quotation }: QuotationFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([
    { description: "", quantity: 1, unit_price: 0, amount: 0, item_type: "product" },
  ]);
  const { toast } = useToast();
  const { tenantId } = useTenant();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("inventory")
      .select("id, name, sku, unit_price, current_stock")
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
    if (quotation) {
      setClientName(quotation.client_name);
      setClientEmail(quotation.client_email || "");
      setClientPhone(quotation.client_phone || "");
      setQuotationDate(quotation.quotation_date);
      setValidUntil(quotation.valid_until || "");
      setTaxRate(quotation.tax_rate || 0);
      setNotes(quotation.notes || "");
      fetchQuotationItems(quotation.id);
    } else {
      resetForm();
    }
  }, [quotation, isOpen]);

  const fetchQuotationItems = async (quotationId: string) => {
    const { data, error } = await supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", quotationId);
    
    if (!error && data && data.length > 0) {
      setItems(data.map(item => {
        // Determine if this is a product or service based on whether we can find a matching product
        const matchingProduct = products.find(p => p.name === item.description);
        return {
          id: item.id,
          productId: matchingProduct?.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          amount: Number(item.amount),
          item_type: matchingProduct ? "product" : "service" as "product" | "service",
        };
      }));
    }
  };

  const resetForm = () => {
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setQuotationDate(new Date().toISOString().split("T")[0]);
    // Set valid_until to 30 days from now
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    setValidUntil(thirtyDaysFromNow.toISOString().split("T")[0]);
    setTaxRate(0);
    setNotes("");
    setItems([{ description: "", quantity: 1, unit_price: 0, amount: 0, item_type: "product" }]);
  };

  const handleAddItem = (type: "product" | "service" = "product") => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, amount: 0, item_type: type }]);
  };

  const handleAddQuickService = (serviceDescription: string) => {
    setItems([...items, { 
      description: serviceDescription, 
      quantity: 1, 
      unit_price: 0, 
      amount: 0, 
      item_type: "service" 
    }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemTypeChange = (index: number, newType: "product" | "service") => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      item_type: newType,
      description: "",
      productId: undefined,
      unit_price: 0,
      amount: 0,
    };
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof QuotationItem, value: string | number) => {
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
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        description: product.name,
        unit_price: product.unit_price,
        amount: newItems[index].quantity * product.unit_price,
      };
      setItems(newItems);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName.trim()) {
      toast({ title: "Error", description: "Client name is required", variant: "destructive" });
      return;
    }

    if (items.some(item => !item.description.trim())) {
      toast({ title: "Error", description: "All items must have a description", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const quotationData = {
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || null,
        client_phone: clientPhone.trim() || null,
        quotation_date: quotationDate,
        valid_until: validUntil || null,
        status: "draft",
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes: notes.trim() || null,
        created_by: user?.id || null,
      };

      let quotationId: string;

      if (!tenantId) {
        toast({ title: "Error", description: "Organization context missing. Please log in again.", variant: "destructive" });
        return;
      }

      if (quotation) {
        const { error } = await supabase
          .from("quotations")
          .update(quotationData)
          .eq("id", quotation.id);

        if (error) throw error;
        quotationId = quotation.id;

        await supabase.from("quotation_items").delete().eq("quotation_id", quotationId);
      } else {
        const { data, error } = await supabase
          .from("quotations")
          .insert({ ...quotationData, quotation_number: "", tenant_id: tenantId })
          .select("id")
          .single();

        if (error) throw error;
        quotationId = data.id;
      }

      const itemsData = items.map(item => ({
        quotation_id: quotationId,
        tenant_id: tenantId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
      }));

      const { error: itemsError } = await supabase
        .from("quotation_items")
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: quotation ? "Quotation updated successfully" : "Quotation created successfully",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving quotation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save quotation",
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
            {quotation ? "Edit Quotation" : "Create New Quotation"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client name"
                required
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">Client Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@email.com"
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Client Phone</Label>
              <Input
                id="clientPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+260..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quotationDate">Quotation Date *</Label>
              <Input
                id="quotationDate"
                type="date"
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line Items</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleAddItem("product")}>
                  <Package className="h-4 w-4 mr-1" />
                  Add Product
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleAddItem("service")}>
                  <Wrench className="h-4 w-4 mr-1" />
                  Add Service
                </Button>
              </div>
            </div>

            {/* Quick Service Buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs text-muted-foreground self-center mr-1">Quick add:</span>
              {QUICK_SERVICES.map((service) => (
                <Button
                  key={service.label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs bg-muted/50 hover:bg-muted"
                  onClick={() => handleAddQuickService(service.description)}
                >
                  <service.icon className="h-3 w-3 mr-1" />
                  {service.label}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg bg-muted/30">
                  {/* Type Toggle */}
                  <div className="col-span-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant={item.item_type === "product" ? "default" : "outline"}
                        size="sm"
                        className={`h-8 px-2 text-xs ${item.item_type === "product" ? "bg-[#004B8D]" : ""}`}
                        onClick={() => handleItemTypeChange(index, "product")}
                      >
                        <Package className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant={item.item_type === "service" ? "default" : "outline"}
                        size="sm"
                        className={`h-8 px-2 text-xs ${item.item_type === "service" ? "bg-amber-600" : ""}`}
                        onClick={() => handleItemTypeChange(index, "service")}
                      >
                        <Wrench className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Description/Product Selector */}
                  <div className="col-span-4">
                    {item.item_type === "product" ? (
                      <ProductCombobox
                        products={products}
                        value={item.productId || ""}
                        onValueChange={(productId) => handleProductSelect(index, productId)}
                        placeholder="Select product..."
                      />
                    ) : (
                      <div className="relative">
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          placeholder="Service description..."
                          className="pr-16"
                        />
                        <Badge 
                          variant="secondary" 
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-amber-100 text-amber-700"
                        >
                          Service
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                    />
                  </div>

                  {/* Unit Price */}
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

                  {/* Amount */}
                  <div className="col-span-1">
                    <Input
                      type="text"
                      value={`K ${item.amount.toLocaleString()}`}
                      disabled
                      className="bg-gray-50 text-xs"
                    />
                  </div>

                  {/* Delete */}
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
              ))}
            </div>
          </div>

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

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Terms and conditions, validity period, etc."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#004B8D] hover:bg-[#003a6d]">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {quotation ? "Update Quotation" : "Create Quotation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
