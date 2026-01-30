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
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, Loader2, Wand2, Users, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { ImportConverterModal } from "./ImportConverterModal";
import { CSVColumnMapper, SchemaField } from "./CSVColumnMapper";

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

type ImportStep = "upload" | "mapping" | "preview";

const employeeSchemaFields: SchemaField[] = [
  { key: 'full_name', label: 'Full Name', required: true, type: 'string', aliases: ['name', 'employee_name', 'staff_name'] },
  { key: 'employee_type', label: 'Employee Type', required: true, type: 'string', aliases: ['type', 'employment_type', 'status'] },
  { key: 'department', label: 'Department', required: false, type: 'string', aliases: ['dept', 'division', 'section'] },
  { key: 'job_title', label: 'Job Title', required: false, type: 'string', aliases: ['title', 'position', 'role'] },
  { key: 'phone', label: 'Phone', required: false, type: 'string', aliases: ['telephone', 'mobile', 'cell', 'contact'] },
  { key: 'email', label: 'Email', required: false, type: 'string', aliases: ['e-mail', 'email_address'] },
  { key: 'base_salary_zmw', label: 'Base Salary (ZMW)', required: false, type: 'number', aliases: ['salary', 'pay', 'wage'] },
];

const validEmployeeTypes = ['driver', 'cleaner', 'security', 'office_staff', 'part_time', 'temporary', 'contract'];

function needsColumnMapping(columns: string[]): boolean {
  const normalizedColumns = columns.map(c => c.toLowerCase().trim().replace(/\s+/g, '_'));
  const requiredFields = employeeSchemaFields.filter(f => f.required).map(f => f.key);
  
  return !requiredFields.every(field => {
    const fieldDef = employeeSchemaFields.find(f => f.key === field);
    const allNames = [field, ...(fieldDef?.aliases || [])];
    return normalizedColumns.some(col => allNames.includes(col));
  });
}

export function EmployeeImportModal({ open, onOpenChange, onSuccess }: EmployeeImportModalProps) {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ added: number; failed: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("spreadsheet");
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [rawFileData, setRawFileData] = useState<Record<string, any>[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const { toast } = useToast();
  const { tenantId } = useTenant();

  const resetState = () => {
    setParsedData([]);
    setImportProgress(0);
    setImportResults(null);
    setImportStep("upload");
    setRawFileData([]);
    setSourceColumns([]);
  };

  const convertToParsedRows = (data: any[]): ParsedRow[] => {
    return data.map((row, idx) => {
      const parsed: ParsedRow = {
        full_name: String(row.full_name || "").trim(),
        employee_type: String(row.employee_type || "office_staff").toLowerCase().trim(),
        department: String(row.department || "").trim(),
        job_title: String(row.job_title || "").trim(),
        phone: String(row.phone || "").trim(),
        email: String(row.email || "").trim(),
        base_salary_zmw: parseFloat(row.base_salary_zmw) || 0,
        isValid: true,
        errors: [],
        rowNumber: idx + 1,
      };

      const errors: string[] = [];
      if (!parsed.full_name) errors.push("Name is required");
      if (!validEmployeeTypes.includes(parsed.employee_type)) errors.push(`Invalid type`);

      return { ...parsed, isValid: errors.length === 0, errors };
    });
  };

  const handleConvertedData = (data: any[]) => {
    const validated = convertToParsedRows(data);
    setParsedData(validated);
    setImportStep("preview");
    toast({ title: "Data Ready", description: `${validated.filter(r => r.isValid).length} employees ready` });
  };

  const handleMappingComplete = (mappings: Record<string, string>, transformedData: Record<string, any>[]) => {
    const validated = convertToParsedRows(transformedData);
    setParsedData(validated);
    setImportStep("preview");
  };

  const handleFile = (file: File) => {
    const isCSV = file.name.endsWith(".csv");
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (!isCSV && !isExcel) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let columns: string[], rows: Record<string, any>[];
        
        if (isCSV) {
          const content = e.target?.result as string;
          const lines = content.split(/\r?\n/).filter(l => l.trim());
          columns = lines[0].split(",").map(h => h.trim());
          rows = lines.slice(1).map(line => {
            const values = line.split(",");
            const row: Record<string, any> = {};
            columns.forEach((col, i) => row[col] = values[i] || "");
            return row;
          });
        } else {
          const workbook = XLSX.read(e.target?.result as ArrayBuffer, { type: "array" });
          rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        }

        setRawFileData(rows);
        setSourceColumns(columns);

        if (needsColumnMapping(columns)) {
          setImportStep("mapping");
        } else {
          const validated = convertToParsedRows(rows.map(row => {
            const normalized: Record<string, any> = {};
            Object.entries(row).forEach(([key, value]) => {
              const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
              const field = employeeSchemaFields.find(f => f.key === normalizedKey || f.aliases?.includes(normalizedKey));
              if (field) normalized[field.key] = value;
            });
            return normalized;
          }));
          setParsedData(validated);
          setImportStep("preview");
        }
      } catch {
        toast({ title: "Parse Error", variant: "destructive" });
      }
    };
    isCSV ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleImport = async () => {
    const validRows = parsedData.filter(r => r.isValid);
    if (validRows.length === 0 || !tenantId) return;

    setIsImporting(true);
    let added = 0, failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      try {
        await supabase.from("employees").insert({
          tenant_id: tenantId,
          full_name: validRows[i].full_name,
          employee_type: validRows[i].employee_type,
          department: validRows[i].department || null,
          job_title: validRows[i].job_title || null,
          phone: validRows[i].phone || null,
          email: validRows[i].email || null,
          base_salary_zmw: validRows[i].base_salary_zmw,
        });
        added++;
      } catch { failed++; }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setIsImporting(false);
    setImportResults({ added, failed });
    if (added > 0) onSuccess();
  };

  const downloadTemplate = () => {
    const blob = new Blob([`full_name,employee_type,department,job_title,phone,email,base_salary_zmw\nJohn Doe,office_staff,Admin,Manager,+260977123456,john@example.com,8000`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "employees-template.csv";
    a.click();
  };

  const validCount = parsedData.filter(r => r.isValid).length;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Import Employees
            </DialogTitle>
            <DialogDescription>Bulk import employees — any CSV format supported</DialogDescription>
          </DialogHeader>

          {importStep === "upload" && (
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
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <Settings2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Smart Column Mapping</p>
                    <p className="text-xs text-muted-foreground">Upload any CSV format — the system will help you map columns</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4 mr-2" />Download Template</Button>
              </TabsContent>
              <TabsContent value="document">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Wand2 className="h-12 w-12 mx-auto mb-4 text-primary/60" />
                  <Button onClick={() => setIsConverterOpen(true)}><Wand2 className="h-4 w-4 mr-2" />Convert Document</Button>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {importStep === "mapping" && (
            <CSVColumnMapper
              sourceColumns={sourceColumns}
              schemaFields={employeeSchemaFields}
              rawData={rawFileData}
              onMappingComplete={handleMappingComplete}
              onCancel={() => setImportStep("upload")}
            />
          )}

          {importStep === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />{validCount} Valid</Badge>
                <Button variant="ghost" size="sm" onClick={resetState} className="ml-auto">Upload Different File</Button>
              </div>
              <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50">
                    <TableHead>#</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx} className={row.isValid ? "" : "bg-red-50"}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{row.full_name || "-"}</TableCell>
                        <TableCell>{row.employee_type}</TableCell>
                        <TableCell>{row.isValid ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {isImporting && <Progress value={importProgress} className="h-2" />}
              {importResults && <p className="text-sm">{importResults.added} added, {importResults.failed} failed</p>}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={isImporting || validCount === 0}>
                  {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Import {validCount} Employees
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
