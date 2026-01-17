import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Upload, FileText, FileImage, Download, CheckCircle2, XCircle, 
  Loader2, Wand2, Edit2, Trash2, Plus, AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseDocument, isFileSupported, DOCUMENT_ACCEPT, DocumentType } from "@/lib/document-parser";

export type TargetSchema = 'inventory' | 'employees' | 'customers' | 'expenses';

interface SchemaField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
}

interface ParsedRow {
  [key: string]: any;
  isValid?: boolean;
  errors?: string[];
  _rowId?: string;
}

interface ImportConverterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetSchema: TargetSchema;
  onDataReady: (data: ParsedRow[]) => void;
  schemaFields: SchemaField[];
  title?: string;
  description?: string;
}

type ConversionState = 'upload' | 'processing' | 'review' | 'error';

const schemaLabels: Record<TargetSchema, string> = {
  inventory: 'Products & Inventory',
  employees: 'Employees & Staff',
  customers: 'Customers & Clients',
  expenses: 'Expenses & Transactions',
};

const fileTypeIcons: Record<DocumentType, React.ReactNode> = {
  word: <FileText className="h-8 w-8 text-blue-500" />,
  pdf: <FileText className="h-8 w-8 text-red-500" />,
  image: <FileImage className="h-8 w-8 text-green-500" />,
  unknown: <FileText className="h-8 w-8 text-gray-400" />,
};

export function ImportConverterModal({
  open,
  onOpenChange,
  targetSchema,
  onDataReady,
  schemaFields,
  title,
  description,
}: ImportConverterModalProps) {
  const [state, setState] = useState<ConversionState>('upload');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{ rowId: string; key: string } | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setState('upload');
    setParsedData([]);
    setFileName('');
    setErrorMessage('');
    setEditingCell(null);
  };

  const validateRow = (row: ParsedRow): ParsedRow => {
    const errors: string[] = [];
    
    schemaFields.forEach(field => {
      if (field.required) {
        const value = row[field.key];
        if (value === undefined || value === null || value === '') {
          errors.push(`${field.label} is required`);
        }
      }
      if (field.type === 'number' && row[field.key] !== undefined) {
        const num = parseFloat(row[field.key]);
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
  };

  const processDocument = async (file: File) => {
    setState('processing');
    setFileName(file.name);

    try {
      const parsed = await parseDocument(file);
      
      // Call the edge function to extract data
      const { data: result, error } = await supabase.functions.invoke('document-to-csv', {
        body: {
          documentContent: parsed.type === 'word' ? parsed.text : parsed.base64,
          documentType: parsed.type,
          targetSchema,
          mimeType: file.type,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to process document');
      }

      if (!result?.success || !result?.data) {
        throw new Error(result?.error || 'No data extracted from document');
      }

      // Validate each row
      const validatedData = result.data.map((row: ParsedRow) => validateRow(row));
      setParsedData(validatedData);
      setState('review');

      toast({
        title: "Document Analyzed",
        description: `Extracted ${validatedData.length} records. Please review before importing.`,
      });

    } catch (error) {
      console.error('Document processing error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process document');
      setState('error');
      
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : 'Failed to process document',
        variant: "destructive",
      });
    }
  };

  const handleFile = (file: File) => {
    if (!isFileSupported(file)) {
      toast({
        title: "Unsupported File",
        description: "Please upload a Word document (.docx), PDF, or image file",
        variant: "destructive",
      });
      return;
    }
    processDocument(file);
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

  const handleCellEdit = (rowId: string, key: string, value: any) => {
    setParsedData(prev => 
      prev.map(row => {
        if (row._rowId === rowId) {
          const updated = { ...row, [key]: value };
          return validateRow(updated);
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
    setParsedData(prev => [...prev, validateRow(newRow)]);
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
    a.download = `${targetSchema}-import-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleProceedToImport = () => {
    const validData = parsedData.filter(r => r.isValid);
    if (validData.length === 0) {
      toast({
        title: "No Valid Data",
        description: "Please fix validation errors before proceeding",
        variant: "destructive",
      });
      return;
    }
    onDataReady(validData);
    onOpenChange(false);
    resetState();
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            {title || `Convert Document to ${schemaLabels[targetSchema]}`}
          </DialogTitle>
          <DialogDescription>
            {description || `Upload a Word document, PDF, or image and AI will extract ${schemaLabels[targetSchema].toLowerCase()} data for you.`}
          </DialogDescription>
        </DialogHeader>

        {state === 'upload' && (
          <div className="space-y-4">
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/20 hover:border-muted-foreground/40"
              }`}
            >
              <div className="flex justify-center gap-4 mb-4">
                {fileTypeIcons.word}
                {fileTypeIcons.pdf}
                {fileTypeIcons.image}
              </div>
              <p className="font-medium mb-2">
                Drag & drop your document here
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                Supports Word (.docx), PDF, and image files (JPG, PNG)
              </p>
              <p className="text-sm text-muted-foreground mb-4">or</p>
              <label>
                <input
                  type="file"
                  accept={DOCUMENT_ACCEPT}
                  onChange={handleFileInput}
                  className="hidden"
                />
                <Button variant="outline" asChild>
                  <span className="cursor-pointer">Browse Files</span>
                </Button>
              </label>
            </div>

            {/* How it works */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">How it works:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Upload your document (product list, employee roster, price sheet, etc.)</li>
                <li>AI analyzes the document and extracts structured data</li>
                <li>Review and edit the extracted data</li>
                <li>Download as CSV or proceed directly to import</li>
              </ol>
            </div>
          </div>
        )}

        {state === 'processing' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="font-medium mb-2">Analyzing your document...</p>
            <p className="text-sm text-muted-foreground">{fileName}</p>
            <p className="text-xs text-muted-foreground mt-4">
              AI is extracting {schemaLabels[targetSchema].toLowerCase()} data
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="font-medium text-destructive mb-2">Failed to process document</p>
            <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
            <Button onClick={resetState} variant="outline">
              Try Another Document
            </Button>
          </div>
        )}

        {state === 'review' && (
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
              <span className="text-sm text-muted-foreground">
                From: {fileName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="ml-auto"
              >
                Upload Different File
              </Button>
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
                      className={row.isValid ? "" : "bg-red-50"}
                    >
                      {schemaFields.map(field => (
                        <TableCell key={field.key} className="p-1">
                          {editingCell?.rowId === row._rowId && editingCell?.key === field.key ? (
                            <Input
                              autoFocus
                              defaultValue={row[field.key] ?? ''}
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
                              {row[field.key] ?? <span className="text-muted-foreground italic">-</span>}
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
                  onClick={() => { onOpenChange(false); resetState(); }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProceedToImport}
                  disabled={validCount === 0}
                >
                  Import {validCount} Records
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
