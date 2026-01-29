import { useState } from "react";
import { FileSpreadsheet, Check, Pencil, X, Loader2, AlertCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";

export type ImportSchema = "inventory" | "employees" | "customers" | "expenses";

export interface ImportRow {
  [key: string]: string | number | boolean | null;
}

export interface ImportPreviewData {
  schema: ImportSchema;
  fileName: string;
  rows: ImportRow[];
  columns: string[];
  validCount: number;
  invalidCount: number;
  validationErrors?: { row: number; message: string }[];
}

interface AdvisorImportCardProps {
  data: ImportPreviewData;
  onImport: (validRows: ImportRow[]) => Promise<void>;
  onEdit: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

const SCHEMA_LABELS: Record<ImportSchema, string> = {
  inventory: "Inventory",
  employees: "Employees",
  customers: "Customers",
  expenses: "Expenses",
};

const SCHEMA_ICONS: Record<ImportSchema, string> = {
  inventory: "📦",
  employees: "👥",
  customers: "🤝",
  expenses: "💸",
};

export function AdvisorImportCard({
  data,
  onImport,
  onEdit,
  onCancel,
  disabled = false,
}: AdvisorImportCardProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const previewRows = data.rows.slice(0, 5);
  const remainingCount = Math.max(0, data.rows.length - 5);
  const displayColumns = data.columns.slice(0, 4);

  const handleImport = async () => {
    if (data.validCount === 0) return;

    setIsImporting(true);
    setImportError(null);

    try {
      // Filter valid rows (we could add more validation here)
      const validRows = data.rows.slice(0, data.validCount);
      await onImport(validRows);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden max-w-full">
      {/* Header */}
      <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Document Import</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {SCHEMA_ICONS[data.schema]} {SCHEMA_LABELS[data.schema]}
        </Badge>
      </div>

      {/* Info */}
      <div className="px-4 py-3 text-xs space-y-1 border-b">
        <div className="flex justify-between text-muted-foreground">
          <span>Source:</span>
          <span className="font-medium text-foreground truncate max-w-[180px]">
            {data.fileName}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Records:</span>
          <span>
            <span className="font-medium text-foreground">{data.validCount}</span>
            {" valid"}
            {data.invalidCount > 0 && (
              <span className="text-amber-600 ml-1">
                ({data.invalidCount} need attention)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Preview Table */}
      <div className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {displayColumns.map((col) => (
                <TableHead key={col} className="h-8 px-3 text-xs font-medium">
                  {col}
                </TableHead>
              ))}
              {data.columns.length > 4 && (
                <TableHead className="h-8 px-3 text-xs font-medium text-muted-foreground">
                  ...
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row, idx) => (
              <TableRow key={idx} className="hover:bg-muted/30">
                {displayColumns.map((col) => (
                  <TableCell key={col} className="py-2 px-3 truncate max-w-[120px]">
                    {String(row[col] ?? "-")}
                  </TableCell>
                ))}
                {data.columns.length > 4 && (
                  <TableCell className="py-2 px-3 text-muted-foreground">...</TableCell>
                )}
              </TableRow>
            ))}
            {remainingCount > 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={displayColumns.length + (data.columns.length > 4 ? 1 : 0)}
                  className="py-2 px-3 text-center text-muted-foreground italic"
                >
                  + {remainingCount} more rows
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Validation Errors (if any) */}
      {data.validationErrors && data.validationErrors.length > 0 && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-900">
          <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Some rows need attention:</p>
              <ul className="mt-1 space-y-0.5">
                {data.validationErrors.slice(0, 3).map((err, idx) => (
                  <li key={idx}>Row {err.row}: {err.message}</li>
                ))}
                {data.validationErrors.length > 3 && (
                  <li>+ {data.validationErrors.length - 3} more issues</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Import Error */}
      {importError && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {importError}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 flex items-center gap-2 justify-end border-t bg-muted/30">
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isImporting || disabled}
          className="h-8 text-xs"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          disabled={isImporting || disabled}
          className="h-8 text-xs"
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Edit First
        </Button>
        <Button
          size="sm"
          onClick={handleImport}
          disabled={isImporting || disabled || data.validCount === 0}
          className="h-8 text-xs"
        >
          {isImporting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 mr-1" />
              Import {data.validCount}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
