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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, Loader2, Wand2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { ImportConverterModal } from "./ImportConverterModal";

interface EmployeeImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  full_name: string;
  employee_type: string;
  department: string;
  job_title: string;
  phone: string;
  email: string;
  base_salary_zmw: number;
  isValid: boolean;
  errors: string[];
  rowNumber: number;
}

const employeeSchemaFields = [
  { key: 'full_name', label: 'Full Name', required: true, type: 'string' as const },
  { key: 'employee_type', label: 'Employee Type', required: true, type: 'string' as const },
  { key: 'department', label: 'Department', required: false, type: 'string' as const },
  { key: 'job_title', label: 'Job Title', required: false, type: 'string' as const },
  { key: 'phone', label: 'Phone', required: false, type: 'string' as const },
  { key: 'email', label: 'Email', required: false, type: 'string' as const },
  { key: 'base_salary_zmw', label: 'Base Salary (ZMW)', required: false, type: 'number' as const },
];

const validEmployeeTypes = ['driver', 'cleaner', 'security', 'office_staff', 'part_time', 'temporary', 'contract'];

export function EmployeeImportModal({ open, onOpenChange, onSuccess }: EmployeeImportModalProps) {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ added: number; failed: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("spreadsheet");
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
      
      const normalizedRow: any = {};
      Object.keys(rawRow).forEach(key => {
        normalizedRow[key.toLowerCase().trim().replace(/\s+/g, '_')] = rawRow[key];
      });

      row.full_name = String(normalizedRow.full_name || normalizedRow.name || "").trim();
      row.employee_type = String(normalizedRow.employee_type || normalizedRow.type || "office_staff").toLowerCase().trim();
      row.department = String(normalizedRow.department || "").trim();
      row.job_title = String(normalizedRow.job_title || normalizedRow.title || "").trim();
      row.phone = String(normalizedRow.phone || "").trim();
      row.email = String(normalizedRow.email || "").trim();
      row.base_salary_zmw = parseFloat(normalizedRow.base_salary_zmw || normalizedRow.salary || 0) || 0;

      if (!row.full_name) row.errors.push("Name is required");
      if (!validEmployeeTypes.includes(row.employee_type)) {
        row.errors.push(`Invalid type: ${row.employee_type}`);
      }

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
      toast({ title: "Invalid File", description: "Please upload a CSV or Excel file", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = isCSV ? parseCSV(e.target?.result as string) : parseExcel(e.target?.result as ArrayBuffer);
        setParsedData(parsed);
        setImportResults(null);
      } catch {
        toast({ title: "Parse Error", description: "Failed to parse the file", variant: "destructive" });
      }
    };
    isCSV ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleConvertedData = (data: any[]) => {
    const validated = validateRows(data);
    setParsedData(validated);
    setActiveTab("spreadsheet");
    toast({ title: "Data Ready", description: `${validated.filter(r => r.isValid).length} employees ready to import` });
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(r => r.isValid);
    if (validRows.length === 0 || !tenantId) return;

    setIsImporting(true);
    let added = 0, failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const { error } = await supabase.from("employees").insert({
          tenant_id: tenantId,
          full_name: row.full_name,
          employee_type: row.employee_type,
          department: row.department || null,
          job_title: row.job_title || null,
          phone: row.phone || null,
          email: row.email || null,
          base_salary_zmw: row.base_salary_zmw,
        });
        if (error) throw error;
        added++;
      } catch {
        failed++;
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setIsImporting(false);
    setImportResults({ added, failed });
    toast({ title: "Import Complete", description: `${added} added, ${failed} failed` });
    if (added > 0) onSuccess();
  };

  const downloadTemplate = () => {
    const template = `full_name,employee_type,department,job_title,phone,email,base_salary_zmw
John Doe,office_staff,Admin,Manager,+260977123456,john@example.com,8000
Jane Smith,driver,Operations,Driver,+260966789012,,5000`;
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees-template.csv";
    a.click();
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.filter(r => !r.isValid).length;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Import Employees
            </DialogTitle>
            <DialogDescription>Bulk import employees from CSV/Excel or convert from documents</DialogDescription>
          </DialogHeader>

          {parsedData.length === 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="spreadsheet"><FileSpreadsheet className="h-4 w-4 mr-2" />CSV / Excel</TabsTrigger>
                <TabsTrigger value="document"><Wand2 className="h-4 w-4 mr-2" />Convert Document</TabsTrigger>
              </TabsList>
              <TabsContent value="spreadsheet" className="space-y-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"}`}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                  <p className="font-medium mb-2">Drag & drop your file here</p>
                  <label>
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
                    <Button variant="outline" asChild><span className="cursor-pointer">Browse Files</span></Button>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div><p className="font-medium text-sm">Need a template?</p></div>
                  <Button variant="ghost" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4 mr-2" />Download</Button>
                </div>
              </TabsContent>
              <TabsContent value="document" className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Wand2 className="h-12 w-12 mx-auto mb-4 text-primary/60" />
                  <p className="font-medium mb-2">AI-Powered Document Conversion</p>
                  <p className="text-sm text-muted-foreground mb-4">Upload employee lists, staff rosters, or HR documents</p>
                  <Button onClick={() => setIsConverterOpen(true)}><Wand2 className="h-4 w-4 mr-2" />Convert Document</Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />{validCount} Valid</Badge>
                {invalidCount > 0 && <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />{invalidCount} Invalid</Badge>}
                <Button variant="ghost" size="sm" onClick={resetState} className="ml-auto">Upload Different File</Button>
              </div>
              <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50">
                    <TableHead>#</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead>
                    <TableHead>Department</TableHead><TableHead>Title</TableHead><TableHead>Salary</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {parsedData.map((row, idx) => (
                      <TableRow key={idx} className={row.isValid ? "" : "bg-red-50"}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{row.full_name || "-"}</TableCell>
                        <TableCell>{row.employee_type}</TableCell>
                        <TableCell>{row.department || "-"}</TableCell>
                        <TableCell>{row.job_title || "-"}</TableCell>
                        <TableCell>K {row.base_salary_zmw.toLocaleString()}</TableCell>
                        <TableCell>{row.isValid ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <span className="text-red-600 text-xs">{row.errors.join(", ")}</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {isImporting && <Progress value={importProgress} className="h-2" />}
              {importResults && <div className="p-4 bg-muted/50 rounded-lg"><p className="font-medium">Import Complete</p><p className="text-sm">{importResults.added} added, {importResults.failed} failed</p></div>}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={isImporting || validCount === 0}>
                  {isImporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</> : <>Import {validCount} Employees</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ImportConverterModal open={isConverterOpen} onOpenChange={setIsConverterOpen} targetSchema="employees" onDataReady={handleConvertedData} schemaFields={employeeSchemaFields} />
    </>
  );
}
