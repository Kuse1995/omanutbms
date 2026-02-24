import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useBranch } from "@/hooks/useBranch";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { Loader2, PackagePlus, TrendingUp, TrendingDown, ChevronsUpDown, Check, Plus, Upload, X, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductVariant {
  id: string;
  variant_type: string;
  variant_value: string;
  variant_display: string | null;
  hex_code: string | null;
  stock: number;
}

interface Vendor {
  id: string;
  name: string;
  code: string | null;
  contact_person: string | null;
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
  const [costRecordingOption, setCostRecordingOption] = useState<"opening" | "expense" | "credit">("opening");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("base");
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  
  // Vendor state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [showNewVendorForm, setShowNewVendorForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorContact, setNewVendorContact] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [isCreatingVendor, setIsCreatingVendor] = useState(false);
  
  // File upload state
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [quotationFile, setQuotationFile] = useState<File | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [quotationUrl, setQuotationUrl] = useState<string | null>(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [isUploadingQuotation, setIsUploadingQuotation] = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const quotationInputRef = useRef<HTMLInputElement>(null);
  const [creditDueDate, setCreditDueDate] = useState<string>("");
  
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { currentBranch } = useBranch();
  const { user } = useAuth();
  const { businessType, terminology } = useBusinessConfig();

  const isFashionMode = businessType === "fashion";
  const selectedVariant = variants.find(v => v.id === selectedVariantId);
  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  // Fetch vendors when modal opens
  useEffect(() => {
    const fetchVendors = async () => {
      if (!open || !tenantId) return;
      
      setIsLoadingVendors(true);
      try {
        const { data, error } = await supabase
          .from("vendors")
          .select("id, name, code, contact_person")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        setVendors(data || []);
      } catch (error) {
        console.error("Error fetching vendors:", error);
      } finally {
        setIsLoadingVendors(false);
      }
    };

    fetchVendors();
  }, [open, tenantId]);

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
      setCreditDueDate("");
      setSelectedVariantId("base");
      setSelectedVendorId("");
      setShowNewVendorForm(false);
      setNewVendorName("");
      setNewVendorContact("");
      setNewVendorPhone("");
      setInvoiceFile(null);
      setQuotationFile(null);
      setInvoiceUrl(null);
      setQuotationUrl(null);
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

  const handleCreateVendor = async () => {
    if (!newVendorName.trim() || !tenantId) return;

    setIsCreatingVendor(true);
    try {
      const { data, error } = await supabase
        .from("vendors")
        .insert({
          tenant_id: tenantId,
          name: newVendorName.trim(),
          contact_person: newVendorContact.trim() || null,
          phone: newVendorPhone.trim() || null,
        })
        .select("id, name, code, contact_person")
        .single();

      if (error) throw error;

      setVendors(prev => [...prev, data]);
      setSelectedVendorId(data.id);
      setShowNewVendorForm(false);
      setNewVendorName("");
      setNewVendorContact("");
      setNewVendorPhone("");
      toast({
        title: "Vendor created",
        description: `${data.name} has been added to your vendors list.`,
      });
    } catch (error: any) {
      console.error("Error creating vendor:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create vendor",
        variant: "destructive",
      });
    } finally {
      setIsCreatingVendor(false);
    }
  };

  const uploadFile = async (file: File, type: "invoice" | "quotation"): Promise<string | null> => {
    if (!tenantId) return null;

    const setUploading = type === "invoice" ? setIsUploadingInvoice : setIsUploadingQuotation;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `restock/${tenantId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-documents")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast({
        title: "Upload Error",
        description: `Failed to upload ${type} file.`,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: "invoice" | "quotation") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "invoice") {
      setInvoiceFile(file);
      const url = await uploadFile(file, "invoice");
      setInvoiceUrl(url);
    } else {
      setQuotationFile(file);
      const url = await uploadFile(file, "quotation");
      setQuotationUrl(url);
    }
  };

  const removeFile = (type: "invoice" | "quotation") => {
    if (type === "invoice") {
      setInvoiceFile(null);
      setInvoiceUrl(null);
      if (invoiceInputRef.current) invoiceInputRef.current.value = "";
    } else {
      setQuotationFile(null);
      setQuotationUrl(null);
      if (quotationInputRef.current) quotationInputRef.current.value = "";
    }
  };

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

        // Also update branch_inventory for the current branch so location-level stock is in sync
        if (currentBranch?.id && tenantId) {
          // Check if a branch_inventory record exists
          const { data: existingBranchInv } = await supabase
            .from("branch_inventory")
            .select("id, current_stock")
            .eq("inventory_id", product.id)
            .eq("branch_id", currentBranch.id)
            .eq("tenant_id", tenantId)
            .maybeSingle();

          if (existingBranchInv) {
            // Update existing record
            await supabase
              .from("branch_inventory")
              .update({ current_stock: existingBranchInv.current_stock + quantity })
              .eq("id", existingBranchInv.id);
          } else {
            // Create new branch_inventory record
            await supabase
              .from("branch_inventory")
              .insert({
                inventory_id: product.id,
                branch_id: currentBranch.id,
                tenant_id: tenantId,
                current_stock: quantity,
                reorder_level: 0,
              });
          }
        }
      }

      // 2. Record restock history
      const variantLabel = selectedVariant 
        ? `${selectedVariant.variant_type}: ${selectedVariant.variant_value}`
        : null;
      
      const vendorNote = selectedVendor ? `Vendor: ${selectedVendor.name}` : null;
      const combinedNotes = [vendorNote, variantLabel ? `[${variantLabel}]` : null, notes || null]
        .filter(Boolean)
        .join(' | ');
      
      const { error: historyError } = await supabase
        .from("restock_history")
        .insert({
          tenant_id: tenantId,
          inventory_id: product.id,
          quantity,
          cost_per_unit: costPerUnit,
          total_cost: totalCost,
          recorded_as_expense: costRecordingOption === "expense",
          notes: combinedNotes || null,
          restocked_by: user?.id,
          branch_id: currentBranch?.id || null,
          vendor_id: selectedVendorId || null,
          invoice_url: invoiceUrl,
          quotation_url: quotationUrl,
        });

      if (historyError) throw historyError;

      // 3. If recording as expense, create expense record
      if (costRecordingOption === "expense" && totalCost > 0) {
        const { error: expenseError } = await supabase
          .from("expenses")
          .insert({
            tenant_id: tenantId,
            vendor_name: selectedVendor?.name || "Inventory Restock",
            category: "Cost of Goods Sold - Vestergaard",
            amount_zmw: totalCost,
            date_incurred: new Date().toISOString().split("T")[0],
            notes: `Restocked ${quantity} units of ${product.name} (SKU: ${product.sku})${notes ? ` - ${notes}` : ""}`,
            recorded_by: user?.id,
            branch_id: currentBranch?.id || null,
          });

        if (expenseError) throw expenseError;
      }

      // 4. If credit purchase, create accounts payable record
      if (costRecordingOption === "credit" && totalCost > 0) {
        const vendorName = selectedVendor?.name || "Unknown Vendor";
        const { error: payableError } = await supabase
          .from("accounts_payable")
          .insert({
            tenant_id: tenantId,
            vendor_name: vendorName,
            description: `Credit purchase: ${quantity} × ${product.name} (${product.sku})`,
            amount_zmw: totalCost,
            due_date: creditDueDate || null,
            invoice_reference: invoiceUrl ? `Restock-${Date.now()}` : null,
            notes: `Goods received on credit.${notes ? ` ${notes}` : ""}`,
            status: "pending",
            recorded_by: user?.id,
          });

        if (payableError) throw payableError;
      }

      const stockLabel = selectedVariant 
        ? `${selectedVariant.variant_value}` 
        : product.name;
      
      const creditNote = costRecordingOption === "credit" ? " (Credit → Accounts Payable)" : "";
      toast({
        title: "Stock updated",
        description: `Added ${quantity} units to ${stockLabel}. New stock: ${newStock}${creditNote}`,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
          {/* Vendor Selection */}
          <div className="space-y-2">
            <Label>Vendor / Supplier</Label>
            {showNewVendorForm ? (
              <div className="space-y-3 p-3 border border-dashed border-[#0077B6]/30 rounded-lg bg-[#0077B6]/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#003366]">Add New Vendor</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowNewVendorForm(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Vendor name *"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="bg-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Contact person"
                    value={newVendorContact}
                    onChange={(e) => setNewVendorContact(e.target.value)}
                    className="bg-white"
                  />
                  <Input
                    placeholder="Phone"
                    value={newVendorPhone}
                    onChange={(e) => setNewVendorPhone(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleCreateVendor}
                  disabled={!newVendorName.trim() || isCreatingVendor}
                  className="w-full bg-[#0077B6] hover:bg-[#005f8d]"
                >
                  {isCreatingVendor ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Vendor
                </Button>
              </div>
            ) : (
              <Popover open={vendorPopoverOpen} onOpenChange={setVendorPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={vendorPopoverOpen}
                    className="w-full justify-between bg-[#f0f7fa] border-[#004B8D]/20"
                  >
                    {selectedVendor ? selectedVendor.name : "Select vendor (optional)"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search vendors..." />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-center">
                          <p className="text-sm text-muted-foreground mb-2">No vendors found</p>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => { 
                              setShowNewVendorForm(true); 
                              setVendorPopoverOpen(false); 
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add New Vendor
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {vendors.map((vendor) => (
                          <CommandItem
                            key={vendor.id}
                            value={vendor.name}
                            onSelect={() => {
                              setSelectedVendorId(vendor.id === selectedVendorId ? "" : vendor.id);
                              setVendorPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedVendorId === vendor.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{vendor.name}</span>
                              {vendor.contact_person && (
                                <span className="text-xs text-muted-foreground">{vendor.contact_person}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                        <CommandItem
                          onSelect={() => {
                            setShowNewVendorForm(true);
                            setVendorPopoverOpen(false);
                          }}
                          className="border-t"
                        >
                          <Plus className="mr-2 h-4 w-4 text-[#0077B6]" />
                          <span className="text-[#0077B6]">Add New Vendor</span>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

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
                onValueChange={(value: "opening" | "expense" | "credit") => setCostRecordingOption(value)}
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

                {/* Option 3: Credit Purchase → Accounts Payable */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    costRecordingOption === "credit"
                      ? "bg-white border-[#0077B6] ring-1 ring-[#0077B6]"
                      : "bg-white/50 border-[#004B8D]/20 hover:border-[#004B8D]/40"
                  }`}
                >
                  <RadioGroupItem value="credit" className="mt-1" />
                  <div className="flex-1">
                    <span className="font-medium text-[#003366] block flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Credit Purchase (Pay Later)
                    </span>
                    <span className="text-xs text-[#004B8D]/70 block mt-1">
                      Goods received on credit. Creates an <strong>Accounts Payable</strong> record to track what you owe the vendor.
                    </span>
                  </div>
                </label>
              </RadioGroup>

              {/* Credit purchase due date */}
              {costRecordingOption === "credit" && (
                <div className="space-y-2 mt-3">
                  <Label htmlFor="credit-due-date" className="text-sm">Payment Due Date</Label>
                  <Input
                    id="credit-due-date"
                    type="date"
                    value={creditDueDate}
                    onChange={(e) => setCreditDueDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  {!selectedVendorId && (
                    <p className="text-xs text-amber-600">⚠ Select a vendor above to track who you owe</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Document Attachments */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-[#003366] font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Attach Documents (optional)
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Invoice Upload */}
              <div className="space-y-2">
                <Label className="text-xs">Invoice</Label>
                {invoiceFile ? (
                  <div className="flex items-center gap-2 p-2 bg-white rounded border text-sm">
                    <FileText className="h-4 w-4 text-[#0077B6] flex-shrink-0" />
                    <span className="truncate flex-1">{invoiceFile.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile("invoice")}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <label className="block">
                    <input
                      ref={invoiceInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileSelect(e, "invoice")}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      asChild
                      disabled={isUploadingInvoice}
                    >
                      <span className="cursor-pointer">
                        {isUploadingInvoice ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload Invoice
                      </span>
                    </Button>
                  </label>
                )}
              </div>

              {/* Quotation Upload */}
              <div className="space-y-2">
                <Label className="text-xs">Quotation</Label>
                {quotationFile ? (
                  <div className="flex items-center gap-2 p-2 bg-white rounded border text-sm">
                    <FileText className="h-4 w-4 text-[#0077B6] flex-shrink-0" />
                    <span className="truncate flex-1">{quotationFile.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile("quotation")}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <label className="block">
                    <input
                      ref={quotationInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileSelect(e, "quotation")}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      asChild
                      disabled={isUploadingQuotation}
                    >
                      <span className="cursor-pointer">
                        {isUploadingQuotation ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload Quotation
                      </span>
                    </Button>
                  </label>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Supported: PDF, JPG, PNG</p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Invoice number, delivery reference..."
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
