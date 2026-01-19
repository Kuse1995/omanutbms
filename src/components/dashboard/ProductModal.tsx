import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X, ImageIcon, Plus, Trash2, Settings2, FileText, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";
import { useTenant } from "@/hooks/useTenant";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

interface TechnicalSpec {
  label: string;
  value: string;
}

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
    cost_price?: number;
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
  const [isSuggesting, setIsSuggesting] = useState(false);
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
  const { businessType, terminology, config, companyName } = useBusinessConfig();
  
  // Get form field config based on business type
  const formFields = config.formFields;
  const isServiceBusiness = businessType === 'services';

  // Categories that are considered services (no stock tracking)
  const serviceCategories = [
    'consultation', 'project', 'retainer', 'training', 'support', 'package',
    'treatment', 'haircut', 'styling', 'coloring', 'spa', 'bridal', 'barbering',
    'consultation_fee', 'lab_test', 'procedure', 'vaccination',
    'repair', 'maintenance', 'diagnostics', 'service', 'services',
    'maintenance_service'
  ];

  // Persist draft entries so switching tabs (unmounting this component) doesn't wipe unsaved work
  const draftKey = !product && tenantId ? `inventory-item-draft:${tenantId}:${businessType}` : null;
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    current_stock: 0,
    unit_price: 0,
    original_price: 0,
    cost_price: 0,
    reorder_level: 10,
    liters_per_unit: 0,
    image_url: "",
    description: "",
    highlight: "",
    features: "",
    category: formFields.categories[0]?.value || "other",
    certifications: [] as string[],
    datasheet_url: "",
    manual_url: "",
  });
  const [recordCostAsExpense, setRecordCostAsExpense] = useState(false);
  
  const [technicalSpecs, setTechnicalSpecs] = useState<TechnicalSpec[]>(formFields.defaultSpecs);

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        name: product.name,
        current_stock: product.current_stock,
        unit_price: product.unit_price,
        original_price: product.original_price || 0,
        cost_price: product.cost_price || 0,
        reorder_level: product.reorder_level,
        liters_per_unit: product.liters_per_unit,
        image_url: product.image_url || "",
        description: product.description || "",
        highlight: product.highlight || "",
        features: (product.features || []).join("\n"),
        category: product.category || formFields.categories[0]?.value || "other",
        certifications: product.certifications || [],
        datasheet_url: product.datasheet_url || "",
        manual_url: product.manual_url || "",
      });
      setImagePreview(product.image_url || null);
      setRecordCostAsExpense(false);
      if (product.technical_specs && Array.isArray(product.technical_specs) && product.technical_specs.length > 0) {
        setTechnicalSpecs(product.technical_specs);
      } else {
        setTechnicalSpecs(formFields.defaultSpecs);
      }
    } else {
      setFormData({
        sku: "",
        name: "",
        current_stock: 0,
        unit_price: 0,
        original_price: 0,
        cost_price: 0,
        reorder_level: 10,
        liters_per_unit: 0,
        image_url: "",
        description: "",
        highlight: "",
        features: "",
        category: formFields.categories[0]?.value || "other",
        certifications: [],
        datasheet_url: "",
        manual_url: "",
      });
      setImagePreview(null);
      setRecordCostAsExpense(false);
      setTechnicalSpecs(formFields.defaultSpecs);
    }
    setImageFile(null);
    setDatasheetFile(null);
    setManualFile(null);
  }, [product, open, formFields]);

  // Restore draft when creating a new item
  useEffect(() => {
    if (!open || product || !draftKey) return;

    const raw = sessionStorage.getItem(draftKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        formData?: Partial<typeof formData>;
        technicalSpecs?: TechnicalSpec[];
      };

      if (parsed.formData) {
        setFormData((prev) => ({
          ...prev,
          ...parsed.formData,
          certifications: Array.isArray((parsed.formData as any).certifications)
            ? ((parsed.formData as any).certifications as string[])
            : prev.certifications,
        }));

        // Only restore a previously uploaded image URL (can't restore a local file)
        if (typeof (parsed.formData as any).image_url === "string" && (parsed.formData as any).image_url) {
          setImagePreview((parsed.formData as any).image_url);
        }
      }

      if (Array.isArray(parsed.technicalSpecs)) {
        setTechnicalSpecs(parsed.technicalSpecs);
      }
    } catch {
      // Ignore corrupted draft
    }
  }, [open, product, draftKey]);

  // Persist draft while typing
  useEffect(() => {
    if (!open || product || !draftKey) return;

    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          formData: {
            ...formData,
            // Don't attempt to persist File objects (imageFile/datasheetFile/manualFile)
            image_url: formData.image_url,
          },
          technicalSpecs,
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [open, product, draftKey, formData, technicalSpecs]);

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

  const handleAISuggest = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name Required",
        description: `Please enter a ${terminology.product.toLowerCase()} name first`,
        variant: "destructive",
      });
      return;
    }

    setIsSuggesting(true);
    try {
      const response = await supabase.functions.invoke('suggest-service-details', {
        body: {
          businessType,
          companyName,
          itemName: formData.name.trim(),
          category: formData.category,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get AI suggestions');
      }

      const suggestions = response.data;

      // Apply suggestions to form
      setFormData(prev => ({
        ...prev,
        description: suggestions.description || prev.description,
        highlight: suggestions.highlight || prev.highlight,
        features: suggestions.features?.join("\n") || prev.features,
        unit_price: suggestions.suggestedPrice || prev.unit_price,
      }));

      // Apply qualifications/certifications if provided
      if (suggestions.qualifications && Array.isArray(suggestions.qualifications)) {
        const matchedCerts = formFields.certifications
          .filter(cert => 
            suggestions.qualifications.some((q: string) => 
              cert.label.toLowerCase().includes(q.toLowerCase()) ||
              q.toLowerCase().includes(cert.label.toLowerCase())
            )
          )
          .map(cert => cert.value);
        
        if (matchedCerts.length > 0) {
          setFormData(prev => ({
            ...prev,
            certifications: [...new Set([...prev.certifications, ...matchedCerts])],
          }));
        }
      }

      toast({
        title: "AI Suggestions Applied",
        description: "Review and adjust the suggestions as needed",
      });
    } catch (error: any) {
      console.error('AI suggestion error:', error);
      toast({
        title: "Suggestion Failed",
        description: error.message || "Could not generate suggestions",
        variant: "destructive",
      });
    } finally {
      setIsSuggesting(false);
    }
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
      name: `${terminology.product} Name`,
      current_stock: "Current Stock",
      unit_price: `Unit Price`,
      original_price: `Original Price`,
      cost_price: `Cost Price`,
      reorder_level: "Reorder Level",
      liters_per_unit: formFields.impactUnitsField?.label || "Impact Units",
      description: "Description",
      highlight: "Highlight",
      features: isServiceBusiness ? "What's Included" : "Features",
      category: "Category",
      certifications: formFields.certificationsLabel,
    };

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
    if (formData.cost_price !== (product.cost_price || 0)) {
      changes.push({ field: fieldLabels.cost_price, oldValue: String(product.cost_price || 0), newValue: String(formData.cost_price) });
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
    
    if (formData.category !== (product.category || formFields.categories[0]?.value)) {
      changes.push({ field: fieldLabels.category, oldValue: product.category || formFields.categories[0]?.value, newValue: formData.category });
    }
    
    const currentCerts = [...formData.certifications].sort().join(", ");
    const originalCerts = [...(product.certifications || [])].sort().join(", ");
    if (currentCerts !== originalCerts) {
      changes.push({ field: fieldLabels.certifications, oldValue: originalCerts || "(none)", newValue: currentCerts || "(none)" });
    }

    if (imageFile) {
      changes.push({ field: `${terminology.product} Image`, oldValue: product.image_url ? "Existing image" : "(none)", newValue: "New image uploaded" });
    }
    if (datasheetFile) {
      changes.push({ field: "Datasheet PDF", oldValue: product.datasheet_url ? "Existing file" : "(none)", newValue: "New file uploaded" });
    }
    if (manualFile) {
      changes.push({ field: "User Manual PDF", oldValue: product.manual_url ? "Existing file" : "(none)", newValue: "New file uploaded" });
    }

    const currentSpecs = JSON.stringify(technicalSpecs.filter(s => s.label.trim() && s.value.trim()));
    const originalSpecs = JSON.stringify(product.technical_specs || []);
    if (currentSpecs !== originalSpecs) {
      changes.push({ field: "Technical Specifications", oldValue: "Modified", newValue: "Updated specs" });
    }

    return changes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantId) {
      toast({
        title: "Error",
        description: "Unable to identify your organization. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.sku.trim() || !formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: `SKU and ${terminology.product} Name are required`,
        variant: "destructive",
      });
      return;
    }

    if (formData.unit_price < 0) {
      toast({
        title: "Validation Error",
        description: "Price cannot be negative",
        variant: "destructive",
      });
      return;
    }

    if (!formFields.hideStock && formData.current_stock < 0) {
      toast({
        title: "Validation Error",
        description: "Stock cannot be negative",
        variant: "destructive",
      });
      return;
    }

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

    await performSave();
  };

  const performSave = async () => {
    setIsSubmitting(true);

    try {
      const imageUrl = await uploadImage();
      const datasheetUrl = await uploadPdf(datasheetFile, formData.datasheet_url, "datasheets", setIsUploadingDatasheet);
      const manualUrl = await uploadPdf(manualFile, formData.manual_url, "manuals", setIsUploadingManual);
      const featuresArray = formData.features.split("\n").map(f => f.trim()).filter(f => f.length > 0);
      
      const validSpecs = technicalSpecs.filter(spec => spec.label.trim() && spec.value.trim());

      // Determine if this is a service based on category
      const serviceCategories = [
        'consultation', 'project', 'retainer', 'training', 'support', 'package',
        'treatment', 'haircut', 'styling', 'coloring', 'spa', 'bridal', 'barbering',
        'consultation_fee', 'lab_test', 'procedure', 'vaccination',
        'repair', 'maintenance', 'diagnostics', 'service', 'services',
        'maintenance_service'
      ];
      const isServiceItem = serviceCategories.includes(formData.category) || formFields.hideStock;
      const itemType = isServiceItem ? 'service' : 'product';

      const productData = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        current_stock: isServiceItem ? 9999 : formData.current_stock,
        unit_price: formData.unit_price,
        original_price: formData.original_price,
        cost_price: formData.cost_price,
        reorder_level: isServiceItem ? 0 : formData.reorder_level,
        liters_per_unit: formFields.impactUnitsField?.enabled === false ? 0 : formData.liters_per_unit,
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
        item_type: itemType,
      };

      if (product) {
        const { error } = await supabase
          .from("inventory")
          .update(productData)
          .eq("id", product.id);

        if (error) throw error;

        toast({
          title: `${terminology.product} Updated`,
          description: `${formData.name} has been updated successfully`,
        });
      } else {
        const { error } = await supabase
          .from("inventory")
          .insert(productData);

        if (error) throw error;

        // Record cost as expense if selected and cost_price > 0
        if (recordCostAsExpense && formData.cost_price > 0) {
          const totalCostForStock = formData.cost_price * (isServiceItem ? 1 : formData.current_stock);
          const { error: expenseError } = await supabase
            .from("expenses")
            .insert({
              category: 'Cost of Goods Sold - Vestergaard',
              vendor_name: 'Inventory Purchase',
              amount_zmw: totalCostForStock,
              date_incurred: new Date().toISOString().split('T')[0],
              notes: `Initial stock cost for ${formData.name} (${isServiceItem ? '1 service' : `${formData.current_stock} units`} @ K${formData.cost_price} each)`,
              tenant_id: tenantId,
            });

          if (expenseError) {
            console.error("Error recording expense:", expenseError);
            // Don't fail the whole operation, just notify
            toast({
              title: "Note",
              description: "Product added but expense recording failed",
              variant: "destructive",
            });
          } else {
            toast({
              title: `${terminology.product} Added with Expense`,
              description: `${formData.name} added and K${totalCostForStock.toLocaleString()} recorded as expense`,
            });
          }
        } else {
          toast({
            title: `${terminology.product} Added`,
            description: `${formData.name} has been added`,
          });
        }
      }

      if (!product && draftKey) {
        try {
          sessionStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving product/service:", error);
      let errorMessage = `Failed to save ${terminology.product.toLowerCase()}`;
      
      if (error.message) {
        errorMessage = error.message;
      }
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        errorMessage = "Permission denied. Please ensure you have admin or manager access.";
      }
      if (error.code === '23505') {
        errorMessage = "A product with this SKU already exists.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
            {product ? `Edit ${terminology.product}` : `Add New ${terminology.product}`}
          </DialogTitle>
          <DialogDescription className="text-[#004B8D]/60">
            {product ? `Update ${terminology.product.toLowerCase()} details below` : `Enter ${terminology.product.toLowerCase()} details`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-[#003366]">{terminology.product} Image</Label>
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
                      alt="Preview"
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
                placeholder={formFields.skuPlaceholder}
                className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#003366]">{terminology.product} Name *</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={formFields.namePlaceholder}
                  className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] flex-1"
                  maxLength={100}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAISuggest}
                  disabled={isSuggesting || !formData.name.trim()}
                  className="border-[#004B8D]/20 text-[#004B8D] hover:bg-[#0077B6] hover:text-white shrink-0"
                  title="Get AI suggestions"
                >
                  {isSuggesting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-[#003366]">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {formFields.categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="highlight" className="text-[#003366]">Highlight Badge</Label>
              <Input
                id="highlight"
                value={formData.highlight}
                onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
                placeholder={formFields.highlightPlaceholder}
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
              placeholder={formFields.descriptionPlaceholder}
              className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] min-h-[80px]"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="features" className="text-[#003366]">
              {isServiceBusiness ? "What's Included (one per line)" : "Features (one per line)"}
            </Label>
            <Textarea
              id="features"
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              placeholder={formFields.featuresPlaceholder}
              className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#003366]">{formFields.certificationsLabel}</Label>
            <div className="grid grid-cols-3 gap-2">
              {formFields.certifications.map((cert) => (
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

          {/* Stock fields - hidden for services (based on category or business type) */}
          {!formFields.hideStock && !serviceCategories.includes(formData.category) && (
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
              {formFields.impactUnitsField?.enabled && (
                <div className="space-y-2">
                  <Label htmlFor="liters_per_unit" className="text-[#003366]">
                    {formFields.impactUnitsField.label}
                  </Label>
                  <Input
                    id="liters_per_unit"
                    type="number"
                    min={0}
                    placeholder={formFields.impactUnitsField.placeholder}
                    value={formData.liters_per_unit}
                    onChange={(e) => setFormData({ ...formData, liters_per_unit: parseInt(e.target.value) || 0 })}
                    className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="original_price" className="text-[#003366]">Original Price</Label>
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
              <Label htmlFor="unit_price" className="text-[#003366]">
                {isServiceBusiness ? "Service Fee *" : "Sale Price *"}
              </Label>
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

          {/* Cost Price and Profit Margin */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_price" className="text-[#003366]">Cost Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#004B8D]/50 text-sm">K</span>
                <Input
                  id="cost_price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                  className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] pl-8"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-[#004B8D]/50">Your purchase/production cost</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[#003366]">Profit Margin</Label>
              {formData.cost_price > 0 && formData.unit_price > 0 ? (
                <div className="h-10 flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    formData.unit_price > formData.cost_price 
                      ? 'bg-green-50 border border-green-200' 
                      : formData.unit_price < formData.cost_price
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-amber-50 border border-amber-200'
                  }`}>
                    <span className={`font-semibold ${
                      formData.unit_price > formData.cost_price 
                        ? 'text-green-600' 
                        : formData.unit_price < formData.cost_price
                        ? 'text-red-600'
                        : 'text-amber-600'
                    }`}>
                      K{(formData.unit_price - formData.cost_price).toLocaleString()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      formData.unit_price > formData.cost_price 
                        ? 'bg-green-500 text-white' 
                        : formData.unit_price < formData.cost_price
                        ? 'bg-red-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}>
                      {formData.cost_price > 0 
                        ? `${(((formData.unit_price - formData.cost_price) / formData.cost_price) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-10 flex items-center">
                  <span className="text-[#004B8D]/40 text-sm italic">Enter cost & sale price</span>
                </div>
              )}
            </div>
          </div>

          {/* Stock Cost Recording Options - only for new products with cost price */}
          {!product && formData.cost_price > 0 && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-[#003366] font-medium">
                How should we record this stock cost of{' '}
                <span className="text-[#0077B6] font-semibold">
                  K{(formData.cost_price * (serviceCategories.includes(formData.category) ? 1 : formData.current_stock)).toLocaleString()}
                </span>
                ?
              </p>

              <div className="space-y-2">
                {/* Option 1: Opening Stock */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    !recordCostAsExpense 
                      ? 'bg-white border-[#0077B6] ring-1 ring-[#0077B6]' 
                      : 'bg-white/50 border-[#004B8D]/20 hover:border-[#004B8D]/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="cost_recording"
                    checked={!recordCostAsExpense}
                    onChange={() => setRecordCostAsExpense(false)}
                    className="mt-1 h-4 w-4 text-[#0077B6] focus:ring-[#0077B6]"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-[#003366] block">
                      Set as Opening Stock (Setup Only)
                    </span>
                    <span className="text-xs text-[#004B8D]/70 block mt-1">
                      This will <strong>not affect today's profit</strong>. Use this for stock you already had before starting to use this system.
                    </span>
                  </div>
                </label>

                {/* Option 2: Record as Expense */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    recordCostAsExpense 
                      ? 'bg-white border-[#0077B6] ring-1 ring-[#0077B6]' 
                      : 'bg-white/50 border-[#004B8D]/20 hover:border-[#004B8D]/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="cost_recording"
                    checked={recordCostAsExpense}
                    onChange={() => setRecordCostAsExpense(true)}
                    className="mt-1 h-4 w-4 text-[#0077B6] focus:ring-[#0077B6]"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-[#003366] block">
                      Record as Today's Expense
                    </span>
                    <span className="text-xs text-[#004B8D]/70 block mt-1">
                      This will <strong>immediately affect profit</strong>. Use this for new purchases you made today.
                    </span>
                  </div>
                </label>
              </div>

              <p className="text-xs text-[#004B8D]/60 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-start gap-2">
                <span className="text-amber-500 font-bold">💡</span>
                <span>
                  <strong>Tip:</strong> Most businesses should select "Opening Stock" during initial setup to avoid affecting profit calculations.
                </span>
              </p>
            </div>
          )}

          {!formFields.hideStock && (
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
          )}

          {/* Technical Specifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[#003366] flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                {isServiceBusiness ? "Service Details" : "Technical Specifications"}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSpec}
                className="border-[#004B8D]/20 text-[#004B8D] h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2 bg-[#f0f7fa] p-3 rounded-lg border border-[#004B8D]/10">
              {technicalSpecs.map((spec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={spec.label}
                    onChange={(e) => updateSpec(index, "label", e.target.value)}
                    placeholder="Label"
                    className="bg-white border-[#004B8D]/20 text-[#003366] flex-1"
                    maxLength={30}
                  />
                  <Input
                    value={spec.value}
                    onChange={(e) => updateSpec(index, "value", e.target.value)}
                    placeholder="Value"
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
                  No specifications added. Click "Add" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Product Documents Upload */}
          <div className="space-y-3">
            <Label className="text-[#003366] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents (PDF)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              {/* Datasheet Upload */}
              <div className="space-y-2">
                <Label className="text-sm text-[#003366]">
                  {isServiceBusiness ? "Service Brochure" : "Performance Datasheet"}
                </Label>
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
                    View current file
                  </a>
                )}
              </div>

              {/* Manual Upload */}
              <div className="space-y-2">
                <Label className="text-sm text-[#003366]">
                  {isServiceBusiness ? "Service Agreement" : "User Manual"}
                </Label>
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
                    View current file
                  </a>
                )}
              </div>
            </div>
            <p className="text-xs text-[#004B8D]/50">Max 10MB per file.</p>
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
                product ? `Update ${terminology.product}` : `Add ${terminology.product}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
