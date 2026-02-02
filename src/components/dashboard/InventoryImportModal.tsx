import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, Loader2, Wand2, Settings2, AlertCircle, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useBranch } from "@/hooks/useBranch";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { ImportConverterModal } from "./ImportConverterModal";
import { CSVColumnMapper, SchemaField } from "./CSVColumnMapper";

interface InventoryImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  sku: string;
  name: string;
  current_stock: number;
  unit_price: number;
  cost_price: number;
  reorder_level: number;
  liters_per_unit: number;
  description: string;
  category: string;
  isValid: boolean;
  errors: string[];
  rowNumber: number;
}

interface ProcessingLogItem {
  sku: string;
  name: string;
  status: 'processing' | 'success' | 'error';
  action?: 'added' | 'updated';
  error?: string;
}

type ImportStep = "upload" | "mapping" | "preview";

const inventorySchemaFields: SchemaField[] = [
  { key: 'sku', label: 'SKU', required: true, type: 'string', aliases: ['product_code', 'item_code', 'code', 'barcode'] },
  { key: 'name', label: 'Name', required: true, type: 'string', aliases: ['product_name', 'item_name', 'product', 'item', 'title'] },
  { key: 'unit_price', label: 'Unit Price (Selling)', required: true, type: 'number', aliases: ['price', 'selling_price', 'retail_price', 'sale_price'] },
  { key: 'cost_price', label: 'Cost Price (Purchase)', required: false, type: 'number', aliases: ['cost', 'purchase_price', 'buying_price', 'wholesale'] },
  { key: 'current_stock', label: 'Current Stock', required: false, type: 'number', aliases: ['stock', 'quantity', 'qty', 'on_hand', 'available'] },
  { key: 'reorder_level', label: 'Reorder Level', required: false, type: 'number', aliases: ['reorder', 'min_stock', 'minimum', 'threshold'] },
  { key: 'description', label: 'Description', required: false, type: 'string', aliases: ['desc', 'details', 'notes'] },
  { key: 'category', label: 'Category', required: false, type: 'string', aliases: ['type', 'group', 'department'] },
];

// Check if CSV columns match expected schema
function needsColumnMapping(columns: string[]): boolean {
  const normalizedColumns = columns.map(c => c.toLowerCase().trim().replace(/\s+/g, '_'));
  const requiredFields = inventorySchemaFields.filter(f => f.required).map(f => f.key);
  
  // Check if any required fields are directly present
  const directMatch = requiredFields.every(field => {
    const fieldDef = inventorySchemaFields.find(f => f.key === field);
    const allNames = [field, ...(fieldDef?.aliases || [])];
    return normalizedColumns.some(col => allNames.includes(col));
  });
  
  return !directMatch;
}

export function InventoryImportModal({ open, onOpenChange, onSuccess }: InventoryImportModalProps) {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ added: number; updated: number; failed: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("spreadsheet");
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [rawFileData, setRawFileData] = useState<Record<string, any>[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [processingLog, setProcessingLog] = useState<ProcessingLogItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [targetBranchId, setTargetBranchId] = useState<string>("none");
  const logEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { isMultiBranchEnabled, branches } = useBranch();
  const { terminology } = useBusinessConfig();

  // Auto-scroll processing log to bottom
  useEffect(() => {
    if (logEndRef.current && isImporting) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [processingLog, isImporting]);

  const resetState = () => {
    setParsedData([]);
    setImportProgress(0);
    setImportResults(null);
    setImportStep("upload");
    setRawFileData([]);
    setSourceColumns([]);
    setProcessingLog([]);
    setCurrentItemIndex(0);
    setTargetBranchId("none");
  };

  const handleConvertedData = (data: any[]) => {
    // Convert the AI-extracted data to our ParsedRow format
    const validated = convertToParsedRows(data);
    setParsedData(validated);
    setImportStep("preview");
    setActiveTab("spreadsheet");
    toast({
      title: "Data Ready for Import",
      description: `${validated.filter(r => r.isValid).length} items ready to import`,
    });
  };

  const handleMappingComplete = (mappings: Record<string, string>, transformedData: Record<string, any>[]) => {
    const validated = convertToParsedRows(transformedData);
    setParsedData(validated);
    setImportStep("preview");
    toast({
      title: "Mapping Applied",
      description: `${validated.filter(r => r.isValid).length} items ready to import`,
    });
  };

  const convertToParsedRows = (data: any[]): ParsedRow[] => {
    return data.map((row, idx) => {
      const parsed: ParsedRow = {
        sku: String(row.sku || "").trim(),
        name: String(row.name || "").trim(),
        current_stock: parseInt(row.current_stock) || 0,
        unit_price: parseFloat(row.unit_price) || 0,
        cost_price: parseFloat(row.cost_price) || 0,
        reorder_level: parseInt(row.reorder_level) || 10,
        liters_per_unit: parseInt(row.liters_per_unit) || 0,
        description: String(row.description || "").trim(),
        category: String(row.category || "").trim(),
        isValid: true,
        errors: [],
        rowNumber: idx + 1,
      };
      
      // Validate
      const errors: string[] = [];
      if (!parsed.sku) errors.push("SKU is required");
      if (!parsed.name) errors.push("Name is required");
      if (parsed.unit_price < 0) errors.push("Selling price cannot be negative");
      if (parsed.cost_price < 0) errors.push("Cost price cannot be negative");
      
      return { ...parsed, isValid: errors.length === 0, errors };
    });
  };

  const validateRows = (rawRows: any[]): ParsedRow[] => {
    return rawRows.map((rawRow, idx) => {
      const row: any = { rowNumber: idx + 2, errors: [] };
      
      // Normalize header keys to lowercase and handle various formats
      const normalizedRow: any = {};
      Object.keys(rawRow).forEach(key => {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
        normalizedRow[normalizedKey] = rawRow[key];
      });

      row.sku = String(normalizedRow.sku || "").trim();
      row.name = String(normalizedRow.name || "").trim();
      row.current_stock = parseInt(normalizedRow.current_stock || normalizedRow.stock) || 0;
      row.unit_price = parseFloat(normalizedRow.unit_price || normalizedRow.selling_price || normalizedRow.price) || 0;
      row.cost_price = parseFloat(normalizedRow.cost_price || normalizedRow.cost || normalizedRow.purchase_price) || 0;
      row.reorder_level = parseInt(normalizedRow.reorder_level || normalizedRow.reorder) || 10;
      row.liters_per_unit = parseInt(normalizedRow.liters_per_unit) || 0;
      row.description = String(normalizedRow.description || "").trim();
      row.category = String(normalizedRow.category || "").trim();

      // Validation
      if (!row.sku) row.errors.push("SKU is required");
      if (!row.name) row.errors.push("Name is required");
      if (row.unit_price < 0) row.errors.push("Selling price cannot be negative");
      if (row.cost_price < 0) row.errors.push("Cost price cannot be negative");
      if (row.current_stock < 0) row.errors.push("Stock cannot be negative");

      row.isValid = row.errors.length === 0;
      return row as ParsedRow;
    });
  };

  const parseCSVRaw = (content: string): { columns: string[]; rows: Record<string, any>[] } => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return { columns: [], rows: [] };

    // Handle quoted CSV values properly
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const rawRows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const rawRow: Record<string, any> = {};
      headers.forEach((header, idx) => {
        rawRow[header] = values[idx] || "";
      });
      rawRows.push(rawRow);
    }

    return { columns: headers, rows: rawRows };
  };

  const parseExcelRaw = (data: ArrayBuffer): { columns: string[]; rows: Record<string, any>[] } => {
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(firstSheet);
    
    // Extract columns from first row
    const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    return { columns, rows: rawRows };
  };

  const handleFile = (file: File) => {
    const isCSV = file.name.endsWith(".csv");
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isCSV && !isExcel) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV or Excel (.xlsx) file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { columns, rows } = isCSV 
          ? parseCSVRaw(e.target?.result as string)
          : parseExcelRaw(e.target?.result as ArrayBuffer);
        
        if (rows.length === 0) {
          toast({
            title: "Empty File",
            description: "The file appears to be empty",
            variant: "destructive",
          });
          return;
        }

        // Store raw data for potential mapping
        setRawFileData(rows);
        setSourceColumns(columns);
        setImportResults(null);

        // Check if columns need mapping
        if (needsColumnMapping(columns)) {
          setImportStep("mapping");
          toast({
            title: "Column Mapping Required",
            description: "Please map your columns to the system fields",
          });
        } else {
          // Direct conversion if columns match
          const validated = convertToParsedRows(rows.map((row, idx) => {
            // Normalize keys for direct match
            const normalized: Record<string, any> = {};
            Object.entries(row).forEach(([key, value]) => {
              const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
              // Find matching schema field
              const field = inventorySchemaFields.find(f => 
                f.key === normalizedKey || f.aliases?.includes(normalizedKey)
              );
              if (field) {
                normalized[field.key] = value;
              }
            });
            return normalized;
          }));
          setParsedData(validated);
          setImportStep("preview");
        }
      } catch (error) {
        console.error("Parse error:", error);
        toast({
          title: "Parse Error",
          description: "Failed to parse the file. Please check the format.",
          variant: "destructive",
        });
      }
    };

    if (isCSV) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast({
        title: "No Valid Rows",
        description: "Please fix validation errors before importing",
        variant: "destructive",
      });
      return;
    }
    
    if (!tenantId) {
      toast({
        title: "Error",
        description: "Organization context missing. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setProcessingLog([]);
    setCurrentItemIndex(0);

    let added = 0;
    let updated = 0;
    let failed = 0;
    let firstErrorMessage: string | null = null;

    // Debug: log import context for troubleshooting
    console.log("Import context:", { tenantId });

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setCurrentItemIndex(i + 1);
      
      // Add processing item to log
      setProcessingLog(prev => [
        ...prev.filter(item => item.sku !== row.sku),
        { sku: row.sku, name: row.name, status: 'processing' }
      ]);

      try {
        // Check if SKU exists for this tenant (only active items - archived items are ignored)
        const { data: existing } = await supabase
          .from("inventory")
          .select("id")
          .eq("sku", row.sku)
          .eq("tenant_id", tenantId)
          .eq("is_archived", false)
          .maybeSingle();

        if (existing) {
          // Update - include branch assignment
          const updateData: Record<string, any> = {
            name: row.name,
            current_stock: row.current_stock,
            unit_price: row.unit_price,
            cost_price: row.cost_price || 0,
            reorder_level: row.reorder_level,
            liters_per_unit: row.liters_per_unit,
            description: row.description || null,
            category: row.category || null,
          };
          // Apply branch assignment if set (central = null, none = don't change)
          if (targetBranchId !== "none") {
            updateData.default_location_id = targetBranchId === "central" ? null : targetBranchId;
          }

          const { error } = await supabase
            .from("inventory")
            .update(updateData)
            .eq("id", existing.id);

          if (error) throw error;
          updated++;
          
          // Update log with success
          setProcessingLog(prev => 
            prev.map(item => 
              item.sku === row.sku 
                ? { ...item, status: 'success' as const, action: 'updated' as const }
                : item
            )
          );
        } else {
          // Insert - include branch assignment
          const insertData = {
            tenant_id: tenantId,
            sku: row.sku,
            name: row.name,
            current_stock: row.current_stock,
            unit_price: row.unit_price,
            cost_price: row.cost_price || 0,
            reorder_level: row.reorder_level,
            liters_per_unit: row.liters_per_unit,
            description: row.description || null,
            category: row.category || null,
            default_location_id: (targetBranchId !== "none" && targetBranchId !== "central") ? targetBranchId : null,
          };

          const { error } = await supabase
            .from("inventory")
            .insert(insertData);

          if (error) throw error;
          added++;
          
          // Update log with success
          setProcessingLog(prev => 
            prev.map(item => 
              item.sku === row.sku 
                ? { ...item, status: 'success' as const, action: 'added' as const }
                : item
            )
          );
        }
      } catch (error: any) {
        console.error("Import error for row:", row, error);
        // Capture first error for user feedback
        if (!firstErrorMessage && error?.message) {
          firstErrorMessage = error.message;
        }
        failed++;
        
        // Update log with error
        setProcessingLog(prev => 
          prev.map(item => 
            item.sku === row.sku 
              ? { ...item, status: 'error' as const, error: error?.message || 'Unknown error' }
              : item
          )
        );
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setIsImporting(false);
    setImportResults({ added, updated, failed });

    // Show appropriate toast based on results
    if (failed === validRows.length && firstErrorMessage) {
      toast({
        title: "Import Failed",
        description: firstErrorMessage.includes("row-level security")
          ? "Permission denied. Your role may not allow inventory imports."
          : firstErrorMessage,
        variant: "destructive",
      });
    } else if (failed > 0) {
      toast({
        title: "Import Partially Complete",
        description: `${added} added, ${updated} updated, ${failed} failed. ${firstErrorMessage ? `Error: ${firstErrorMessage}` : ''}`,
        variant: "default",
      });
    } else {
      toast({
        title: "Import Complete",
        description: `${added} added, ${updated} updated`,
      });
    }

    if (added > 0 || updated > 0) {
      onSuccess();
    }
  };

  const downloadTemplate = () => {
    const template = `sku,name,current_stock,unit_price,cost_price,reorder_level,category,description
PROD-001,Sample Product,50,450,300,10,general,Main product description
PROD-002,Another Product,30,650,450,10,accessories,Secondary product
PROD-003,Premium Product,5,8500,6000,2,premium,High-end product with full features`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.filter(r => !r.isValid).length;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white border-[#004B8D]/20">
          <DialogHeader>
            <DialogTitle className="text-[#003366] flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[#0077B6]" />
              Import {terminology.inventory}
            </DialogTitle>
            <DialogDescription className="text-[#004B8D]/60">
              Upload a CSV/Excel file or convert from Word/PDF documents
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Upload */}
          {importStep === "upload" && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="spreadsheet" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV / Excel
                </TabsTrigger>
                <TabsTrigger value="document" className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Convert from Document
                </TabsTrigger>
              </TabsList>

              <TabsContent value="spreadsheet" className="space-y-4">
                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver
                      ? "border-[#0077B6] bg-[#0077B6]/5"
                      : "border-[#004B8D]/20 hover:border-[#004B8D]/40"
                  }`}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-[#004B8D]/40" />
                  <p className="text-[#003366] font-medium mb-2">
                    Drag & drop your file here
                  </p>
                  <p className="text-[#004B8D]/60 text-sm mb-1">Supports CSV and Excel (.xlsx) files — any column format</p>
                  <p className="text-[#004B8D]/60 text-sm mb-4">or</p>
                  <label>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <Button variant="outline" className="border-[#004B8D]/20 text-[#004B8D]" asChild>
                      <span className="cursor-pointer">Browse Files</span>
                    </Button>
                  </label>
                </div>

                {/* Smart Import Info */}
                <div className="flex items-start gap-3 p-4 bg-[#004B8D]/5 rounded-lg">
                  <Settings2 className="h-5 w-5 text-[#0077B6] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#003366] font-medium text-sm">Smart Column Mapping</p>
                    <p className="text-[#004B8D]/60 text-xs">
                      Upload any CSV format — the system will help you map columns to the right fields
                    </p>
                  </div>
                </div>

                {/* Template Download */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-[#003366] font-medium text-sm">Prefer a template?</p>
                    <p className="text-[#004B8D]/60 text-xs">
                      Download a sample CSV with the expected format
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-[#0077B6]">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="document" className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center border-[#004B8D]/20">
                  <Wand2 className="h-12 w-12 mx-auto mb-4 text-primary/60" />
                  <p className="text-[#003366] font-medium mb-2">
                    AI-Powered Document Conversion
                  </p>
                  <p className="text-[#004B8D]/60 text-sm mb-4">
                    Upload a Word document, PDF, or image and AI will extract {terminology.product.toLowerCase()} data for you
                  </p>
                  <Button onClick={() => setIsConverterOpen(true)}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Convert Document
                  </Button>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Supported formats:</strong> Word (.docx), PDF, Images (JPG, PNG)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Works great with {terminology.product.toLowerCase()} lists, price sheets, supplier catalogs, and more.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Step 2: Column Mapping */}
          {importStep === "mapping" && (
            <CSVColumnMapper
              sourceColumns={sourceColumns}
              schemaFields={inventorySchemaFields}
              rawData={rawFileData}
              onMappingComplete={handleMappingComplete}
              onCancel={() => {
                setImportStep("upload");
                setRawFileData([]);
                setSourceColumns([]);
              }}
            />
          )}

          {/* Step 3: Preview & Import */}
          {importStep === "preview" && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {validCount} Valid
              </Badge>
              {invalidCount > 0 && (
                <Badge className="bg-red-100 text-red-700 border-red-200">
                  <XCircle className="h-3 w-3 mr-1" />
                  {invalidCount} Invalid
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="ml-auto text-[#004B8D]/60"
              >
                Upload Different File
              </Button>
            </div>

            {/* Branch Selection for Import */}
            {isMultiBranchEnabled && (
              <div className="flex items-center gap-3 p-3 bg-[#004B8D]/5 border border-[#004B8D]/10 rounded-lg">
                <Building2 className="h-5 w-5 text-[#0077B6] flex-shrink-0" />
                <div className="flex-1">
                  <Label htmlFor="target-branch" className="text-sm font-medium text-[#003366]">
                    Assign to Branch
                  </Label>
                  <p className="text-xs text-[#004B8D]/60">
                    All imported items will be assigned to this location
                  </p>
                </div>
                <Select value={targetBranchId} onValueChange={setTargetBranchId}>
                  <SelectTrigger className="w-[200px] bg-white">
                    <SelectValue placeholder="Select branch..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg z-50">
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Don't assign</span>
                    </SelectItem>
                    <SelectItem value="central">
                      <span>Central Stock (No Branch)</span>
                    </SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.is_headquarters && "🏢 "}
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview Table */}
            <div className="border border-[#004B8D]/10 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#004B8D]/5 hover:bg-[#004B8D]/5">
                    <TableHead className="text-[#004B8D]/70 w-12">#</TableHead>
                    <TableHead className="text-[#004B8D]/70">SKU</TableHead>
                    <TableHead className="text-[#004B8D]/70">Name</TableHead>
                    <TableHead className="text-[#004B8D]/70 text-right">Stock</TableHead>
                    <TableHead className="text-[#004B8D]/70 text-right">Price</TableHead>
                    <TableHead className="text-[#004B8D]/70 text-right">Reorder</TableHead>
                    <TableHead className="text-[#004B8D]/70">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, idx) => (
                    <TableRow
                      key={idx}
                      className={row.isValid ? "hover:bg-[#004B8D]/5" : "bg-red-50 hover:bg-red-50"}
                    >
                      <TableCell className="text-[#004B8D]/50 text-sm">{row.rowNumber}</TableCell>
                      <TableCell className="font-mono text-sm">{row.sku || "-"}</TableCell>
                      <TableCell>{row.name || "-"}</TableCell>
                      <TableCell className="text-right">{row.current_stock}</TableCell>
                      <TableCell className="text-right">K {row.unit_price?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.reorder_level}</TableCell>
                      <TableCell>
                        {row.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-red-600 text-xs">{row.errors.join(", ")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Import Progress with Processing Log */}
            {isImporting && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#004B8D]/60">Importing...</span>
                  <span className="text-[#003366] font-medium">{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
                
                <div className="text-sm text-[#004B8D]/70">
                  Processing item {currentItemIndex} of {parsedData.filter(r => r.isValid).length}...
                </div>
                
                {/* Processing Log */}
                <ScrollArea className="h-[150px] border border-[#004B8D]/10 rounded-lg bg-white">
                  <div className="p-2 space-y-1">
                    {processingLog.map((item, idx) => (
                      <div 
                        key={`${item.sku}-${idx}`}
                        className={`flex items-center gap-2 p-2 rounded text-sm ${
                          item.status === 'error' 
                            ? 'bg-red-50' 
                            : item.status === 'success' 
                              ? 'bg-green-50' 
                              : 'bg-blue-50'
                        }`}
                      >
                        {item.status === 'processing' && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" />
                        )}
                        {item.status === 'success' && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                        {item.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                        <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                        <span className="truncate flex-1">{item.name}</span>
                        {item.status === 'success' && (
                          <Badge variant="outline" className="text-xs">
                            {item.action === 'added' ? 'Added' : 'Updated'}
                          </Badge>
                        )}
                        {item.status === 'processing' && (
                          <span className="text-xs text-blue-600">Processing</span>
                        )}
                        {item.status === 'error' && (
                          <span className="text-xs text-red-600 truncate max-w-[100px]" title={item.error}>
                            {item.error}
                          </span>
                        )}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Results */}
            {importResults && !isImporting && (
              <div className="space-y-3">
                <div className="p-4 bg-[#004B8D]/5 rounded-lg">
                  <p className="text-[#003366] font-medium mb-2">Import Complete</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">{importResults.added} added</span>
                    <span className="text-blue-600">{importResults.updated} updated</span>
                    {importResults.failed > 0 && (
                      <span className="text-red-600">{importResults.failed} failed</span>
                    )}
                  </div>
                </div>
                
                {/* Final Processing Log (collapsed if successful, expanded if errors) */}
                {processingLog.length > 0 && importResults.failed > 0 && (
                  <ScrollArea className="h-[120px] border border-red-200 rounded-lg bg-red-50/50">
                    <div className="p-2 space-y-1">
                      {processingLog.filter(item => item.status === 'error').map((item, idx) => (
                        <div 
                          key={`${item.sku}-${idx}`}
                          className="flex items-center gap-2 p-2 rounded text-sm bg-red-50"
                        >
                          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                          <span className="truncate flex-1">{item.name}</span>
                          <span className="text-xs text-red-600 truncate max-w-[150px]" title={item.error}>
                            {item.error}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { onOpenChange(false); resetState(); }}
                className="border-[#004B8D]/20 text-[#004B8D]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || validCount === 0}
                className="bg-[#004B8D] hover:bg-[#003366] text-white"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {validCount} Items
                  </>
                )}
              </Button>
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>

      <ImportConverterModal
        open={isConverterOpen}
        onOpenChange={setIsConverterOpen}
        targetSchema="inventory"
        onDataReady={handleConvertedData}
        schemaFields={inventorySchemaFields}
      />
    </>
  );
}
