import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X, ImageIcon, Plus, Trash2, Settings2, FileText, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";
import { useTenant } from "@/hooks/useTenant";

interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

interface TechnicalSpec {
  label: string;
  value: string;
}

const DEFAULT_SPECS: TechnicalSpec[] = [
  { label: "Material", value: "High-quality" },
  { label: "Dimensions", value: "Standard size" },
  { label: "Weight", value: "Lightweight" },
  { label: "Warranty", value: "1 year" },
];

const CERTIFICATION_OPTIONS = [
  { value: "quality", label: "Quality Certified" },
  { value: "eco-friendly", label: "Eco-Friendly" },
  { value: "iso", label: "ISO Certified" },
  { value: "safety", label: "Safety Tested" },
  { value: "organic", label: "Organic" },
  { value: "fair-trade", label: "Fair Trade" },
];

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: {
    id: string;
    sku: string;
    name: string;
    current_stock: number;
    unit_price: number;
    original_price?: number;
    reorder_level: number;
    liters_per_unit: number;
    image_url?: string | null;
    description?: string | null;
    highlight?: string | null;
    features?: string[] | null;
    category?: string | null;
    certifications?: string[] | null;
    datasheet_url?: string | null;
    manual_url?: string | null;
    technical_specs?: TechnicalSpec[] | null;
  } | null;
  onSuccess: () => void;
}

export function ProductModal({ open, onOpenChange, product, onSuccess }: ProductModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingDatasheet, setIsUploadingDatasheet] = useState(false);
  const [isUploadingManual, setIsUploadingManual] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<FieldChange[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const datasheetInputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { tenantId } = useTenant();
  
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    current_stock: 0,
    unit_price: 0,
    original_price: 0,
    reorder_level: 10,
    liters_per_unit: 0,
    image_url: "",
    description: "",
    highlight: "",
    features: "",
    category: "personal" as "personal" | "community",
    certifications: [] as string[],
    datasheet_url: "",
    manual_url: "",
  });
  
  const [technicalSpecs, setTechnicalSpecs] = useState<TechnicalSpec[]>(DEFAULT_SPECS);

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        name: product.name,
        current_stock: product.current_stock,
        unit_price: product.unit_price,
        original_price: product.original_price || 0,
        reorder_level: product.reorder_level,
        liters_per_unit: product.liters_per_unit,
        image_url: product.image_url || "",
        description: product.description || "",
        highlight: product.highlight || "",
        features: (product.features || []).join("\n"),
        category: (product.category as "personal" | "community") || "personal",
        certifications: product.certifications || ["bpa-free"],
        datasheet_url: product.datasheet_url || "",
        manual_url: product.manual_url || "",
      });
      setImagePreview(product.image_url || null);
      // Load technical specs from product or use defaults
      if (product.technical_specs && Array.isArray(product.technical_specs) && product.technical_specs.length > 0) {
        setTechnicalSpecs(product.technical_specs);
      } else {
        setTechnicalSpecs(DEFAULT_SPECS);
      }
    } else {
      setFormData({
        sku: "",
        name: "",
        current_stock: 0,
        unit_price: 0,
        original_price: 0,
        reorder_level: 10,
        liters_per_unit: 0,
        image_url: "",
        description: "",
        highlight: "",
        features: "",
        category: "personal",
        certifications: [],
        datasheet_url: "",
        manual_url: "",
      });
      setImagePreview(null);
      setTechnicalSpecs(DEFAULT_SPECS);
    }
    setImageFile(null);
    setDatasheetFile(null);
    setManualFile(null);
  }, [product, open]);
  
  const addSpec = () => {
    setTechnicalSpecs([...technicalSpecs, { label: "", value: "" }]);
  };
  
  const removeSpec = (index: number) => {
    setTechnicalSpecs(technicalSpecs.filter((_, i) => i !== index));
  };
  
  const updateSpec = (index: number, field: "label" | "value", newValue: string) => {
    const updated = [...technicalSpecs];
    updated[index][field] = newValue;
    setTechnicalSpecs(updated);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return formData.image_url || null;

    setIsUploading(true);
    try {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${formData.sku.trim() || Date.now()}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, imageFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadPdf = async (file: File | null, existingUrl: string, folder: string, setUploading: (val: boolean) => void): Promise<string | null> => {
    if (!file) return existingUrl || null;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${formData.sku.trim() || Date.now()}-${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-documents")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error(`Error uploading ${folder}:`, error);
      toast({
        title: "Upload Failed",
        description: error.message || `Failed to upload ${folder}`,
        variant: "destructive",
      });
      return existingUrl || null;
    } finally {
      setUploading(false);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>, type: "datasheet" | "manual") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "PDF must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    if (type === "datasheet") {
      setDatasheetFile(file);
    } else {
      setManualFile(file);
    }
  };

  const handleCertificationChange = (certValue: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, certifications: [...formData.certifications, certValue] });
    } else {
      setFormData({ ...formData, certifications: formData.certifications.filter(c => c !== certValue) });
    }
  };

  const getFieldChanges = (): FieldChange[] => {
    if (!product) return [];
    
    const changes: FieldChange[] = [];
    const fieldLabels: Record<string, string> = {
      sku: "SKU",
      name: "Product Name",
      current_stock: "Current Stock",
      unit_price: "Unit Price (ZMW)",
      original_price: "Original Price (ZMW)",
      reorder_level: "Reorder Level",
      liters_per_unit: "Liters per Unit",
      description: "Description",
      highlight: "Highlight",
      features: "Features",
      category: "Category",
      certifications: "Certifications",
    };

    // Compare basic fields
    if (formData.sku.trim() !== product.sku) {
      changes.push({ field: fieldLabels.sku, oldValue: product.sku, newValue: formData.sku.trim() });
    }
    if (formData.name.trim() !== product.name) {
      changes.push({ field: fieldLabels.name, oldValue: product.name, newValue: formData.name.trim() });
    }
    if (formData.current_stock !== product.current_stock) {
      changes.push({ field: fieldLabels.current_stock, oldValue: String(product.current_stock), newValue: String(formData.current_stock) });
    }
    if (formData.unit_price !== product.unit_price) {
      changes.push({ field: fieldLabels.unit_price, oldValue: String(product.unit_price), newValue: String(formData.unit_price) });
    }
    if (formData.original_price !== (product.original_price || 0)) {
      changes.push({ field: fieldLabels.original_price, oldValue: String(product.original_price || 0), newValue: String(formData.original_price) });
    }
    if (formData.reorder_level !== product.reorder_level) {
      changes.push({ field: fieldLabels.reorder_level, oldValue: String(product.reorder_level), newValue: String(formData.reorder_level) });
    }
    if (formData.liters_per_unit !== product.liters_per_unit) {
      changes.push({ field: fieldLabels.liters_per_unit, oldValue: String(product.liters_per_unit), newValue: String(formData.liters_per_unit) });
    }
    if (formData.description.trim() !== (product.description || "")) {
      changes.push({ field: fieldLabels.description, oldValue: product.description || "(empty)", newValue: formData.description.trim() || "(empty)" });
    }
    if (formData.highlight.trim() !== (product.highlight || "")) {
      changes.push({ field: fieldLabels.highlight, oldValue: product.highlight || "(empty)", newValue: formData.highlight.trim() || "(empty)" });
    }
    
    const currentFeatures = formData.features.split("\n").map(f => f.trim()).filter(f => f.length > 0).join(", ");
    const originalFeatures = (product.features || []).join(", ");
    if (currentFeatures !== originalFeatures) {
      changes.push({ field: fieldLabels.features, oldValue: originalFeatures || "(none)", newValue: currentFeatures || "(none)" });
    }
    
    if (formData.category !== (product.category || "personal")) {
      changes.push({ field: fieldLabels.category, oldValue: product.category || "personal", newValue: formData.category });
    }
    
    const currentCerts = [...formData.certifications].sort().join(", ");
    const originalCerts = [...(product.certifications || [])].sort().join(", ");
    if (currentCerts !== originalCerts) {
      changes.push({ field: fieldLabels.certifications, oldValue: originalCerts || "(none)", newValue: currentCerts || "(none)" });
    }

    // Check for new file uploads
    if (imageFile) {
      changes.push({ field: "Product Image", oldValue: product.image_url ? "Existing image" : "(none)", newValue: "New image uploaded" });
    }
    if (datasheetFile) {
      changes.push({ field: "Datasheet PDF", oldValue: product.datasheet_url ? "Existing file" : "(none)", newValue: "New file uploaded" });
    }
    if (manualFile) {
      changes.push({ field: "User Manual PDF", oldValue: product.manual_url ? "Existing file" : "(none)", newValue: "New file uploaded" });
    }

    // Check technical specs changes
    const currentSpecs = JSON.stringify(technicalSpecs.filter(s => s.label.trim() && s.value.trim()));
    const originalSpecs = JSON.stringify(product.technical_specs || []);
    if (currentSpecs !== originalSpecs) {
      changes.push({ field: "Technical Specifications", oldValue: "Modified", newValue: "Updated specs" });
    }

    return changes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sku.trim() || !formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "SKU and Product Name are required",
        variant: "destructive",
      });
      return;
    }

    if (formData.unit_price < 0) {
      toast({
        title: "Validation Error",
        description: "Unit price cannot be negative",
        variant: "destructive",
      });
      return;
    }

    if (formData.current_stock < 0) {
      toast({
        title: "Validation Error",
        description: "Stock cannot be negative",
        variant: "destructive",
      });
      return;
    }

    // For editing, show confirmation dialog with changes
    if (product) {
      const changes = getFieldChanges();
      if (changes.length === 0) {
        toast({
          title: "No Changes",
          description: "No changes detected to save",
        });
        return;
      }
      setPendingChanges(changes);
      setShowConfirmDialog(true);
      return;
    }

    // For new products, save directly
    await performSave();
  };

  const performSave = async () => {
    setIsSubmitting(true);

    try {
      const imageUrl = await uploadImage();
      const datasheetUrl = await uploadPdf(datasheetFile, formData.datasheet_url, "datasheets", setIsUploadingDatasheet);
      const manualUrl = await uploadPdf(manualFile, formData.manual_url, "manuals", setIsUploadingManual);
      const featuresArray = formData.features.split("\n").map(f => f.trim()).filter(f => f.length > 0);
      
      // Filter out empty specs
      const validSpecs = technicalSpecs.filter(spec => spec.label.trim() && spec.value.trim());

      const productData = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        current_stock: formData.current_stock,
        unit_price: formData.unit_price,
        original_price: formData.original_price,
        reorder_level: formData.reorder_level,
        liters_per_unit: formData.liters_per_unit,
        image_url: imageUrl,
        description: formData.description.trim() || null,
        highlight: formData.highlight.trim() || null,
        features: featuresArray.length > 0 ? featuresArray : null,
        category: formData.category,
        certifications: formData.certifications.length > 0 ? formData.certifications : null,
        datasheet_url: datasheetUrl,
        manual_url: manualUrl,
        technical_specs: validSpecs.length > 0 ? (validSpecs as unknown as Json) : null,
        tenant_id: tenantId,
      };

      if (product) {
        const { error } = await supabase
          .from("inventory")
          .update(productData)
          .eq("id", product.id);

        if (error) throw error;

        toast({
          title: "Product Updated",
          description: `${formData.name} has been updated successfully`,
        });
      } else {
        const { error } = await supabase
          .from("inventory")
          .insert(productData);

        if (error) throw error;

        toast({
          title: "Product Added",
          description: `${formData.name} has been added to inventory`,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      {/* Confirmation Dialog for Edits */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-lg bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#003366]">Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription className="text-[#004B8D]/70">
              The following fields will be updated:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 my-4">
            {pendingChanges.map((change, index) => (
              <div key={index} className="p-3 rounded-lg bg-[#f0f7fa] border border-[#004B8D]/10">
                <div className="font-medium text-[#003366] text-sm mb-1">{change.field}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-red-600 line-through truncate max-w-[140px]" title={change.oldValue}>
                    {change.oldValue.length > 30 ? change.oldValue.slice(0, 30) + "..." : change.oldValue}
                  </span>
                  <ArrowRight className="w-3 h-3 text-[#004B8D]/50 flex-shrink-0" />
                  <span className="text-green-600 truncate max-w-[140px]" title={change.newValue}>
                    {change.newValue.length > 30 ? change.newValue.slice(0, 30) + "..." : change.newValue}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#004B8D]/20 text-[#004B8D]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performSave}
              disabled={isSubmitting}
              className="bg-[#0077B6] hover:bg-[#005f8f] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                `Confirm ${pendingChanges.length} Change${pendingChanges.length !== 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[650px] bg-white border-[#004B8D]/20 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#003366]">
            {product ? "Edit Product" : "Add New Product"}
          </DialogTitle>
          <DialogDescription className="text-[#004B8D]/60">
            {product ? "Update product details below" : "Enter product details to add to inventory"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-[#003366]">Product Image</Label>
            <div className="flex items-start gap-4">
              <div
                className={`relative w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden ${
                  imagePreview ? "border-[#0077B6]" : "border-[#004B8D]/20"
                }`}
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="w-8 h-8 text-[#004B8D]/30" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="product-image"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="border-[#004B8D]/20 text-[#004B8D]"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Image
                </Button>
                <p className="text-xs text-[#004B8D]/50 mt-2">
                  Max 5MB. JPG, PNG, or WebP.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku" className="text-[#003366]">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., LS-PERSONAL"
                className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#003366]">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., LifeStraw Personal"
                className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-[#003366]">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: "personal" | "community") => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal Filter</SelectItem>
                  <SelectItem value="community">Community Dispenser</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="highlight" className="text-[#003366]">Highlight Badge</Label>
              <Input
                id="highlight"
                value={formData.highlight}
                onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
                placeholder="e.g., 180,000L Capacity"
                className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[#003366]">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product description shown on shop page..."
              className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] min-h-[80px]"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="features" className="text-[#003366]">Features (one per line)</Label>
            <Textarea
              id="features"
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              placeholder="Filters up to 4,000 liters&#10;No batteries required&#10;BPA-free materials"
              className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#003366]">Certifications</Label>
            <div className="grid grid-cols-3 gap-2">
              {CERTIFICATION_OPTIONS.map((cert) => (
                <div key={cert.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cert-${cert.value}`}
                    checked={formData.certifications.includes(cert.value)}
                    onCheckedChange={(checked) => handleCertificationChange(cert.value, checked as boolean)}
                  />
                  <label
                    htmlFor={`cert-${cert.value}`}
                    className="text-sm text-[#003366] cursor-pointer"
                  >
                    {cert.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_stock" className="text-[#003366]">Current Stock</Label>
              <Input
                id="current_stock"
                type="number"
                min={0}
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="liters_per_unit" className="text-[#003366]">Liters per Unit</Label>
              <Input
                id="liters_per_unit"
                type="number"
                min={0}
                value={formData.liters_per_unit}
                onChange={(e) => setFormData({ ...formData, liters_per_unit: parseInt(e.target.value) || 0 })}
                className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="original_price" className="text-[#003366]">Original Price (ZMW)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#004B8D]/50 text-sm">K</span>
                <Input
                  id="original_price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.original_price}
                  onChange={(e) => setFormData({ ...formData, original_price: parseFloat(e.target.value) || 0 })}
                  className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] pl-8"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-[#004B8D]/50">RRP shown with strikethrough</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price" className="text-[#003366]">Sale Price (ZMW) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#004B8D]/50 text-sm">K</span>
                <Input
                  id="unit_price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                  className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {formData.original_price > formData.unit_price && formData.unit_price > 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="text-[#004B8D]/50 line-through text-sm">
                K{formData.original_price.toLocaleString()}
              </span>
              <span className="text-[#0077B6] font-semibold">
                K{formData.unit_price.toLocaleString()}
              </span>
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                Save K{(formData.original_price - formData.unit_price).toLocaleString()}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reorder_level" className="text-[#003366]">Reorder Level</Label>
              <Input
                id="reorder_level"
                type="number"
                min={0}
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
                className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
              />
            </div>
            <div />
          </div>

          {/* Technical Specifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[#003366] flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Technical Specifications
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSpec}
                className="border-[#004B8D]/20 text-[#004B8D] h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Spec
              </Button>
            </div>
            <div className="space-y-2 bg-[#f0f7fa] p-3 rounded-lg border border-[#004B8D]/10">
              {technicalSpecs.map((spec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={spec.label}
                    onChange={(e) => updateSpec(index, "label", e.target.value)}
                    placeholder="Label (e.g., Pore Size)"
                    className="bg-white border-[#004B8D]/20 text-[#003366] flex-1"
                    maxLength={30}
                  />
                  <Input
                    value={spec.value}
                    onChange={(e) => updateSpec(index, "value", e.target.value)}
                    placeholder="Value (e.g., 0.2 microns)"
                    className="bg-white border-[#004B8D]/20 text-[#003366] flex-1"
                    maxLength={50}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSpec(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 flex-shrink-0"
                    disabled={technicalSpecs.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {technicalSpecs.length === 0 && (
                <p className="text-sm text-[#004B8D]/50 text-center py-2">
                  No specifications added. Click "Add Spec" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Product Documents Upload */}
          <div className="space-y-3">
            <Label className="text-[#003366] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Product Documents (PDF)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              {/* Datasheet Upload */}
              <div className="space-y-2">
                <Label className="text-sm text-[#003366]">Performance Datasheet</Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={datasheetInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handlePdfChange(e, "datasheet")}
                    className="hidden"
                    id="datasheet-pdf"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => datasheetInputRef.current?.click()}
                    disabled={isUploadingDatasheet}
                    className="border-[#004B8D]/20 text-[#004B8D] flex-1"
                  >
                    {isUploadingDatasheet ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {datasheetFile ? datasheetFile.name.slice(0, 15) + "..." : "Upload PDF"}
                  </Button>
                  {(datasheetFile || formData.datasheet_url) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDatasheetFile(null);
                        setFormData({ ...formData, datasheet_url: "" });
                        if (datasheetInputRef.current) datasheetInputRef.current.value = "";
                      }}
                      className="text-red-500 hover:text-red-700 h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {formData.datasheet_url && !datasheetFile && (
                  <a 
                    href={formData.datasheet_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-[#0077B6] hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    View current datasheet
                  </a>
                )}
              </div>

              {/* Manual Upload */}
              <div className="space-y-2">
                <Label className="text-sm text-[#003366]">User Manual</Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={manualInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handlePdfChange(e, "manual")}
                    className="hidden"
                    id="manual-pdf"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => manualInputRef.current?.click()}
                    disabled={isUploadingManual}
                    className="border-[#004B8D]/20 text-[#004B8D] flex-1"
                  >
                    {isUploadingManual ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {manualFile ? manualFile.name.slice(0, 15) + "..." : "Upload PDF"}
                  </Button>
                  {(manualFile || formData.manual_url) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setManualFile(null);
                        setFormData({ ...formData, manual_url: "" });
                        if (manualInputRef.current) manualInputRef.current.value = "";
                      }}
                      className="text-red-500 hover:text-red-700 h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {formData.manual_url && !manualFile && (
                  <a 
                    href={formData.manual_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-[#0077B6] hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    View current manual
                  </a>
                )}
              </div>
            </div>
            <p className="text-xs text-[#004B8D]/50">Max 10MB per file. These PDFs will be available for download on the product page.</p>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#004B8D]/20 text-[#004B8D]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading || isUploadingDatasheet || isUploadingManual}
              className="bg-[#004B8D] hover:bg-[#003366] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {product ? "Updating..." : "Adding..."}
                </>
              ) : (
                product ? "Update Product" : "Add Product"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}