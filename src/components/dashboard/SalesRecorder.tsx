import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Loader2, CheckCircle, DollarSign, Package, Eye, Download, FileSpreadsheet, CalendarIcon, FileText, AlertCircle, Wrench, Truck, Settings, HardHat, Trash2, Receipt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ProductCombobox } from "./ProductCombobox";
import { supabase } from "@/integrations/supabase/client";
import { SaleDetailsModal } from "./SaleDetailsModal";
import { SalesReceiptModal } from "./SalesReceiptModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from "xlsx";
import { useTenant } from "@/hooks/useTenant";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit_price: number;
  current_stock: number;
}

interface ProductVariant {
  id: string;
  product_id: string;
  variant_type: string;
  variant_value: string;
  variant_display: string | null;
  hex_code: string | null;
  additional_price: number;
}

interface SaleTransaction {
  id: string;
  transaction_type: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  product_name: string;
  quantity: number;
  unit_price_zmw: number;
  total_amount_zmw: number;
  liters_impact: number;
  payment_method: string | null;
  selected_color: string | null;
  selected_size: string | null;
  notes: string | null;
  created_at: string;
  item_type: string;
}

interface CartItem {
  id: string;
  type: "product" | "service";
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedColor?: string;
  selectedSize?: string;
  litersImpact: number;
  maxStock?: number;
}

const QUICK_SERVICES = [
  { label: "Delivery", icon: Truck, description: "Delivery" },
  { label: "Installation", icon: Settings, description: "Installation" },
  { label: "Maintenance", icon: Wrench, description: "Maintenance" },
  { label: "Labor", icon: HardHat, description: "Labor" },
];

export function SalesRecorder() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [recentSales, setRecentSales] = useState<SaleTransaction[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { isImpactEnabled, impact } = useBusinessConfig();

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Form state for adding items
  const [saleType, setSaleType] = useState<"product" | "service">("product");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [servicePrice, setServicePrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  
  // Customer & payment state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState<Date>(addDays(new Date(), 30));
  
  // Modal state
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Receipt modal state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    receiptNumber: string;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    items: CartItem[];
    totalAmount: number;
    paymentMethod: string;
    paymentDate: string;
    litersImpact: number;
  } | null>(null);
  
  // Export state
  const [exportFromDate, setExportFromDate] = useState<Date>(startOfMonth(new Date()));
  const [exportToDate, setExportToDate] = useState<Date>(endOfMonth(new Date()));
  const [isExporting, setIsExporting] = useState(false);

  const selectedInventoryItem = inventory.find(item => item.id === selectedProduct);
  const colorVariants = productVariants.filter(v => v.product_id === selectedProduct && v.variant_type === "color");
  const sizeVariants = productVariants.filter(v => v.product_id === selectedProduct && v.variant_type === "size");
  
  const selectedColorVariant = colorVariants.find(v => v.variant_value === selectedColor);
  const selectedSizeVariant = sizeVariants.find(v => v.variant_value === selectedSize);
  const variantPriceAdjustment = (selectedColorVariant?.additional_price || 0) + (selectedSizeVariant?.additional_price || 0);
  
  const unitPrice = saleType === "product" 
    ? (selectedInventoryItem?.unit_price || 0) + variantPriceAdjustment
    : servicePrice;
  const itemTotal = unitPrice * quantity;
  const estimatedImpact = isImpactEnabled && saleType === "product" ? Math.floor(itemTotal / 20) : 0;

  // Cart totals
  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartLiters = cart.reduce((sum, item) => sum + item.litersImpact, 0);

  useEffect(() => {
    fetchData();
    
    const channel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales_transactions' },
        () => fetchRecentSales()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchInventory(), fetchRecentSales(), fetchVariants()]);
    setIsLoading(false);
  };

  const fetchVariants = async () => {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching variants:', error);
      return;
    }
    setProductVariants(data || []);
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, name, sku, unit_price, current_stock')
      .gt('current_stock', 0)
      .order('name');

    if (error) {
      console.error('Error fetching inventory:', error);
      return;
    }
    setInventory(data || []);
  };

  const fetchRecentSales = async () => {
    const { data, error } = await supabase
      .from('sales_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching sales:', error);
      return;
    }
    setRecentSales(data || []);
  };

  // Reset item form (not cart)
  const resetItemForm = () => {
    setSelectedProduct("");
    setServiceDescription("");
    setServicePrice(0);
    setQuantity(1);
    setSelectedColor("");
    setSelectedSize("");
  };

  // Reset entire form including cart
  const resetAllForm = () => {
    resetItemForm();
    setCart([]);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setPaymentMethod("cash");
    setNotes("");
    setInvoiceDueDate(addDays(new Date(), 30));
    setSaleType("product");
  };

  useEffect(() => {
    setSelectedColor("");
    setSelectedSize("");
  }, [selectedProduct]);

  // Add item to cart
  const handleAddToCart = () => {
    if (saleType === "product") {
      if (!selectedProduct || !selectedInventoryItem) {
        toast({ title: "Error", description: "Please select a product", variant: "destructive" });
        return;
      }
      
      // Check if same product already in cart, considering variants
      const existingIdx = cart.findIndex(item => 
        item.productId === selectedProduct && 
        item.selectedColor === (selectedColor || undefined) &&
        item.selectedSize === (selectedSize || undefined)
      );
      
      const totalQtyInCart = existingIdx >= 0 ? cart[existingIdx].quantity + quantity : quantity;
      if (totalQtyInCart > selectedInventoryItem.current_stock) {
        toast({ 
          title: "Insufficient Stock", 
          description: `Only ${selectedInventoryItem.current_stock} units available`, 
          variant: "destructive" 
        });
        return;
      }
      
      if (existingIdx >= 0) {
        // Update existing cart item
        const updatedCart = [...cart];
        updatedCart[existingIdx].quantity += quantity;
        updatedCart[existingIdx].totalPrice = updatedCart[existingIdx].quantity * updatedCart[existingIdx].unitPrice;
        updatedCart[existingIdx].litersImpact = Math.floor(updatedCart[existingIdx].totalPrice / 20);
        setCart(updatedCart);
      } else {
        // Add new item
        const newItem: CartItem = {
          id: `${Date.now()}-${Math.random()}`,
          type: "product",
          productId: selectedProduct,
          name: selectedInventoryItem.name,
          quantity,
          unitPrice,
          totalPrice: itemTotal,
          selectedColor: selectedColor || undefined,
          selectedSize: selectedSize || undefined,
          litersImpact: estimatedImpact,
          maxStock: selectedInventoryItem.current_stock,
        };
        setCart([...cart, newItem]);
      }
    } else {
      if (!serviceDescription.trim()) {
        toast({ title: "Error", description: "Please enter a service description", variant: "destructive" });
        return;
      }
      if (servicePrice <= 0) {
        toast({ title: "Error", description: "Please enter a valid service price", variant: "destructive" });
        return;
      }
      
      const newItem: CartItem = {
        id: `${Date.now()}-${Math.random()}`,
        type: "service",
        name: serviceDescription.trim(),
        quantity,
        unitPrice: servicePrice,
        totalPrice: itemTotal,
        litersImpact: 0,
      };
      setCart([...cart, newItem]);
    }
    
    resetItemForm();
    toast({ title: "Added to Cart", description: `Item added successfully` });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const formatPaymentMethod = (method: string | null) => {
    if (!method) return 'Cash';
    return method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const fetchSalesForExport = async () => {
    const fromDate = format(exportFromDate, "yyyy-MM-dd");
    const toDate = format(exportToDate, "yyyy-MM-dd");
    
    const { data, error } = await supabase
      .from('sales_transactions')
      .select('*')
      .gte('created_at', `${fromDate}T00:00:00`)
      .lte('created_at', `${toDate}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const sales = await fetchSalesForExport();
      
      if (sales.length === 0) {
        toast({ title: "No Data", description: "No sales found for the selected date range", variant: "destructive" });
        return;
      }

      const exportData = sales.map(sale => ({
        'Date': format(new Date(sale.created_at), 'yyyy-MM-dd HH:mm'),
        'Product Name': sale.product_name,
        'Type': sale.item_type || 'product',
        'Color': sale.selected_color || '',
        'Size': sale.selected_size || '',
        'Customer Name': sale.customer_name || 'Walk-in',
        'Quantity': sale.quantity,
        'Unit Price (ZMW)': sale.unit_price_zmw,
        'Total Amount (ZMW)': sale.total_amount_zmw,
        [impact?.unitLabel || 'Impact']: sale.liters_impact,
        'Payment Method': formatPaymentMethod(sale.payment_method),
        'Notes': sale.notes || '',
      }));

      const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount_zmw, 0);
      const totalLiters = sales.reduce((sum, s) => sum + s.liters_impact, 0);
      const totalQty = sales.reduce((sum, s) => sum + s.quantity, 0);
      
      exportData.push({
        'Date': '',
        'Product Name': 'TOTALS',
        'Type': '',
        'Color': '',
        'Size': '',
        'Customer Name': '',
        'Quantity': totalQty,
        'Unit Price (ZMW)': 0,
        'Total Amount (ZMW)': totalRevenue,
        'Liters Impact': totalLiters,
        'Payment Method': '',
        'Notes': `${sales.length} transactions`,
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sales-${format(exportFromDate, 'yyyy-MM-dd')}-to-${format(exportToDate, 'yyyy-MM-dd')}.csv`;
      link.click();

      toast({ title: "Export Complete", description: `Downloaded ${sales.length} sales records as CSV` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Export Failed", description: "Failed to export sales data", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const sales = await fetchSalesForExport();
      
      if (sales.length === 0) {
        toast({ title: "No Data", description: "No sales found for the selected date range", variant: "destructive" });
        return;
      }

      const exportData = sales.map(sale => ({
        'Date': format(new Date(sale.created_at), 'yyyy-MM-dd HH:mm'),
        'Product Name': sale.product_name,
        'Type': sale.item_type || 'product',
        'Color': sale.selected_color || '',
        'Size': sale.selected_size || '',
        'Customer Name': sale.customer_name || 'Walk-in',
        'Quantity': sale.quantity,
        'Unit Price (ZMW)': sale.unit_price_zmw,
        'Total Amount (ZMW)': sale.total_amount_zmw,
        [impact?.unitLabel || 'Impact']: sale.liters_impact,
        'Payment Method': formatPaymentMethod(sale.payment_method),
        'Notes': sale.notes || '',
      }));

      const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount_zmw, 0);
      const totalLiters = sales.reduce((sum, s) => sum + s.liters_impact, 0);
      const totalQty = sales.reduce((sum, s) => sum + s.quantity, 0);
      
      exportData.push({
        'Date': '',
        'Product Name': 'TOTALS',
        'Type': '',
        'Color': '',
        'Size': '',
        'Customer Name': '',
        'Quantity': totalQty,
        'Unit Price (ZMW)': 0,
        'Total Amount (ZMW)': totalRevenue,
        'Liters Impact': totalLiters,
        'Payment Method': '',
        'Notes': `${sales.length} transactions`,
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales');
      XLSX.writeFile(wb, `sales-${format(exportFromDate, 'yyyy-MM-dd')}-to-${format(exportToDate, 'yyyy-MM-dd')}.xlsx`);

      toast({ title: "Export Complete", description: `Downloaded ${sales.length} sales records as Excel` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Export Failed", description: "Failed to export sales data", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // Generate receipt number
  const generateReceiptNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SR${year}-${random}`;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: "Empty Cart", description: "Please add items to cart", variant: "destructive" });
      return;
    }

    if (paymentMethod === "credit_invoice" && !customerName.trim()) {
      toast({ title: "Customer Name Required", description: "Please enter customer name for credit sales", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const receiptNumber = generateReceiptNumber();
      
      // Insert all cart items as sales transactions
      for (const item of cart) {
        const { error: saleError } = await supabase
          .from('sales_transactions')
          .insert({
            tenant_id: tenantId,
            transaction_type: 'manual',
            customer_name: customerName.trim() || null,
            customer_email: customerEmail.trim() || null,
            customer_phone: customerPhone.trim() || null,
            product_id: item.productId || null,
            product_name: item.name,
            quantity: item.quantity,
            unit_price_zmw: item.unitPrice,
            total_amount_zmw: item.totalPrice,
            payment_method: paymentMethod,
            notes: notes.trim() || null,
            selected_color: item.selectedColor || null,
            selected_size: item.selectedSize || null,
            item_type: item.type,
            receipt_number: receiptNumber,
          });

        if (saleError) throw saleError;

        // Update inventory stock for products
        if (item.type === "product" && item.productId) {
          const inventoryItem = inventory.find(inv => inv.id === item.productId);
          if (inventoryItem) {
            const { error: inventoryError } = await supabase
              .from('inventory')
              .update({ current_stock: inventoryItem.current_stock - item.quantity })
              .eq('id', item.productId);

            if (inventoryError) throw inventoryError;
          }
        }
      }

      // If credit sale, create invoice
      let invoiceNumber = "";
      if (paymentMethod === "credit_invoice") {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .insert([{
            tenant_id: tenantId,
            client_name: customerName.trim(),
            client_email: customerEmail.trim() || null,
            client_phone: customerPhone.trim() || null,
            invoice_date: format(new Date(), "yyyy-MM-dd"),
            due_date: format(invoiceDueDate, "yyyy-MM-dd"),
            status: 'sent',
            subtotal: cartTotal,
            tax_rate: 0,
            tax_amount: 0,
            total_amount: cartTotal,
            notes: notes.trim() || `Credit sale - ${cart.length} items`,
          } as any])
          .select('id, invoice_number')
          .single();

        if (invoiceError) throw invoiceError;
        invoiceNumber = invoiceData.invoice_number;

        // Create invoice line items
        for (const item of cart) {
          let itemDescription = item.name;
          if (item.selectedColor) itemDescription += ` - ${item.selectedColor}`;
          if (item.selectedSize) itemDescription += ` (${item.selectedSize})`;

          const { error: itemError } = await supabase
            .from('invoice_items')
            .insert({
              tenant_id: tenantId,
              invoice_id: invoiceData.id,
              description: itemDescription,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              amount: item.totalPrice,
              item_type: item.type,
            });

          if (itemError) throw itemError;
        }

        toast({
          title: "Credit Sale Recorded!",
          description: `${cart.length} items - K${cartTotal.toLocaleString()} | Invoice ${invoiceNumber} created`,
        });

        // Show receipt for credit sale with invoice info
        setReceiptData({
          receiptNumber: invoiceNumber,
          customerName: customerName.trim() || null,
          customerEmail: customerEmail.trim() || null,
          customerPhone: customerPhone.trim() || null,
          items: [...cart],
          totalAmount: cartTotal,
          paymentMethod: "credit_invoice",
          paymentDate: new Date().toISOString(),
          litersImpact: cartLiters,
        });
        setIsReceiptOpen(true);
      } else {
        // Cash/other payment - create payment receipt record
        const { error: receiptError } = await supabase
          .from('payment_receipts')
          .insert({
            tenant_id: tenantId,
            receipt_number: receiptNumber,
            client_name: customerName.trim() || 'Walk-in Customer',
            client_email: customerEmail.trim() || null,
            amount_paid: cartTotal,
            payment_date: format(new Date(), "yyyy-MM-dd"),
            payment_method: paymentMethod,
            notes: notes.trim() || null,
            created_by: user?.id || null,
          });

        if (receiptError) {
          console.error('Error creating receipt:', receiptError);
          // Don't fail the whole sale if receipt creation fails
        }

        // Show receipt automatically
        setReceiptData({
          receiptNumber,
          customerName: customerName.trim() || null,
          customerEmail: customerEmail.trim() || null,
          customerPhone: customerPhone.trim() || null,
          items: [...cart],
          totalAmount: cartTotal,
          paymentMethod,
          paymentDate: new Date().toISOString(),
          litersImpact: cartLiters,
        });
        setIsReceiptOpen(true);
        
        toast({
          title: "Sale Completed!",
          description: `${cart.length} items - K${cartTotal.toLocaleString()} (${cartLiters} liters impact)`,
        });
      }

      resetAllForm();
      fetchInventory();
    } catch (error) {
      console.error('Error recording sale:', error);
      toast({ title: "Error", description: "Failed to record sale. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate receipt for existing sale
  const handleGenerateReceipt = (sale: SaleTransaction) => {
    setReceiptData({
      receiptNumber: `SR-${sale.id.slice(0, 8).toUpperCase()}`,
      customerName: sale.customer_name,
      customerEmail: sale.customer_email,
      customerPhone: sale.customer_phone,
      items: [{
        id: sale.id,
        type: sale.item_type as "product" | "service",
        name: sale.product_name,
        quantity: sale.quantity,
        unitPrice: sale.unit_price_zmw,
        totalPrice: sale.total_amount_zmw,
        selectedColor: sale.selected_color || undefined,
        selectedSize: sale.selected_size || undefined,
        litersImpact: sale.liters_impact,
      }],
      totalAmount: sale.total_amount_zmw,
      paymentMethod: sale.payment_method || 'cash',
      paymentDate: sale.created_at,
      litersImpact: sale.liters_impact,
    });
    setIsReceiptOpen(true);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-[#003366] flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#0077B6]" />
            Sales Recorder
          </h2>
          <p className="text-[#004B8D]/60 mt-1">Record sales with products & services bundled together</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Items Section */}
        <Card className="lg:col-span-2 bg-white border-[#004B8D]/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#003366] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#0077B6]" />
              Add Items to Sale
            </CardTitle>
            <CardDescription className="text-[#004B8D]/60">
              Add products and services, then checkout together
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sale Type Toggle */}
            <div className="space-y-3">
              <Label className="text-[#003366]">Item Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={saleType === "product" ? "default" : "outline"}
                  className={`flex-1 ${saleType === "product" ? "bg-[#004B8D] hover:bg-[#003366]" : ""}`}
                  onClick={() => setSaleType("product")}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Product
                </Button>
                <Button
                  type="button"
                  variant={saleType === "service" ? "default" : "outline"}
                  className={`flex-1 ${saleType === "service" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                  onClick={() => setSaleType("service")}
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Service
                </Button>
              </div>
            </div>

            {/* Product Selection */}
            {saleType === "product" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#003366]">Product *</Label>
                  <ProductCombobox
                    products={inventory}
                    value={selectedProduct}
                    onValueChange={setSelectedProduct}
                    placeholder="Search and select product..."
                    showStock={true}
                    showPrice={true}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#003366]">Quantity *</Label>
                  <Input
                    type="number"
                    min={1}
                    max={selectedInventoryItem?.current_stock || 999}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
                  />
                </div>
              </div>
            )}

            {/* Service Input */}
            {saleType === "service" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-[#004B8D]/60 self-center mr-1">Quick add:</span>
                  {QUICK_SERVICES.map((service) => (
                    <Button
                      key={service.label}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700"
                      onClick={() => setServiceDescription(service.description)}
                    >
                      <service.icon className="h-3 w-3 mr-1" />
                      {service.label}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="space-y-2 md:col-span-1">
                    <Label className="text-amber-700">Service Description *</Label>
                    <Input
                      value={serviceDescription}
                      onChange={(e) => setServiceDescription(e.target.value)}
                      placeholder="e.g., Delivery, Installation..."
                      className="bg-white border-amber-200 text-[#003366]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-amber-700">Price (ZMW) *</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={servicePrice || ""}
                      onChange={(e) => setServicePrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="bg-white border-amber-200 text-[#003366]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-amber-700">Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="bg-white border-amber-200 text-[#003366]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Variant Selection */}
            {selectedProduct && (colorVariants.length > 0 || sizeVariants.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                {colorVariants.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-purple-700">Color</Label>
                    <Select value={selectedColor} onValueChange={setSelectedColor}>
                      <SelectTrigger className="bg-white border-purple-200">
                        <SelectValue placeholder="Select color..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {colorVariants.map(v => (
                          <SelectItem key={v.id} value={v.variant_value}>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: v.hex_code || '#ccc' }} />
                              {v.variant_display || v.variant_value}
                              {v.additional_price > 0 && <span className="text-green-600 text-xs">+K{v.additional_price}</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {sizeVariants.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-blue-700">Size</Label>
                    <Select value={selectedSize} onValueChange={setSelectedSize}>
                      <SelectTrigger className="bg-white border-blue-200">
                        <SelectValue placeholder="Select size..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {sizeVariants.map(v => (
                          <SelectItem key={v.id} value={v.variant_value}>
                            {v.variant_display || v.variant_value}
                            {v.additional_price > 0 && <span className="text-green-600 text-xs ml-2">+K{v.additional_price}</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Item Preview & Add Button */}
            {((saleType === "product" && selectedProduct) || (saleType === "service" && serviceDescription && servicePrice > 0)) && (
              <div className={`rounded-lg p-4 flex items-center justify-between border ${saleType === "service" ? "bg-amber-50 border-amber-200" : "bg-[#004B8D]/5 border-[#004B8D]/10"}`}>
                <div>
                  <p className="font-medium text-[#003366]">
                    {quantity}x {saleType === "product" ? selectedInventoryItem?.name : serviceDescription}
                    {selectedColor && ` - ${selectedColor}`}
                    {selectedSize && ` (${selectedSize})`}
                  </p>
                  <p className="text-sm text-[#004B8D]/60">
                    K{unitPrice.toLocaleString()} each = <span className="font-bold text-[#0077B6]">K{itemTotal.toLocaleString()}</span>
                    {isImpactEnabled && saleType === "product" && estimatedImpact > 0 && <span className="text-teal-600 ml-2">({estimatedImpact} {impact?.unitLabel || 'impact'})</span>}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleAddToCart}
                  className={saleType === "service" ? "bg-amber-600 hover:bg-amber-700" : "bg-[#004B8D] hover:bg-[#003366]"}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cart Section */}
        <Card className="bg-white border-[#004B8D]/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#003366] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#0077B6]" />
                Cart
              </span>
              {cart.length > 0 && (
                <Badge className="bg-[#0077B6]">{cart.length} items</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-center text-[#004B8D]/50 py-8">No items in cart</p>
            ) : (
              <>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className={`flex items-center justify-between p-2 rounded-lg text-sm ${item.type === "service" ? "bg-amber-50" : "bg-[#f0f7fa]"}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#003366] truncate">
                          {item.quantity}x {item.name}
                        </p>
                        <p className="text-xs text-[#004B8D]/60">
                          K{item.totalPrice.toLocaleString()}
                          {item.type === "service" && <Badge className="ml-1 text-[10px] bg-amber-100 text-amber-700">Service</Badge>}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#004B8D]/60">Subtotal:</span>
                    <span className="font-medium">K{cartTotal.toLocaleString()}</span>
                  </div>
                  {isImpactEnabled && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#004B8D]/60">{impact.unitLabel || 'Impact'}:</span>
                      <span className="font-medium text-teal-600">{cartLiters.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span className="text-[#003366]">Total:</span>
                    <span className="text-[#0077B6]">K{cartTotal.toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer & Payment Section */}
      {cart.length > 0 && (
        <Card className="bg-white border-[#004B8D]/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#003366] flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#0077B6]" />
              Checkout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#003366]">
                  Customer Name {paymentMethod === "credit_invoice" && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={paymentMethod === "credit_invoice" ? "Required for credit sales" : "Optional"}
                  className={cn(
                    "bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]",
                    paymentMethod === "credit_invoice" && !customerName.trim() && "border-amber-400"
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#003366]">Email</Label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Optional"
                  className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#003366]">Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Optional"
                  className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#003366]">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#004B8D]/20 z-50">
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="credit_invoice" className="text-amber-600">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Credit (Invoice)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#003366]">Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
                />
              </div>
            </div>

            {/* Credit/Invoice fields */}
            {paymentMethod === "credit_invoice" && (
              <div className="space-y-4">
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">
                    An invoice will be automatically generated for this credit sale.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50/50 rounded-lg border border-amber-200">
                  <div className="space-y-2">
                    <Label className="text-amber-700">Invoice Due Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white border-amber-200",
                            !invoiceDueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-amber-600" />
                          {invoiceDueDate ? format(invoiceDueDate, "PPP") : <span>Select due date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white" align="start">
                        <Calendar
                          mode="single"
                          selected={invoiceDueDate}
                          onSelect={(date) => date && setInvoiceDueDate(date)}
                          initialFocus
                          className="pointer-events-auto"
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-end">
                    <p className="text-amber-600 text-sm">
                      Payment expected by {format(invoiceDueDate, "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Checkout Summary & Button */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-r from-[#004B8D]/10 to-[#0077B6]/10 rounded-lg">
              <div className="text-center md:text-left">
                <p className="text-sm text-[#004B8D]/60">Total Amount</p>
                <p className="text-2xl font-bold text-[#0077B6]">K{cartTotal.toLocaleString()}</p>
                {isImpactEnabled && <p className="text-xs text-teal-600">{cartLiters.toLocaleString()} {impact.unitLabel || 'units'}</p>}
              </div>
              <Button
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="bg-[#004B8D] hover:bg-[#003366] text-white px-8 py-6 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Complete Sale ({cart.length} items)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#004B8D]/10 to-[#0077B6]/10 border-[#004B8D]/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#004B8D]/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#004B8D]" />
              </div>
              <div>
                <p className="text-[#004B8D]/60 text-sm">Today's Sales</p>
                <p className="text-[#003366] font-bold text-xl">
                  {recentSales.filter(s => 
                    new Date(s.created_at).toDateString() === new Date().toDateString()
                  ).length} transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500/10 to-teal-600/10 border-teal-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-teal-600/70 text-sm">Products in Stock</p>
                <p className="text-[#003366] font-bold text-xl">{inventory.length} items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-amber-600/70 text-sm">Cart Items</p>
                <p className="text-[#003366] font-bold text-xl">{cart.length} items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales Table */}
      <Card className="bg-white border-[#004B8D]/10 shadow-sm">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-[#003366]">Recent Sales</CardTitle>
              <CardDescription className="text-[#004B8D]/60">Latest 10 transactions</CardDescription>
            </div>
            
            {/* Export Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal border-[#004B8D]/20",
                        !exportFromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {exportFromDate ? format(exportFromDate, "PP") : <span>From</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <Calendar
                      mode="single"
                      selected={exportFromDate}
                      onSelect={(date) => date && setExportFromDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                <span className="text-[#004B8D]/50">to</span>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal border-[#004B8D]/20",
                        !exportToDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {exportToDate ? format(exportToDate, "PP") : <span>To</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <Calendar
                      mode="single"
                      selected={exportToDate}
                      onSelect={(date) => date && setExportToDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="border-[#004B8D]/20 text-[#004B8D] hover:bg-[#004B8D]/10"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="border-teal-500/30 text-teal-600 hover:bg-teal-500/10"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                  Excel
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#004B8D]/10">
                <TableHead className="text-[#004B8D]/70">Date</TableHead>
                <TableHead className="text-[#004B8D]/70">Item</TableHead>
                <TableHead className="text-[#004B8D]/70">Customer</TableHead>
                <TableHead className="text-[#004B8D]/70">Qty</TableHead>
                <TableHead className="text-[#004B8D]/70">Amount</TableHead>
                <TableHead className="text-[#004B8D]/70">Impact</TableHead>
                <TableHead className="text-[#004B8D]/70">Payment</TableHead>
                <TableHead className="text-[#004B8D]/70 w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-[#004B8D]/50 py-8">
                    No sales recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                recentSales.map((sale) => (
                  <TableRow key={sale.id} className="border-[#004B8D]/10 hover:bg-[#004B8D]/5">
                    <TableCell className="text-[#003366]/70 text-sm">
                      {new Date(sale.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-[#003366] font-medium">
                      <div className="flex items-center gap-2">
                        {sale.product_name}
                        {sale.item_type === "service" && (
                          <Badge className="text-[10px] bg-amber-100 text-amber-700">Service</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[#003366]/70">
                      {sale.customer_name || <span className="text-[#004B8D]/40">Walk-in</span>}
                    </TableCell>
                    <TableCell className="text-[#003366]/70">{sale.quantity}</TableCell>
                    <TableCell className="text-[#0077B6] font-medium">
                      K{sale.total_amount_zmw.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-teal-600">
                      {sale.liters_impact > 0 ? `${sale.liters_impact.toLocaleString()} L` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-[#004B8D]/20 text-[#003366] capitalize">
                        {sale.payment_method?.replace('_', ' ') || 'Cash'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-1.5 rounded-md hover:bg-[#0077B6]/10 text-[#0077B6] transition-colors"
                          onClick={() => { setSelectedSale(sale); setIsDetailsOpen(true); }}
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 rounded-md hover:bg-green-500/10 text-green-600 transition-colors"
                          onClick={() => handleGenerateReceipt(sale)}
                          title="Generate receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SaleDetailsModal 
        sale={selectedSale} 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
      />

      {receiptData && (
        <SalesReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          receiptNumber={receiptData.receiptNumber}
          customerName={receiptData.customerName}
          customerEmail={receiptData.customerEmail}
          customerPhone={receiptData.customerPhone}
          items={receiptData.items.map(item => ({
            product_name: item.name,
            quantity: item.quantity,
            unit_price_zmw: item.unitPrice,
            total_amount_zmw: item.totalPrice,
            item_type: item.type,
            selected_color: item.selectedColor,
            selected_size: item.selectedSize,
          }))}
          totalAmount={receiptData.totalAmount}
          paymentMethod={receiptData.paymentMethod}
          paymentDate={receiptData.paymentDate}
          litersImpact={receiptData.litersImpact}
        />
      )}
    </motion.div>
  );
}
