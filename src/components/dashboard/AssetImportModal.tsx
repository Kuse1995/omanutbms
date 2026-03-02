import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Download, Loader2, Check, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CSVColumnMapper, type SchemaField } from "./CSVColumnMapper";
import * as XLSX from "xlsx";

interface AssetImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
}

const VALID_CATEGORIES = ["IT", "Vehicles", "Machinery", "Furniture", "Buildings", "Other"];
const VALID_DEPRECIATION = ["straight_line", "reducing_balance"];

const ASSET_SCHEMA_FIELDS: SchemaField[] = [
  { key: "name", label: "Asset Name", required: true, type: "string" },
  { key: "category", label: "Category", required: false, type: "string", aliases: ["type", "class", "group"] },
  { key: "serial_number", label: "Serial Number", required: false, type: "string", aliases: ["serial", "sn", "barcode"] },
  { key: "purchase_date", label: "Purchase Date", required: true, type: "string", aliases: ["date", "acquired", "acquisition_date"] },
  { key: "purchase_cost", label: "Purchase Cost", required: true, type: "number", aliases: ["cost", "price", "value", "amount"] },
  { key: "salvage_value", label: "Salvage Value", required: false, type: "number", aliases: ["residual", "scrap_value"] },
  { key: "useful_life_years", label: "Useful Life (Years)", required: false, type: "number", aliases: ["life", "years", "lifespan"] },
  { key: "depreciation_method", label: "Depreciation Method", required: false, type: "string", aliases: ["method", "dep_method"] },
  { key: "location", label: "Location", required: false, type: "string", aliases: ["place", "site", "branch"] },
  { key: "assigned_to", label: "Assigned To", required: false, type: "string", aliases: ["owner", "user", "department", "dept"] },
  { key: "description", label: "Description", required: false, type: "string", aliases: ["notes", "remarks", "details"] },
];

type Step = "upload" | "map" | "preview" | "importing";

interface ParsedRow {
  data: Record<string, any>;
  errors: string[];
  isValid: boolean;
}

function normalizeCategory(val: string): string {
  const lower = val.toLowerCase().trim();
  for (const cat of VALID_CATEGORIES) {
    if (cat.toLowerCase() === lower || lower.includes(cat.toLowerCase())) return cat;
  }
  return "Other";
}

function parseDate(val: string): string | null {
  if (!val) return null;
  // Try multiple date formats
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  // Try DD/MM/YYYY
  const parts = val.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (Number(a) > 31) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`; // YYYY-MM-DD
    if (Number(c) > 31) return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`; // DD/MM/YYYY
  }
  return null;
}

function validateRow(row: Record<string, any>): ParsedRow {
  const errors: string[] = [];

  if (!row.name || String(row.name).trim() === "") errors.push("Name is required");

  const purchaseDate = parseDate(String(row.purchase_date || ""));
  if (!purchaseDate) {
    errors.push("Valid purchase date is required");
  } else if (new Date(purchaseDate) > new Date()) {
    errors.push("Purchase date cannot be in the future");
  }

  const cost = parseFloat(String(row.purchase_cost || "0").replace(/[^0-9.-]/g, ""));
  if (isNaN(cost) || cost <= 0) errors.push("Purchase cost must be > 0");

  const salvage = parseFloat(String(row.salvage_value || "0").replace(/[^0-9.-]/g, ""));
  if (salvage < 0) errors.push("Salvage value must be ≥ 0");
  if (salvage >= cost && cost > 0) errors.push("Salvage value must be < purchase cost");

  const life = parseInt(String(row.useful_life_years || "5"));
  if (life < 1 || life > 100) errors.push("Useful life must be 1–100 years");

  const category = normalizeCategory(String(row.category || "Other"));
  const depMethod = VALID_DEPRECIATION.includes(String(row.depreciation_method || "").toLowerCase())
    ? String(row.depreciation_method).toLowerCase()
    : "straight_line";

  return {
    data: {
      name: String(row.name || "").trim(),
      category,
      serial_number: String(row.serial_number || "").trim() || null,
      purchase_date: purchaseDate || "",
      purchase_cost: isNaN(cost) ? 0 : cost,
      salvage_value: isNaN(salvage) ? 0 : salvage,
      useful_life_years: isNaN(life) || life < 1 ? 5 : life,
      depreciation_method: depMethod,
      location: String(row.location || "").trim() || null,
      assigned_to: String(row.assigned_to || "").trim() || null,
      description: String(row.description || "").trim() || null,
      status: "active",
    },
    errors,
    isValid: errors.length === 0,
  };
}

export function AssetImportModal({ open, onOpenChange, tenantId }: AssetImportModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("upload");
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const reset = () => {
    setStep("upload");
    setRawData([]);
    setSourceColumns([]);
    setParsedRows([]);
    setImportProgress({ done: 0, total: 0, failed: 0 });
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

        if (json.length === 0) {
          toast({ title: "Empty file", description: "The uploaded file has no data rows.", variant: "destructive" });
          return;
        }

        const cols = Object.keys(json[0]);
        setRawData(json);
        setSourceColumns(cols);

        // Check if columns match schema well enough to skip mapper
        const schemaKeys = ASSET_SCHEMA_FIELDS.map(f => f.key);
        const normalizedCols = cols.map(c => c.toLowerCase().trim().replace(/[^a-z0-9]/g, "_"));
        const directMatches = schemaKeys.filter(k => normalizedCols.includes(k));

        if (directMatches.length >= 3 && directMatches.includes("name")) {
          // Good enough match, go straight to preview
          const mapped = json.map(row => {
            const mapped: Record<string, any> = {};
            cols.forEach(col => {
              const norm = col.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
              const field = ASSET_SCHEMA_FIELDS.find(f => f.key === norm);
              if (field) mapped[field.key] = row[col];
            });
            return mapped;
          });
          const validated = mapped.map(validateRow);
          setParsedRows(validated);
          setStep("preview");
        } else {
          setStep("map");
        }
      } catch {
        toast({ title: "Error reading file", description: "Could not parse the uploaded file.", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  }, [toast]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleMappingComplete = (_mappings: Record<string, string>, transformedData: Record<string, any>[]) => {
    const validated = transformedData.map(validateRow);
    setParsedRows(validated);
    setStep("preview");
  };

  const downloadTemplate = () => {
    const csv = `name,category,serial_number,purchase_date,purchase_cost,salvage_value,useful_life_years,depreciation_method,location,assigned_to,description
Dell Laptop,IT,SN-12345,2024-01-15,15000,1000,5,straight_line,Head Office,Finance Dept,Staff laptop
Toyota Hilux,Vehicles,VIN-67890,2023-06-01,450000,50000,10,reducing_balance,Lusaka,Operations,Delivery vehicle
Office Desk,Furniture,,2024-03-01,2500,200,7,straight_line,Main Office,Reception,`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asset-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!tenantId) return;
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast({ title: "No valid rows", description: "Fix the errors before importing.", variant: "destructive" });
      return;
    }

    setStep("importing");
    setImportProgress({ done: 0, total: validRows.length, failed: 0 });
    let failed = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE).map(r => ({
        ...r.data,
        tenant_id: tenantId,
      }));

      const { error } = await supabase.from("assets").insert(batch);
      if (error) {
        failed += batch.length;
      }
      setImportProgress({ done: Math.min(i + BATCH_SIZE, validRows.length), total: validRows.length, failed });
    }

    queryClient.invalidateQueries({ queryKey: ["assets", tenantId] });
    const successCount = validRows.length - failed;
    toast({
      title: `Import complete`,
      description: `${successCount} assets imported successfully${failed > 0 ? `, ${failed} failed` : ""}.`,
      variant: failed > 0 ? "destructive" : "default",
    });
    handleClose(false);
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Assets from CSV/Excel
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById("asset-file-input")?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-lg font-medium text-foreground">Drop your file here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">Supports CSV and Excel (.xlsx, .xls) files</p>
                <input
                  id="asset-file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === "map" && (
            <CSVColumnMapper
              sourceColumns={sourceColumns}
              schemaFields={ASSET_SCHEMA_FIELDS}
              rawData={rawData.slice(0, 5)}
              onMappingComplete={handleMappingComplete}
              onCancel={() => setStep("upload")}
            />
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="border-green-500 text-green-600">
                  <Check className="h-3 w-3 mr-1" /> {validCount} valid
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="outline" className="border-destructive text-destructive">
                    <X className="h-3 w-3 mr-1" /> {errorCount} errors
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground ml-auto">{parsedRows.length} total rows</span>
              </div>

              <ScrollArea className="h-[350px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, i) => (
                      <TableRow key={i} className={!row.isValid ? "bg-destructive/5" : ""}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="font-medium">{row.data.name || "-"}</TableCell>
                        <TableCell>{row.data.category}</TableCell>
                        <TableCell>{row.data.purchase_date || "-"}</TableCell>
                        <TableCell className="text-right">
                          {row.data.purchase_cost > 0 ? `K ${row.data.purchase_cost.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                              <Check className="h-3 w-3 mr-1" /> Valid
                            </Badge>
                          ) : (
                            <div className="flex items-start gap-1">
                              <AlertCircle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-destructive">{row.errors.join("; ")}</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
                <Button onClick={handleImport} disabled={validCount === 0}>
                  <Check className="h-4 w-4 mr-2" />
                  Import {validCount} Asset{validCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === "importing" && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
              <p className="text-lg font-medium">Importing assets...</p>
              <p className="text-sm text-muted-foreground">
                {importProgress.done} / {importProgress.total} processed
                {importProgress.failed > 0 && ` (${importProgress.failed} failed)`}
              </p>
              <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
