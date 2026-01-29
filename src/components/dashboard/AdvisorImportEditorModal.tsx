import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CheckCircle2, XCircle, Trash2, Plus, Download, Edit2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImportSchema, ImportRow } from "./AdvisorImportCard";

interface SchemaField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number';
}

interface ParsedRow {
  [key: string]: string | number | boolean | null | undefined | string[];
  isValid?: boolean;
  errors?: string[];
  _rowId?: string;
}

interface AdvisorImportEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: ImportSchema;
  initialData: ImportRow[];
  initialColumns: string[];
  onImport: (rows: ImportRow[]) => Promise<void>;
}

const SCHEMA_FIELDS: Record<ImportSchema, SchemaField[]> = {
  inventory: [
    { key: "name", label: "Name", required: true, type: "string" },
    { key: "sku", label: "SKU", required: false, type: "string" },
    { key: "unit_price", label: "Unit Price", required: false, type: "number" },
    { key: "current_stock", label: "Stock", required: false, type: "number" },
    { key: "reorder_level", label: "Reorder Level", required: false, type: "number" },
    { key: "category", label: "Category", required: false, type: "string" },
    { key: "description", label: "Description", required: false, type: "string" },
  ],
  customers: [
    { key: "name", label: "Name", required: true, type: "string" },
    { key: "phone", label: "Phone", required: false, type: "string" },
    { key: "email", label: "Email", required: false, type: "string" },
    { key: "address", label: "Address", required: false, type: "string" },
    { key: "notes", label: "Notes", required: false, type: "string" },
  ],
  expenses: [
    { key: "category", label: "Category", required: false, type: "string" },
    { key: "amount_zmw", label: "Amount", required: true, type: "number" },
    { key: "vendor_name", label: "Vendor", required: false, type: "string" },
    { key: "date_incurred", label: "Date", required: false, type: "string" },
    { key: "notes", label: "Notes", required: false, type: "string" },
  ],
  employees: [
    { key: "full_name", label: "Full Name", required: true, type: "string" },
    { key: "email", label: "Email", required: false, type: "string" },
    { key: "phone", label: "Phone", required: false, type: "string" },
    { key: "job_title", label: "Job Title", required: false, type: "string" },
    { key: "department", label: "Department", required: false, type: "string" },
    { key: "basic_salary", label: "Salary", required: false, type: "number" },
  ],
};

const SCHEMA_LABELS: Record<ImportSchema, string> = {
  inventory: "Inventory",
  customers: "Customers",
  expenses: "Expenses",
  employees: "Employees",
};

export function AdvisorImportEditorModal({
  open,
  onOpenChange,
  schema,
  initialData,
  initialColumns,
  onImport,
}: AdvisorImportEditorModalProps) {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; key: string } | null>(null);

  const schemaFields = SCHEMA_FIELDS[schema] || SCHEMA_FIELDS.inventory;

  // Initialize rows with validation
  const [parsedData, setParsedData] = useState<ParsedRow[]>(() => 
    initialData.map(row => validateRow({ ...row, _rowId: crypto.randomUUID() }, schemaFields))
  );

  function validateRow(row: ParsedRow, fields: SchemaField[]): ParsedRow {
    const errors: string[] = [];
    
    fields.forEach(field => {
      if (field.required) {
        const value = row[field.key];
        if (value === undefined || value === null || value === '') {
          errors.push(`${field.label} is required`);
        }
      }
      if (field.type === 'number' && row[field.key] !== undefined && row[field.key] !== null && row[field.key] !== '') {
        const num = parseFloat(String(row[field.key]));
        if (isNaN(num)) {
          errors.push(`${field.label} must be a number`);
        }
      }
    });

    return {
      ...row,
      isValid: errors.length === 0,
      errors,
      _rowId: row._rowId || crypto.randomUUID(),
    };
  }

  const handleCellEdit = (rowId: string, key: string, value: any) => {
    setParsedData(prev => 
      prev.map(row => {
        if (row._rowId === rowId) {
          const updated = { ...row, [key]: value };
          return validateRow(updated, schemaFields);
        }
        return row;
      })
    );
    setEditingCell(null);
  };

  const handleDeleteRow = (rowId: string) => {
    setParsedData(prev => prev.filter(row => row._rowId !== rowId));
  };

  const handleAddRow = () => {
    const newRow: ParsedRow = { _rowId: crypto.randomUUID() };
    schemaFields.forEach(field => {
      newRow[field.key] = field.type === 'number' ? 0 : '';
    });
    setParsedData(prev => [...prev, validateRow(newRow, schemaFields)]);
  };

  const downloadAsCSV = () => {
    const headers = schemaFields.map(f => f.key).join(',');
    const rows = parsedData.map(row => 
      schemaFields.map(f => {
        const val = row[f.key];
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val}"`;
        }
        return val ?? '';
      }).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema}-import-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleProceedToImport = async () => {
    const validData = parsedData.filter(r => r.isValid);
    if (validData.length === 0) {
      toast({
        title: "No Valid Data",
        description: "Please fix validation errors before proceeding",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      // Clean up internal fields before importing
      const cleanData = validData.map(({ _rowId, isValid, errors, ...rest }) => rest as ImportRow);
      await onImport(cleanData);
      onOpenChange(false);
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-primary" />
            Edit {SCHEMA_LABELS[schema]} Before Import
          </DialogTitle>
          <DialogDescription>
            Review and edit the extracted data before importing it into your system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 flex-wrap">
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {validCount} Valid
            </Badge>
            {invalidCount > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                {invalidCount} Need Attention
              </Badge>
            )}
          </div>

          {/* Data Table */}
          <div className="border rounded-lg overflow-hidden max-h-[350px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {schemaFields.map(field => (
                    <TableHead key={field.key} className="text-xs">
                      {field.label}
                      {field.required && <span className="text-destructive">*</span>}
                    </TableHead>
                  ))}
                  <TableHead className="w-20">Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.map((row) => (
                  <TableRow
                    key={row._rowId}
                    className={row.isValid ? "" : "bg-red-50 dark:bg-red-950/20"}
                  >
                    {schemaFields.map(field => (
                      <TableCell key={field.key} className="p-1">
                        {editingCell?.rowId === row._rowId && editingCell?.key === field.key ? (
                          <Input
                            autoFocus
                            defaultValue={String(row[field.key] ?? '')}
                            onBlur={(e) => handleCellEdit(row._rowId!, field.key, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCellEdit(row._rowId!, field.key, e.currentTarget.value);
                              }
                              if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className="h-7 text-sm"
                          />
                        ) : (
                          <div
                            onClick={() => setEditingCell({ rowId: row._rowId!, key: field.key })}
                            className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded text-sm min-h-[28px] flex items-center"
                          >
                            {row[field.key] !== undefined && row[field.key] !== null && row[field.key] !== '' 
                              ? String(row[field.key]) 
                              : <span className="text-muted-foreground italic">-</span>
                            }
                          </div>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="p-1">
                      {row.isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="text-xs text-destructive" title={row.errors?.join(', ')}>
                          <XCircle className="h-4 w-4" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteRow(row._rowId!)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Add Row */}
          <Button variant="ghost" size="sm" onClick={handleAddRow}>
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>

          {/* Actions */}
          <div className="flex justify-between items-center gap-3 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={downloadAsCSV}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceedToImport}
                disabled={validCount === 0 || isImporting}
              >
                {isImporting ? "Importing..." : `Import ${validCount} Records`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
