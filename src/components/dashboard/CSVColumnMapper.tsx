import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  Check,
  AlertCircle,
  Wand2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SchemaField {
  key: string;
  label: string;
  required: boolean;
  type: "string" | "number" | "boolean";
  aliases?: string[]; // Alternative names this field might have
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null;
  confidence: number; // 0-1 confidence score
  sampleValues: string[];
}

interface CSVColumnMapperProps {
  sourceColumns: string[];
  schemaFields: SchemaField[];
  rawData: Record<string, any>[]; // First few rows for preview
  onMappingComplete: (
    mappings: Record<string, string>,
    transformedData: Record<string, any>[]
  ) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Common column name aliases for auto-detection
const COLUMN_ALIASES: Record<string, string[]> = {
  // Inventory
  sku: ["sku", "product_code", "item_code", "code", "barcode", "product_id", "item_id", "part_number", "part_no", "article_no"],
  name: ["name", "product_name", "item_name", "product", "item", "description", "title", "product_title"],
  unit_price: ["unit_price", "price", "selling_price", "retail_price", "cost", "rate", "amount", "unit_cost", "sale_price"],
  cost_price: ["cost_price", "cost", "purchase_price", "buying_price", "wholesale_price", "supplier_price"],
  current_stock: ["current_stock", "stock", "quantity", "qty", "on_hand", "available", "inventory", "balance", "stock_level"],
  reorder_level: ["reorder_level", "reorder", "min_stock", "minimum", "threshold", "reorder_point", "min_qty"],
  category: ["category", "type", "group", "classification", "department", "section"],
  description: ["description", "desc", "details", "notes", "remarks", "info"],

  // Employees
  full_name: ["full_name", "name", "employee_name", "staff_name", "worker_name", "person_name", "fullname"],
  employee_type: ["employee_type", "type", "employment_type", "worker_type", "staff_type", "status"],
  department: ["department", "dept", "division", "section", "unit", "team"],
  job_title: ["job_title", "title", "position", "role", "designation", "job_role"],
  phone: ["phone", "telephone", "mobile", "cell", "contact", "phone_number", "tel", "contact_number"],
  email: ["email", "e-mail", "email_address", "mail"],
  base_salary_zmw: ["base_salary_zmw", "salary", "base_salary", "pay", "wage", "compensation", "monthly_salary", "basic_salary"],

  // Customers
  address: ["address", "location", "street", "physical_address", "street_address"],
  customer_type: ["customer_type", "client_type", "type", "category"],
};

function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function findBestMatch(
  sourceColumn: string,
  schemaFields: SchemaField[]
): { field: string | null; confidence: number } {
  const normalized = normalizeColumnName(sourceColumn);

  for (const field of schemaFields) {
    // Exact match
    if (normalized === field.key) {
      return { field: field.key, confidence: 1.0 };
    }

    // Check aliases
    const aliases = COLUMN_ALIASES[field.key] || [];
    if (aliases.includes(normalized)) {
      return { field: field.key, confidence: 0.95 };
    }

    // Partial match
    if (
      normalized.includes(field.key) ||
      field.key.includes(normalized) ||
      aliases.some(
        (alias) => normalized.includes(alias) || alias.includes(normalized)
      )
    ) {
      return { field: field.key, confidence: 0.7 };
    }

    // Check if label matches
    const normalizedLabel = normalizeColumnName(field.label);
    if (normalized === normalizedLabel || normalized.includes(normalizedLabel)) {
      return { field: field.key, confidence: 0.8 };
    }
  }

  return { field: null, confidence: 0 };
}

export function CSVColumnMapper({
  sourceColumns,
  schemaFields,
  rawData,
  onMappingComplete,
  onCancel,
  isLoading = false,
}: CSVColumnMapperProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [isAutoMapping, setIsAutoMapping] = useState(false);

  // Initialize mappings with auto-detection
  useEffect(() => {
    const initialMappings: ColumnMapping[] = sourceColumns.map((col) => {
      const { field, confidence } = findBestMatch(col, schemaFields);
      const sampleValues = rawData
        .slice(0, 3)
        .map((row) => String(row[col] || ""))
        .filter((v) => v);

      return {
        sourceColumn: col,
        targetField: confidence >= 0.5 ? field : null,
        confidence,
        sampleValues,
      };
    });

    // Resolve conflicts - if multiple source columns map to same target, keep highest confidence
    const targetCounts: Record<string, ColumnMapping[]> = {};
    initialMappings.forEach((m) => {
      if (m.targetField) {
        if (!targetCounts[m.targetField]) {
          targetCounts[m.targetField] = [];
        }
        targetCounts[m.targetField].push(m);
      }
    });

    Object.values(targetCounts).forEach((conflicts) => {
      if (conflicts.length > 1) {
        // Sort by confidence, keep highest
        conflicts.sort((a, b) => b.confidence - a.confidence);
        conflicts.slice(1).forEach((m) => {
          m.targetField = null;
          m.confidence = 0;
        });
      }
    });

    setMappings(initialMappings);
  }, [sourceColumns, schemaFields, rawData]);

  const updateMapping = (sourceColumn: string, targetField: string | null) => {
    setMappings((prev) => {
      const updated = prev.map((m) => {
        if (m.sourceColumn === sourceColumn) {
          return { ...m, targetField, confidence: targetField ? 1.0 : 0 };
        }
        // Clear any other mapping to this target
        if (targetField && m.targetField === targetField) {
          return { ...m, targetField: null, confidence: 0 };
        }
        return m;
      });
      return updated;
    });
  };

  const mappedFields = useMemo(() => {
    return new Set(mappings.filter((m) => m.targetField).map((m) => m.targetField));
  }, [mappings]);

  const unmappedRequired = useMemo(() => {
    return schemaFields.filter(
      (f) => f.required && !mappedFields.has(f.key)
    );
  }, [schemaFields, mappedFields]);

  const canProceed = unmappedRequired.length === 0;

  const handleProceed = () => {
    // Build mapping dictionary
    const mappingDict: Record<string, string> = {};
    mappings.forEach((m) => {
      if (m.targetField) {
        mappingDict[m.sourceColumn] = m.targetField;
      }
    });

    // Transform data
    const transformedData = rawData.map((row) => {
      const transformed: Record<string, any> = {};
      Object.entries(row).forEach(([key, value]) => {
        const targetField = mappingDict[key];
        if (targetField) {
          // Type conversion based on schema
          const field = schemaFields.find((f) => f.key === targetField);
          if (field?.type === "number") {
            const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
            transformed[targetField] = isNaN(parsed) ? 0 : parsed;
          } else if (field?.type === "boolean") {
            transformed[targetField] =
              String(value).toLowerCase() === "true" ||
              String(value).toLowerCase() === "yes" ||
              value === "1";
          } else {
            transformed[targetField] = String(value || "").trim();
          }
        }
      });
      return transformed;
    });

    onMappingComplete(mappingDict, transformedData);
  };

  const autoMapAll = () => {
    setIsAutoMapping(true);
    setTimeout(() => {
      // Re-run auto-detection with fresh state
      const newMappings: ColumnMapping[] = sourceColumns.map((col) => {
        const { field, confidence } = findBestMatch(col, schemaFields);
        const sampleValues = rawData
          .slice(0, 3)
          .map((row) => String(row[col] || ""))
          .filter((v) => v);

        return {
          sourceColumn: col,
          targetField: confidence >= 0.3 ? field : null, // Lower threshold for auto-map
          confidence,
          sampleValues,
        };
      });

      // Resolve conflicts
      const targetCounts: Record<string, ColumnMapping[]> = {};
      newMappings.forEach((m) => {
        if (m.targetField) {
          if (!targetCounts[m.targetField]) {
            targetCounts[m.targetField] = [];
          }
          targetCounts[m.targetField].push(m);
        }
      });

      Object.values(targetCounts).forEach((conflicts) => {
        if (conflicts.length > 1) {
          conflicts.sort((a, b) => b.confidence - a.confidence);
          conflicts.slice(1).forEach((m) => {
            m.targetField = null;
            m.confidence = 0;
          });
        }
      });

      setMappings(newMappings);
      setIsAutoMapping(false);
    }, 500);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Map Your Columns</h3>
          <p className="text-sm text-muted-foreground">
            Match your CSV columns to the system fields
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={autoMapAll}
          disabled={isAutoMapping}
        >
          {isAutoMapping ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          Auto-Map
        </Button>
      </div>

      {/* Required fields warning */}
      {unmappedRequired.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Required fields not mapped:
            </p>
            <p className="text-amber-700 dark:text-amber-300">
              {unmappedRequired.map((f) => f.label).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Mapping Table */}
      <ScrollArea className="h-[350px] border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[35%]">Your Column</TableHead>
              <TableHead className="w-[10%] text-center"></TableHead>
              <TableHead className="w-[35%]">Maps To</TableHead>
              <TableHead className="w-[20%]">Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((mapping) => (
              <TableRow key={mapping.sourceColumn}>
                <TableCell>
                  <div className="space-y-1">
                    <span className="font-medium text-sm">
                      {mapping.sourceColumn}
                    </span>
                    {mapping.confidence > 0 && mapping.confidence < 1 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs ml-2",
                          mapping.confidence >= 0.8
                            ? "border-green-500 text-green-600"
                            : mapping.confidence >= 0.5
                            ? "border-amber-500 text-amber-600"
                            : "border-muted-foreground/50"
                        )}
                      >
                        {Math.round(mapping.confidence * 100)}% match
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                </TableCell>
                <TableCell>
                  <Select
                    value={mapping.targetField || "_none_"}
                    onValueChange={(v) =>
                      updateMapping(
                        mapping.sourceColumn,
                        v === "_none_" ? null : v
                      )
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">
                        <span className="text-muted-foreground">
                          Don't import
                        </span>
                      </SelectItem>
                      {schemaFields.map((field) => (
                        <SelectItem
                          key={field.key}
                          value={field.key}
                          disabled={
                            mappedFields.has(field.key) &&
                            mapping.targetField !== field.key
                          }
                        >
                          <div className="flex items-center gap-2">
                            <span>{field.label}</span>
                            {field.required && (
                              <span className="text-destructive">*</span>
                            )}
                            {mappedFields.has(field.key) &&
                              mapping.targetField !== field.key && (
                                <Check className="h-3 w-3 text-green-600" />
                              )}
                          </div>
                        </SelectItem>
                      ))}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {mapping.sampleValues.slice(0, 2).join(", ") || "-"}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <Badge variant="outline" className="border-green-500 text-green-600">
          <Check className="h-3 w-3 mr-1" />
          {mappings.filter((m) => m.targetField).length} mapped
        </Badge>
        <Badge variant="outline" className="text-muted-foreground">
          {mappings.filter((m) => !m.targetField).length} skipped
        </Badge>
        <span className="text-muted-foreground ml-auto">
          {rawData.length} rows to import
        </span>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleProceed} disabled={!canProceed || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Apply Mapping
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
