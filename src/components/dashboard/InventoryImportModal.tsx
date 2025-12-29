import { useState, useCallback } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";

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
  reorder_level: number;
  liters_per_unit: number;
  isValid: boolean;
  errors: string[];
  rowNumber: number;
}

export function InventoryImportModal({ open, onOpenChange, onSuccess }: InventoryImportModalProps) {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ added: number; updated: number; failed: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const { tenantId } = useTenant();

  const resetState = () => {
    setParsedData([]);
    setImportProgress(0);
    setImportResults(null);
  };

  const validateRows = (rawRows: any[]): ParsedRow[] => {
    return rawRows.map((rawRow, idx) => {
      const row: any = { rowNumber: idx + 2, errors: [] };
      
      // Normalize header keys to lowercase
      const normalizedRow: any = {};
      Object.keys(rawRow).forEach(key => {
        normalizedRow[key.toLowerCase().trim()] = rawRow[key];
      });

      row.sku = String(normalizedRow.sku || "").trim();
      row.name = String(normalizedRow.name || "").trim();
      row.current_stock = parseInt(normalizedRow.current_stock) || 0;
      row.unit_price = parseFloat(normalizedRow.unit_price) || 0;
      row.reorder_level = parseInt(normalizedRow.reorder_level) || 10;
      row.liters_per_unit = parseInt(normalizedRow.liters_per_unit) || 0;

      // Validation
      if (!row.sku) row.errors.push("SKU is required");
      if (!row.name) row.errors.push("Name is required");
      if (row.unit_price < 0) row.errors.push("Price cannot be negative");
      if (row.current_stock < 0) row.errors.push("Stock cannot be negative");

      row.isValid = row.errors.length === 0;
      return row as ParsedRow;
    });
  };

  const parseCSV = (content: string): ParsedRow[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    const rawRows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const rawRow: any = {};
      headers.forEach((header, idx) => {
        rawRow[header] = values[idx] || "";
      });
      rawRows.push(rawRow);
    }

    return validateRows(rawRows);
  };

  const parseExcel = (data: ArrayBuffer): ParsedRow[] => {
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows: any[] = XLSX.utils.sheet_to_json(firstSheet);
    return validateRows(rawRows);
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
        let parsed: ParsedRow[];
        if (isCSV) {
          parsed = parseCSV(e.target?.result as string);
        } else {
          parsed = parseExcel(e.target?.result as ArrayBuffer);
        }
        setParsedData(parsed);
        setImportResults(null);
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

    let added = 0;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        // Check if SKU exists for this tenant
        const { data: existing } = await supabase
          .from("inventory")
          .select("id")
          .eq("sku", row.sku)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (existing) {
          // Update
          const { error } = await supabase
            .from("inventory")
            .update({
              name: row.name,
              current_stock: row.current_stock,
              unit_price: row.unit_price,
              reorder_level: row.reorder_level,
              liters_per_unit: row.liters_per_unit,
            })
            .eq("id", existing.id);

          if (error) throw error;
          updated++;
        } else {
          // Insert
          const { error } = await supabase
            .from("inventory")
            .insert({
              tenant_id: tenantId,
              sku: row.sku,
              name: row.name,
              current_stock: row.current_stock,
              unit_price: row.unit_price,
              reorder_level: row.reorder_level,
              liters_per_unit: row.liters_per_unit,
            });

          if (error) throw error;
          added++;
        }
      } catch (error) {
        console.error("Import error for row:", row, error);
        failed++;
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setIsImporting(false);
    setImportResults({ added, updated, failed });

    toast({
      title: "Import Complete",
      description: `${added} added, ${updated} updated, ${failed} failed`,
    });

    if (added > 0 || updated > 0) {
      onSuccess();
    }
  };

  const downloadTemplate = () => {
    const template = `sku,name,current_stock,unit_price,reorder_level,liters_per_unit
LS-PERSONAL-001,LifeStraw Personal,50,450,10,4000
LS-GO-650,LifeStraw Go 650ml,30,650,10,4000
LS-COMMUNITY,LifeStraw Community,5,8500,2,100000`;

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
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white border-[#004B8D]/20">
        <DialogHeader>
          <DialogTitle className="text-[#003366] flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[#0077B6]" />
            Import Inventory
          </DialogTitle>
          <DialogDescription className="text-[#004B8D]/60">
            Upload a CSV or Excel (.xlsx) file to bulk import or update inventory items
          </DialogDescription>
        </DialogHeader>

        {parsedData.length === 0 ? (
          <div className="space-y-4">
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
              <p className="text-[#004B8D]/60 text-sm mb-1">Supports CSV and Excel (.xlsx) files</p>
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

            {/* Template Download */}
            <div className="flex items-center justify-between p-4 bg-[#004B8D]/5 rounded-lg">
              <div>
                <p className="text-[#003366] font-medium text-sm">Need a template?</p>
                <p className="text-[#004B8D]/60 text-xs">
                  Download a sample CSV with the correct format
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-[#0077B6]">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>
        ) : (
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

            {/* Import Progress */}
            {isImporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#004B8D]/60">Importing...</span>
                  <span className="text-[#003366] font-medium">{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}

            {/* Results */}
            {importResults && (
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
  );
}
