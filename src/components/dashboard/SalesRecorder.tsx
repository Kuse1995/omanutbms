import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Loader2, CheckCircle, DollarSign, Package, Eye, Download, FileSpreadsheet, CalendarIcon, FileText, AlertCircle, Wrench, Truck, Settings, HardHat, Trash2, Receipt, Building2, Percent, Banknote, ChevronDown, ChevronRight } from "lucide-react";
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
import { useBranch } from "@/hooks/useBranch";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { FashionPOS } from "./FashionPOS";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit_price: number;
  current_stock: number;
  image_url?: string | null;
  collection_id?: string | null;
}

interface ProductVariant {
  id: string;
  product_id: string;
  variant_type: string;
  variant_value: string;
  variant_display: string | null;
  hex_code: string | null;
  additional_price: number;
  stock: number;
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
  receipt_number: string | null;
}

interface GroupedSale {
  receiptNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  paymentMethod: string | null;
  createdAt: string;
  items: SaleTransaction[];
  totalAmount: number;
  totalLiters: number;
  totalQty: number;
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
  const { currentBranch, isMultiBranchEnabled, canAccessAllBranches, userBranchId } = useBranch();
  const { isImpactEnabled, impact, businessType, currencySymbol, terminology } = useBusinessConfig();

  // Collections for fashion POS
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);
  
  // Check if we should use fashion POS
  const isFashionMode = businessType === 'fashion';

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
  
  // Discount & payment state
  const [discountType, setDiscountType] = useState<"amount" | "percentage">("amount");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  
  // Risk adjustment for credit sales (internal - not shown to customer)
  const [riskAdjustment, setRiskAdjustment] = useState<number>(0);
  const [riskAdjustmentNotes, setRiskAdjustmentNotes] = useState<string>("");
  const [showRiskAdjustment, setShowRiskAdjustment] = useState(false);
  
  // Grouped sales expansion state
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());
  
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
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
    amountPaid: number;
    changeAmount: number;
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

  // Cart totals with discount
  const cartSubtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartLiters = cart.reduce((sum, item) => sum + item.litersImpact, 0);
  
  // Calculate discount
  const discountAmount = discountType === "percentage" 
    ? Math.round((cartSubtotal * discountValue) / 100 * 100) / 100
    : discountValue;
  
  // Risk adjustment is added for credit sales (hidden from customer display but included in total)
  const isCreditSale = paymentMethod === "credit_invoice";
  const effectiveRiskAdjustment = isCreditSale ? riskAdjustment : 0;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount + effectiveRiskAdjustment);
  
  // Calculate change
  const changeAmount = amountPaid > 0 ? Math.max(0, amountPaid - cartTotal) : 0;

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
  }, [tenantId, currentBranch?.id]);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchInventory(), fetchRecentSales(), fetchVariants(), fetchCollections()]);
    setIsLoading(false);
  };

  const fetchCollections = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from('collections')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching collections:', error);
      return;
    }
    setCollections(data || []);
  };

  const fetchVariants = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching variants:', error);
      return;
    }
    setProductVariants(data || []);
  };

  const fetchInventory = async () => {
    if (!tenantId) return;

    // When multi-branch is enabled and a specific branch is selected,
    // use branch_inventory to get branch-specific stock levels
    if (isMultiBranchEnabled && currentBranch) {
      const { data, error } = await supabase
        .from('branch_inventory')
        .select(`
          current_stock,
          inventory_id,
          inventory:inventory_id (
            id, name, sku, unit_price, image_url, collection_id, is_archived
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('branch_id', currentBranch.id)
        .gt('current_stock', 0);

      if (error) {
        console.error('Error fetching branch inventory:', error);
        return;
      }

      const branchItems: InventoryItem[] = (data || [])
        .filter((bi: any) => bi.inventory && !bi.inventory.is_archived)
        .map((bi: any) => ({
          id: bi.inventory.id,
          name: bi.inventory.name,
          sku: bi.inventory.sku,
          unit_price: bi.inventory.unit_price,
          current_stock: bi.current_stock, // branch-specific stock
          image_url: bi.inventory.image_url,
          collection_id: bi.inventory.collection_id,
        }));

      setInventory(branchItems);
    } else {
      // Single-branch mode or admin viewing "All Branches" — use global stock
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, sku, unit_price, current_stock, image_url, collection_id')
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)
        .gt('current_stock', 0)
        .order('name');

      if (error) {
        console.error('Error fetching inventory:', error);
        return;
      }
      setInventory(data || []);
    }
  };

  const fetchRecentSales = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from('sales_transactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching sales:', error);
      return;
    }
    setRecentSales(data || []);
  };

  // Group recent sales by receipt_number
  const groupedSales = useMemo((): GroupedSale[] => {
    const groups: Record<string, SaleTransaction[]> = {};
    
    recentSales.forEach((sale) => {
      const key = sale.receipt_number || sale.id; // fallback for legacy sales without receipt_number
      if (!groups[key]) groups[key] = [];
      groups[key].push(sale);
    });

    return Object.entries(groups).map(([receiptNumber, items]) => ({
      receiptNumber,
      customerName: items[0].customer_name,
      customerEmail: items[0].customer_email,
      customerPhone: items[0].customer_phone,
      paymentMethod: items[0].payment_method,
      createdAt: items[0].created_at,
      items,
      totalAmount: items.reduce((sum, i) => sum + i.total_amount_zmw, 0),
      totalLiters: items.reduce((sum, i) => sum + i.liters_impact, 0),
      totalQty: items.reduce((sum, i) => sum + i.quantity, 0),
    })).slice(0, 15); // show up to 15 grouped transactions
  }, [recentSales]);

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
    setDiscountType("amount");
    setDiscountValue(0);
    setAmountPaid(0);
    setRiskAdjustment(0);
    setRiskAdjustmentNotes("");
    setShowRiskAdjustment(false);
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

  // Initial payment state for credit sales
  const [initialPayment, setInitialPayment] = useState<number>(0);

  const handleCheckout = async () => {
    // Block sales when multi-branch is enabled but no specific branch is selected
    if (isMultiBranchEnabled && !currentBranch) {
      toast({ title: "Select a Branch", description: "Please select a specific branch before recording a sale. You cannot sell from 'All Branches' view.", variant: "destructive" });
      return;
    }

    // Enforce branch isolation: non-admin users can only sell from their assigned branch
    if (isMultiBranchEnabled && userBranchId && !canAccessAllBranches && currentBranch && currentBranch.id !== userBranchId) {
      toast({ title: "Branch Restricted", description: "You can only record sales for your assigned branch.", variant: "destructive" });
      return;
    }

    if (cart.length === 0) {
      toast({ title: "Empty Cart", description: "Please add items to cart", variant: "destructive" });
      return;
    }

    if (paymentMethod === "credit_invoice" && !customerName.trim()) {
      toast({ title: `${terminology.customer} Name Required`, description: `Please enter ${terminology.customer.toLowerCase()} name for credit ${terminology.sales.toLowerCase()}`, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const receiptNumber = generateReceiptNumber();
      
      // Calculate per-item discount allocation (distribute discount proportionally)
      const itemDiscountShare = cart.map(item => {
        const itemWeight = item.totalPrice / cartSubtotal;
        return Math.round(discountAmount * itemWeight * 100) / 100;
      });

      // Insert all cart items as sales transactions
      for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        const itemDiscount = itemDiscountShare[i] || 0;
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
            total_amount_zmw: item.totalPrice - itemDiscount,
            payment_method: paymentMethod,
            notes: notes.trim() || null,
            selected_color: item.selectedColor || null,
            selected_size: item.selectedSize || null,
            item_type: item.type,
            receipt_number: receiptNumber,
            discount_amount: itemDiscount,
            discount_reason: discountAmount > 0 ? (discountType === "percentage" ? `${discountValue}% discount` : `K${discountValue} discount`) : null,
            branch_id: currentBranch?.id || null,
          } as any);

        if (saleError) throw saleError;

        // Update inventory stock for products
        if (item.type === "product" && item.productId) {
          const inventoryItem = inventory.find(inv => inv.id === item.productId);
          if (inventoryItem) {
            // Deduct from branch-specific stock when multi-branch is active
            if (isMultiBranchEnabled && currentBranch) {
              const { error: branchStockError } = await supabase
                .from('branch_inventory')
                .update({ current_stock: inventoryItem.current_stock - item.quantity })
                .eq('inventory_id', item.productId)
                .eq('branch_id', currentBranch.id);

              if (branchStockError) throw branchStockError;
            } else {
              // Single-branch: deduct from global stock
              const { error: inventoryError } = await supabase
                .from('inventory')
                .update({ current_stock: inventoryItem.current_stock - item.quantity })
                .eq('id', item.productId);

              if (inventoryError) throw inventoryError;
            }
          }

          // Decrement variant-specific stock for fashion products
          if (item.selectedColor) {
            await supabase.rpc('decrement_variant_stock', {
              p_product_id: item.productId,
              p_variant_type: 'color',
              p_variant_value: item.selectedColor,
              p_quantity: item.quantity,
              p_tenant_id: tenantId,
            });
          }
          
          if (item.selectedSize) {
            await supabase.rpc('decrement_variant_stock', {
              p_product_id: item.productId,
              p_variant_type: 'size',
              p_variant_value: item.selectedSize,
              p_quantity: item.quantity,
              p_tenant_id: tenantId,
            });
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
            status: initialPayment > 0 ? 'partial' : 'sent',
            paid_amount: initialPayment > 0 ? initialPayment : 0,
            subtotal: cartSubtotal,
            tax_rate: 0,
            tax_amount: 0,
            total_amount: cartTotal,
            discount_amount: discountAmount,
            discount_reason: discountAmount > 0 ? (discountType === "percentage" ? `${discountValue}% discount` : `K${discountValue} discount`) : null,
            notes: notes.trim() || `Credit sale - ${cart.length} items`,
            // Risk adjustment for credit sales (internal tracking)
            risk_adjustment_amount: effectiveRiskAdjustment,
            risk_adjustment_notes: riskAdjustmentNotes.trim() || null,
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
          subtotal: cartSubtotal,
          discountAmount,
          totalAmount: cartTotal,
          amountPaid: initialPayment,
          changeAmount: 0,
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
          console.error('Error creating receipt:', receiptError, { tenantId, userId: user?.id });
          toast({
            title: "Warning",
            description: "Sale recorded but receipt could not be saved to database. You can still view it now.",
            variant: "destructive",
          });
        }

        // Show receipt automatically
        setReceiptData({
          receiptNumber,
          customerName: customerName.trim() || null,
          customerEmail: customerEmail.trim() || null,
          customerPhone: customerPhone.trim() || null,
          items: [...cart],
          subtotal: cartSubtotal,
          discountAmount,
          totalAmount: cartTotal,
          amountPaid: amountPaid > 0 ? amountPaid : cartTotal,
          changeAmount,
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

  // Generate receipt for a grouped sale
  const handleGenerateGroupedReceipt = (group: GroupedSale) => {
    setReceiptData({
      receiptNumber: group.receiptNumber,
      customerName: group.customerName,
      customerEmail: group.customerEmail,
      customerPhone: group.customerPhone,
      items: group.items.map(sale => ({
        id: sale.id,
        type: sale.item_type as "product" | "service",
        name: sale.product_name,
        quantity: sale.quantity,
        unitPrice: sale.unit_price_zmw,
        totalPrice: sale.total_amount_zmw,
        selectedColor: sale.selected_color || undefined,
        selectedSize: sale.selected_size || undefined,
        litersImpact: sale.liters_impact,
      })),
      subtotal: group.totalAmount,
      discountAmount: 0,
      totalAmount: group.totalAmount,
      amountPaid: group.totalAmount,
      changeAmount: 0,
      paymentMethod: group.paymentMethod || 'cash',
      paymentDate: group.createdAt,
      litersImpact: group.totalLiters,
    });
    setIsReceiptOpen(true);
  };

  // Generate receipt for existing single sale (legacy)
  const handleGenerateReceipt = (sale: SaleTransaction) => {
    // Try to find the group for this sale
    const group = groupedSales.find(g => g.items.some(i => i.id === sale.id));
    if (group) {
      handleGenerateGroupedReceipt(group);
      return;
    }
    setReceiptData({
      receiptNumber: sale.receipt_number || `SR-${sale.id.slice(0, 8).toUpperCase()}`,
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
      subtotal: sale.total_amount_zmw,
      discountAmount: 0,
      totalAmount: sale.total_amount_zmw,
      amountPaid: sale.total_amount_zmw,
      changeAmount: 0,
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
            {terminology.sales} Recorder
            {isMultiBranchEnabled && currentBranch && (
              <Badge variant="outline" className="ml-2 text-sm font-normal">
                <Building2 className="w-3 h-3 mr-1" />
                {currentBranch.name}
              </Badge>
            )}
          </h2>
          <p className="text-[#004B8D]/60 mt-1">Record {terminology.sales.toLowerCase()} with {terminology.products.toLowerCase()} & services bundled together</p>
        </div>
      </div>

      {/* Warning when admin is viewing "All Branches" */}
      {isMultiBranchEnabled && !currentBranch && (
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertDescription>
            You are viewing all branches. Please select a specific branch from the header to record sales. Each branch can only sell its own stock.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Items Section - conditional for fashion */}
        <Card className="lg:col-span-2 bg-white border-[#004B8D]/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#003366] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#0077B6]" />
              {isFashionMode ? `Select ${terminology.products}` : `Add Items to ${terminology.sale}`}
            </CardTitle>
            <CardDescription className="text-[#004B8D]/60">
              {isFashionMode ? `Click on ${terminology.products.toLowerCase()} to add them to cart` : `Add ${terminology.products.toLowerCase()} and services, then checkout together`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fashion POS Mode */}
            {isFashionMode ? (
              <FashionPOS
                inventory={inventory}
                variants={productVariants}
                collections={collections}
                cart={cart}
                onAddToCart={(item) => {
                  const existingIdx = cart.findIndex(c => 
                    c.productId === item.productId && 
                    c.selectedColor === item.selectedColor && 
                    c.selectedSize === item.selectedSize
                  );
                  if (existingIdx >= 0) {
                    const updatedCart = [...cart];
                    updatedCart[existingIdx] = item;
                    setCart(updatedCart);
                  } else {
                    setCart([...cart, item]);
                  }
                  toast({ title: "Added to Cart", description: `${item.name} added` });
                }}
              />
            ) : (
            /* Traditional Form-based Mode */
            <>
            {/* Sale Type Toggle */}
            <div className="space-y-3">
              <Label className="text-[#003366]">Item Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={saleType === "product" ? "default" : "outline"}
                  className={`flex-1 ${saleType === "product" ? "bg-[#004B8D] hover:bg-[#003366]" : ""}`}
                  title={terminology.product}
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
                  <Label className="text-[#003366]">{terminology.product} *</Label>
                  <ProductCombobox
                    products={inventory}
                    value={selectedProduct}
                    onValueChange={setSelectedProduct}
                    placeholder={`Search and select ${terminology.product.toLowerCase()}...`}
                    showStock={true}
                    showPrice={true}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#003366]">Quantity *</Label>
                  <Input
                    type="number"
                    step="any"
                    min={0.01}
                    max={selectedInventoryItem?.current_stock || 999}
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
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
                      step="any"
                      min={0.01}
                      value={quantity}
                      onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
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
            </>
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
                    <span className="font-medium">K{cartSubtotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>-K{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
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
                  {terminology.customer} Name {paymentMethod === "credit_invoice" && <span className="text-red-500">*</span>}
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

            {/* Discount Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50/50 rounded-lg border border-green-200">
              <div className="space-y-2">
                <Label className="text-green-700 flex items-center gap-1">
                  <Percent className="w-4 h-4" />
                  Discount Type
                </Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "amount" | "percentage")}>
                  <SelectTrigger className="bg-white border-green-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="amount">Fixed Amount (K)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-green-700">
                  Discount {discountType === "percentage" ? "%" : "(ZMW)"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={discountType === "percentage" ? 100 : cartSubtotal}
                  step={discountType === "percentage" ? 1 : 0.01}
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-white border-green-200 text-[#003366]"
                />
              </div>
              <div className="flex flex-col justify-center">
                {discountAmount > 0 && (
                  <div className="text-green-700">
                    <p className="text-sm">Discount Applied:</p>
                    <p className="text-lg font-bold">-K{discountAmount.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Amount Paid & Change (for non-credit sales) */}
            {paymentMethod !== "credit_invoice" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50/50 rounded-lg border border-blue-200">
                <div className="space-y-2">
                  <Label className="text-blue-700 flex items-center gap-1">
                    <Banknote className="w-4 h-4" />
                    Amount Paid (ZMW)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={amountPaid || ""}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    placeholder={cartTotal.toLocaleString()}
                    className="bg-white border-blue-200 text-[#003366] text-lg font-medium"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-sm text-blue-600">Total Due:</p>
                  <p className="text-xl font-bold text-[#003366]">K{cartTotal.toLocaleString()}</p>
                </div>
                <div className="flex flex-col justify-center">
                  {amountPaid > 0 && (
                    <div className={changeAmount > 0 ? "text-green-700" : amountPaid < cartTotal ? "text-red-600" : "text-blue-700"}>
                      <p className="text-sm">{amountPaid >= cartTotal ? "Change:" : "Balance Due:"}</p>
                      <p className="text-xl font-bold">
                        {amountPaid >= cartTotal 
                          ? `K${changeAmount.toLocaleString()}`
                          : `K${(cartTotal - amountPaid).toLocaleString()}`
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

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

                {/* Initial Payment for Credit Sales (Optional) */}
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50 space-y-2">
                  <Label className="text-blue-800">Initial Payment (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    max={cartTotal}
                    step="0.01"
                    value={initialPayment || ""}
                    onChange={(e) => setInitialPayment(Math.min(Number(e.target.value) || 0, cartTotal))}
                    placeholder="0.00"
                    className="bg-white border-blue-300 focus:border-blue-500"
                  />
                  {initialPayment > 0 && (
                    <p className="text-sm text-blue-700">
                      Balance due: K{(cartTotal - initialPayment).toLocaleString()} (Partial payment)
                    </p>
                  )}
                </div>

                {/* Risk Adjustment for Credit Sales (Internal Only - Collapsible) */}
                <div className="border border-orange-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowRiskAdjustment(!showRiskAdjustment)}
                    className="w-full flex items-center justify-between p-3 bg-orange-50/50 hover:bg-orange-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {showRiskAdjustment ? <ChevronDown className="w-4 h-4 text-orange-600" /> : <ChevronRight className="w-4 h-4 text-orange-600" />}
                      <span className="text-sm font-medium text-orange-800">Risk Adjustment</span>
                      <span className="text-xs text-orange-600">(Optional - Internal only)</span>
                    </div>
                    {riskAdjustment > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">+K{riskAdjustment.toLocaleString()}</Badge>
                    )}
                  </button>
                  {showRiskAdjustment && (
                    <div className="p-4 bg-orange-50 space-y-3 border-t border-orange-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-orange-800">Adjustment Amount (K)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={riskAdjustment || ""}
                            onChange={(e) => setRiskAdjustment(Number(e.target.value) || 0)}
                            placeholder="0.00"
                            className="bg-white border-orange-300 focus:border-orange-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-orange-800">Internal Notes</Label>
                          <Input
                            value={riskAdjustmentNotes}
                            onChange={(e) => setRiskAdjustmentNotes(e.target.value)}
                            placeholder="Reason for adjustment..."
                            className="bg-white border-orange-300 focus:border-orange-500"
                          />
                        </div>
                      </div>
                      {riskAdjustment > 0 && (
                        <p className="text-sm text-orange-700">
                          Total will include +K{riskAdjustment.toLocaleString()} risk markup (hidden from customer)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Checkout Summary & Button */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-r from-[#004B8D]/10 to-[#0077B6]/10 rounded-lg">
              <div className="text-center md:text-left space-y-1">
                {discountAmount > 0 && (
                  <p className="text-xs text-green-600">
                    Subtotal: K{cartSubtotal.toLocaleString()} | Discount: -K{discountAmount.toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-[#004B8D]/60">Total Amount</p>
                <p className="text-2xl font-bold text-[#0077B6]">K{cartTotal.toLocaleString()}</p>
                {isImpactEnabled && <p className="text-xs text-teal-600">{cartLiters.toLocaleString()} {impact.unitLabel || 'units'}</p>}
                {paymentMethod !== "credit_invoice" && amountPaid > 0 && changeAmount > 0 && (
                  <p className="text-sm font-medium text-green-600">Change: K{changeAmount.toLocaleString()}</p>
                )}
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
                <TableHead className="text-[#004B8D]/70 w-8"></TableHead>
                <TableHead className="text-[#004B8D]/70">Date</TableHead>
                <TableHead className="text-[#004B8D]/70">Receipt #</TableHead>
                <TableHead className="text-[#004B8D]/70">Customer</TableHead>
                <TableHead className="text-[#004B8D]/70">Items</TableHead>
                <TableHead className="text-[#004B8D]/70">Amount</TableHead>
                <TableHead className="text-[#004B8D]/70">Payment</TableHead>
                <TableHead className="text-[#004B8D]/70 w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-[#004B8D]/50 py-8">
                    No sales recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                groupedSales.map((group) => {
                  const isExpanded = expandedReceipts.has(group.receiptNumber);
                  return (
                    <React.Fragment key={group.receiptNumber}>
                      <TableRow className="border-[#004B8D]/10 hover:bg-[#004B8D]/5">
                        <TableCell className="p-1">
                          {group.items.length > 1 && (
                            <button
                              onClick={() => {
                                setExpandedReceipts(prev => {
                                  const next = new Set(prev);
                                  if (next.has(group.receiptNumber)) next.delete(group.receiptNumber);
                                  else next.add(group.receiptNumber);
                                  return next;
                                });
                              }}
                              className="p-1 rounded hover:bg-[#004B8D]/10"
                            >
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-[#003366]/70 text-sm">
                          {new Date(group.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-[#003366] font-mono text-xs">
                          {group.receiptNumber.length > 12 ? group.receiptNumber.slice(0, 12) + '…' : group.receiptNumber}
                        </TableCell>
                        <TableCell className="text-[#003366]/70">
                          {group.customerName || <span className="text-[#004B8D]/40">Walk-in</span>}
                        </TableCell>
                        <TableCell className="text-[#003366]/70">
                          {group.items.length === 1 ? (
                            <span>{group.items[0].product_name}</span>
                          ) : (
                            <Badge variant="outline" className="border-[#004B8D]/20">{group.items.length} items</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-[#0077B6] font-medium">
                          K{group.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-[#004B8D]/20 text-[#003366] capitalize">
                            {group.paymentMethod?.replace('_', ' ') || 'Cash'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button 
                              className="p-1.5 rounded-md hover:bg-[#0077B6]/10 text-[#0077B6] transition-colors"
                              onClick={() => { setSelectedSale(group.items[0]); setIsDetailsOpen(true); }}
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              className="p-1.5 rounded-md hover:bg-green-500/10 text-green-600 transition-colors"
                              onClick={() => handleGenerateGroupedReceipt(group)}
                              title="Generate receipt"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Expanded items for multi-item receipts */}
                      {isExpanded && group.items.map((sale) => (
                        <TableRow key={sale.id} className="bg-[#f0f7fa]/50 border-[#004B8D]/5">
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-[#003366] text-sm pl-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[#004B8D]/30">↳</span>
                              {sale.quantity}x {sale.product_name}
                              {sale.item_type === "service" && (
                                <Badge className="text-[10px] bg-amber-100 text-amber-700">Service</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-[#003366]/70 text-sm">
                            K{sale.total_amount_zmw.toLocaleString()}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })
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
          subtotal={receiptData.subtotal}
          discountAmount={receiptData.discountAmount}
          totalAmount={receiptData.totalAmount}
          amountPaid={receiptData.amountPaid}
          changeAmount={receiptData.changeAmount}
          paymentMethod={receiptData.paymentMethod}
          paymentDate={receiptData.paymentDate}
          litersImpact={receiptData.litersImpact}
        />
      )}
    </motion.div>
  );
}
