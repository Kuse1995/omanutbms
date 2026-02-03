import { useState, useCallback, useRef, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, Wand2, Settings2, AlertCircle, Building2, Loader2, RefreshCw, SkipForward } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useBranch } from "@/hooks/useBranch";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { useUpload, ImportAnalysis } from "@/contexts/UploadContext";
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

type ImportStep = "upload" | "mapping" | "analysis" | "preview";

type ExistingItemMode = 'skip' | 'update';

const inventorySchemaFields: SchemaField[] = [
  { key: 'sku', label: 'SKU', required: false, type: 'string', aliases: ['product_code', 'item_code', 'code', 'barcode'] },
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("spreadsheet");
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [rawFileData, setRawFileData] = useState<Record<string, any>[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [targetBranchId, setTargetBranchId] = useState<string>("none");
  const [uploadStarted, setUploadStarted] = useState(false);
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis | null>(null);
  const [existingItemMode, setExistingItemMode] = useState<ExistingItemMode>('update');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { isMultiBranchEnabled, branches } = useBranch();
  const { terminology } = useBusinessConfig();
  const { startInventoryUpload, analyzeImport } = useUpload();

  const resetState = () => {
    setParsedData([]);
    setImportStep("upload");
    setRawFileData([]);
    setSourceColumns([]);
    setTargetBranchId("none");
    setUploadStarted(false);
    setImportAnalysis(null);
    setExistingItemMode('update');
    setIsAnalyzing(false);
  };

  const handleConvertedData = async (data: any[]) => {
    // Convert the AI-extracted data to our ParsedRow format
    const validated = convertToParsedRows(data);
    setParsedData(validated);
    setActiveTab("spreadsheet");
    
    // Trigger analysis
    if (tenantId) {
      setIsAnalyzing(true);
      setImportStep("analysis");
      try {
        const analysis = await analyzeImport(validated, tenantId);
        setImportAnalysis(analysis);
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      setImportStep("preview");
    }
    
    toast({
      title: "Data Ready for Import",
      description: `${validated.filter(r => r.isValid).length} items ready to import`,
    });
  };

  const handleMappingComplete = async (mappings: Record<string, string>, transformedData: Record<string, any>[]) => {
    const validated = convertToParsedRows(transformedData);
    setParsedData(validated);
    
    // Trigger analysis
    if (tenantId) {
      setIsAnalyzing(true);
      setImportStep("analysis");
      try {
        const analysis = await analyzeImport(validated, tenantId);
        setImportAnalysis(analysis);
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      setImportStep("preview");
    }
    
    toast({
      title: "Mapping Applied",
      description: `${validated.filter(r => r.isValid).length} items ready to import`,
    });
  };

  const proceedToPreview = () => {
    setImportStep("preview");
  };

  const convertToParsedRows = (data: any[]): ParsedRow[] => {
    return data.map((row, idx) => {
      const parsed: ParsedRow = {
        sku: String(row.sku || "").trim(),
        name: String(row.name || "").trim(),
        current_stock: parseFloat(row.current_stock) || 0,
        unit_price: parseFloat(row.unit_price) || 0,
        cost_price: parseFloat(row.cost_price) || 0,
        reorder_level: parseFloat(row.reorder_level) || 10,
        liters_per_unit: parseFloat(row.liters_per_unit) || 0,
        description: String(row.description || "").trim(),
        category: String(row.category || "").trim(),
        isValid: true,
        errors: [],
        rowNumber: idx + 1,
      };
      
      // Validate - SKU is optional (will be auto-generated if missing)
      const errors: string[] = [];
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

      // Validation - SKU is optional (will be auto-generated if missing)
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
    reader.onload = async (e) => {
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
          
          // Trigger analysis
          if (tenantId) {
            setIsAnalyzing(true);
            setImportStep("analysis");
            try {
              const analysis = await analyzeImport(validated, tenantId);
              setImportAnalysis(analysis);
            } catch (error) {
              console.error('Analysis failed:', error);
            } finally {
              setIsAnalyzing(false);
            }
          } else {
            setImportStep("preview");
          }
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

    // Start background upload with batch processing
    setUploadStarted(true);
    
    toast({
      title: "Import Started",
      description: `${validRows.length} items are being imported in the background. You can navigate away safely.`,
    });

    // Delegate to background upload context with skipExisting option
    await startInventoryUpload(
      `${validRows.length} inventory items`,
      validRows,
      {
        tenantId,
        targetBranchId: targetBranchId !== "none" ? targetBranchId : undefined,
        onSuccess,
        skipExisting: existingItemMode === 'skip',
      }
    );

    // Close modal - upload continues in background
    onOpenChange(false);
    resetState();
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

          {/* Step 3: Import Analysis */}
          {importStep === "analysis" && (
            <div className="space-y-4">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-[#0077B6] mb-4" />
                  <p className="text-[#003366] font-medium">Analyzing your import...</p>
                  <p className="text-[#004B8D]/60 text-sm mt-1">
                    Checking for duplicates in your {terminology.inventory.toLowerCase()}
                  </p>
                </div>
              ) : importAnalysis ? (
                <>
                  <div className="bg-[#0077B6]/5 border border-[#0077B6]/20 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-[#003366] flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-[#0077B6]" />
                      Import Analysis
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-[#004B8D]/70">Total items in file:</span>
                      <span className="font-medium text-[#003366]">{importAnalysis.total.toLocaleString()}</span>
                      
                      <span className="text-[#004B8D]/70">New items (will be added):</span>
                      <span className="font-medium text-green-700">{importAnalysis.newItems.toLocaleString()}</span>
                      
                      <span className="text-[#004B8D]/70">Existing items (by SKU):</span>
                      <span className="font-medium text-amber-700">{importAnalysis.existingItems.toLocaleString()}</span>
                      
                      <span className="text-[#004B8D]/70">Without SKU (auto-generate):</span>
                      <span className="font-medium text-blue-700">{importAnalysis.autoGenerate.toLocaleString()}</span>
                    </div>
                  </div>

                  {importAnalysis.existingItems > 0 && (
                    <div className="border border-[#004B8D]/20 rounded-lg p-4 space-y-3">
                      <Label className="text-sm font-medium text-[#003366]">
                        How should we handle existing items?
                      </Label>
                      <RadioGroup 
                        value={existingItemMode} 
                        onValueChange={(v) => setExistingItemMode(v as ExistingItemMode)}
                        className="space-y-3"
                      >
                        <div className="flex items-start space-x-3 p-3 rounded-lg border border-[#004B8D]/10 hover:bg-[#004B8D]/5 transition-colors">
                          <RadioGroupItem value="skip" id="skip" className="mt-0.5" />
                          <div className="flex-1">
                            <Label htmlFor="skip" className="font-medium text-[#003366] flex items-center gap-2 cursor-pointer">
                              <SkipForward className="h-4 w-4 text-blue-600" />
                              Skip existing (faster)
                            </Label>
                            <p className="text-xs text-[#004B8D]/60 mt-1">
                              Only add new items. {importAnalysis.existingItems} existing items will be ignored.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 rounded-lg border border-[#004B8D]/10 hover:bg-[#004B8D]/5 transition-colors">
                          <RadioGroupItem value="update" id="update" className="mt-0.5" />
                          <div className="flex-1">
                            <Label htmlFor="update" className="font-medium text-[#003366] flex items-center gap-2 cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-amber-600" />
                              Update existing (merge data)
                            </Label>
                            <p className="text-xs text-[#004B8D]/60 mt-1">
                              Update {importAnalysis.existingItems} existing items with new data from the file.
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={resetState}
                      className="border-[#004B8D]/20 text-[#004B8D]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={proceedToPreview}
                      className="bg-[#004B8D] hover:bg-[#003366] text-white"
                    >
                      Continue to Preview
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Step 4: Preview & Import */}
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

            {/* Auto-SKU Info Banner */}
            {parsedData.some(r => r.isValid && !r.sku) && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-800 font-medium text-sm">SKU will be auto-generated</p>
                  <p className="text-amber-700 text-xs">
                    {parsedData.filter(r => r.isValid && !r.sku).length} item(s) without SKU will receive an auto-generated code (e.g., AUTO-1234567-A7X9)
                  </p>
                </div>
              </div>
            )}

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
                      <TableCell className="font-mono text-sm">
                        {row.sku || (
                          <span className="text-amber-600 italic">(Auto)</span>
                        )}
                      </TableCell>
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
                disabled={uploadStarted || validCount === 0}
                className="bg-[#004B8D] hover:bg-[#003366] text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import {validCount} Items
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
