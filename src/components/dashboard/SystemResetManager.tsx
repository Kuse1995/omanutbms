import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, Loader2, CheckCircle2, Shield, Skull, Zap, Download, Upload } from "lucide-react";
import { useWarningSound } from "@/hooks/useWarningSound";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from "xlsx";

interface ResetCategory {
  id: string;
  label: string;
  description: string;
  tables: string[];
  checked: boolean;
}

export function SystemResetManager() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [warningFlash, setWarningFlash] = useState(false);
  const [flashCount, setFlashCount] = useState(0);
  const [backupBeforeReset, setBackupBeforeReset] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreComplete, setRestoreComplete] = useState(false);
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  const [categories, setCategories] = useState<ResetCategory[]>([
    {
      id: "sales",
      label: "Sales Transactions",
      description: "All recorded sales and transaction data",
      tables: ["sales_transactions"],
      checked: false,
    },
    {
      id: "bank_transactions",
      label: "Bank Transactions",
      description: "All imported bank transactions for reconciliation",
      tables: ["transactions"],
      checked: false,
    },
    {
      id: "invoices",
      label: "Invoices & Invoice Items",
      description: "All invoices and their line items",
      tables: ["invoice_items", "invoices"],
      checked: false,
    },
    {
      id: "quotations",
      label: "Quotations & Quotation Items",
      description: "All quotations and their line items",
      tables: ["quotation_items", "quotations"],
      checked: false,
    },
    {
      id: "receipts",
      label: "Payment Receipts",
      description: "All payment receipt records",
      tables: ["payment_receipts"],
      checked: false,
    },
    {
      id: "expenses",
      label: "Expenses",
      description: "All recorded expenses",
      tables: ["expenses"],
      checked: false,
    },
    {
      id: "payables",
      label: "Accounts Payable",
      description: "All accounts payable records",
      tables: ["accounts_payable"],
      checked: false,
    },
    {
      id: "agent_data",
      label: "Agent Data",
      description: "All agent transactions, inventory, and applications",
      tables: ["agent_transactions", "agent_inventory", "agent_applications"],
      checked: false,
    },
    {
      id: "payroll",
      label: "Payroll Records",
      description: "All payroll and salary records",
      tables: ["payroll_records"],
      checked: false,
    },
    {
      id: "messages",
      label: "Website Contacts & Messages",
      description: "All contact form submissions and community messages",
      tables: ["website_contacts", "community_messages"],
      checked: false,
    },
    {
      id: "alerts",
      label: "Admin Alerts",
      description: "All system alerts and notifications",
      tables: ["admin_alerts"],
      checked: false,
    },
    {
      id: "donations",
      label: "Donation Requests",
      description: "All donation request records",
      tables: ["donation_requests"],
      checked: false,
    },
    // NEW CATEGORIES
    {
      id: "custom_orders",
      label: "Custom Orders & Tailoring",
      description: "All custom/made-to-measure orders, items, and adjustments",
      tables: ["custom_order_adjustments", "custom_order_items", "custom_orders"],
      checked: false,
    },
    {
      id: "job_cards",
      label: "Job Cards & Production",
      description: "Production job cards and material usage records",
      tables: ["job_material_usage", "job_cards"],
      checked: false,
    },
    {
      id: "customers",
      label: "Customer Records",
      description: "All customer profiles and contact information",
      tables: ["customers"],
      checked: false,
    },
    {
      id: "collections",
      label: "Collections",
      description: "All payment collection records",
      tables: ["collections"],
      checked: false,
    },
    {
      id: "inventory_movements",
      label: "Inventory Movements",
      description: "Stock movements, adjustments, and restock history",
      tables: ["stock_movements", "inventory_adjustments", "restock_history"],
      checked: false,
    },
    {
      id: "stock_transfers",
      label: "Stock Transfers",
      description: "Inter-branch stock transfer records",
      tables: ["stock_transfers"],
      checked: false,
    },
    {
      id: "attendance",
      label: "Employee Attendance",
      description: "All attendance and time tracking records",
      tables: ["employee_attendance"],
      checked: false,
    },
    {
      id: "recurring_expenses",
      label: "Recurring Expenses",
      description: "Recurring expense templates and schedules",
      tables: ["recurring_expenses"],
      checked: false,
    },
    {
      id: "financial_reports",
      label: "Generated Reports",
      description: "Saved financial and business reports",
      tables: ["financial_reports"],
      checked: false,
    },
    {
      id: "vendors",
      label: "Vendors & Suppliers",
      description: "Supplier and vendor records",
      tables: ["vendors"],
      checked: false,
    },
    {
      id: "assets",
      label: "Assets & Depreciation",
      description: "Fixed assets and depreciation logs",
      tables: ["asset_logs", "assets"],
      checked: false,
    },
    {
      id: "audit_logs",
      label: "Audit Logs",
      description: "System audit trails (transaction and general)",
      tables: ["transaction_audit_log", "audit_log"],
      checked: false,
    },
  ]);

  const toggleCategory = (id: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === id ? { ...cat, checked: !cat.checked } : cat
      )
    );
  };

  const selectAll = () => {
    setCategories(prev => prev.map(cat => ({ ...cat, checked: true })));
  };

  const deselectAll = () => {
    setCategories(prev => prev.map(cat => ({ ...cat, checked: false })));
  };

  const selectedCategories = categories.filter(cat => cat.checked);
  const confirmPhrase = "RESET DATA";
  const { playWarningBeep, playAlarmSequence } = useWarningSound();

  // Fetch record counts for selected categories
  const fetchRecordCounts = async () => {
    setIsLoadingCounts(true);
    const counts: Record<string, number> = {};
    
    const allTables = selectedCategories.flatMap(cat => cat.tables);
    
    for (const table of allTables) {
      try {
        const { count, error } = await supabase
          .from(table as any)
          .select("*", { count: "exact", head: true });
        
        if (!error && count !== null) {
          counts[table] = count;
        } else {
          counts[table] = 0;
        }
      } catch (err) {
        console.error(`Error counting ${table}:`, err);
        counts[table] = 0;
      }
    }
    
    setRecordCounts(counts);
    setIsLoadingCounts(false);
  };

  const handleOpenConfirmDialog = async () => {
    await fetchRecordCounts();
    setIsConfirmOpen(true);
  };

  // Dramatic warning flash effect with sound
  useEffect(() => {
    if (warningFlash && flashCount < 6) {
      // Play warning beep on each flash
      playWarningBeep();
      const timer = setTimeout(() => {
        setFlashCount(prev => prev + 1);
      }, 150);
      return () => clearTimeout(timer);
    } else if (flashCount >= 6) {
      setWarningFlash(false);
      setFlashCount(0);
    }
  }, [warningFlash, flashCount, playWarningBeep]);

  const backupDataToCSV = async () => {
    setIsBackingUp(true);
    const workbook = XLSX.utils.book_new();
    const timestamp = new Date().toISOString().split('T')[0];
    
    for (const category of selectedCategories) {
      for (const table of category.tables) {
        try {
          const { data, error } = await supabase
            .from(table as any)
            .select("*");
          
          if (!error && data && data.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, worksheet, table.substring(0, 31)); // Excel sheet name max 31 chars
          }
        } catch (err) {
          console.error(`Error backing up ${table}:`, err);
        }
      }
    }
    
    // Download the backup file
    XLSX.writeFile(workbook, `data-backup-${timestamp}.xlsx`);
    setIsBackingUp(false);
    
    toast({
      title: "Backup Complete",
      description: "Data has been exported to Excel file",
    });
  };

  // Valid table names that can be restored
  const validTables = [
    "sales_transactions", "transactions", "invoice_items", "invoices", "quotation_items", "quotations",
    "payment_receipts", "expenses", "accounts_payable", "agent_transactions", 
    "agent_inventory", "agent_applications", "payroll_records", "website_contacts",
    "community_messages", "admin_alerts", "donation_requests",
    // NEW tables
    "custom_order_adjustments", "custom_order_items", "custom_orders",
    "job_material_usage", "job_cards", "customers", "collections",
    "stock_movements", "inventory_adjustments", "restock_history",
    "stock_transfers", "employee_attendance", "recurring_expenses",
    "financial_reports", "vendors", "asset_logs", "assets",
    "transaction_audit_log", "audit_log"
  ];

  const handleRestoreFromBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    const errors: string[] = [];
    let restoredCount = 0;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      for (const sheetName of workbook.SheetNames) {
        // Only restore to valid tables
        if (!validTables.includes(sheetName)) {
          console.log(`Skipping unknown table: ${sheetName}`);
          continue;
        }

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) continue;

        // Remove id field to let database generate new ones, and clean data
        const cleanedData = jsonData.map((row: any) => {
          const { id, created_at, updated_at, ...rest } = row;
          return rest;
        });

        try {
          const { error } = await supabase
            .from(sheetName as any)
            .insert(cleanedData as any);

          if (error) {
            errors.push(`${sheetName}: ${error.message}`);
          } else {
            restoredCount += cleanedData.length;
          }
        } catch (err: any) {
          errors.push(`${sheetName}: ${err.message}`);
        }
      }

      if (errors.length > 0) {
        toast({
          title: "Partial Restore",
          description: `Restored ${restoredCount} records. Errors: ${errors.slice(0, 3).join(", ")}${errors.length > 3 ? "..." : ""}`,
          variant: "destructive",
        });
      } else {
        setRestoreComplete(true);
        toast({
          title: "Restore Complete",
          description: `Successfully restored ${restoredCount} records from backup`,
        });
        setTimeout(() => setRestoreComplete(false), 3000);
      }
    } catch (err: any) {
      toast({
        title: "Restore Failed",
        description: `Could not read backup file: ${err.message}`,
        variant: "destructive",
      });
    }

    setIsRestoring(false);
    // Reset file input
    event.target.value = "";
  };

  const handleReset = async () => {
    if (confirmText !== confirmPhrase) {
      toast({
        title: "Confirmation Required",
        description: `Please type "${confirmPhrase}" to confirm the reset`,
        variant: "destructive",
      });
      return;
    }

    // Backup data before reset if enabled
    if (backupBeforeReset) {
      await backupDataToCSV();
    }

    // Trigger dramatic warning flash before reset
    setWarningFlash(true);
    setFlashCount(0);
    
    // Wait for flash animation to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsResetting(true);
    const errors: string[] = [];

    // Handle foreign key constraints before deleting
    // We need to clear the foreign key references before deleting
    const selectedTableNames = selectedCategories.flatMap(cat => cat.tables);
    
    console.log("[SystemReset] Starting reset for tables:", selectedTableNames);
    
    // Helper to safely nullify FK references
    const safeNullify = async (table: string, column: string) => {
      try {
        const { error } = await supabase
          .from(table as any)
          .update({ [column]: null })
          .neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) console.warn(`[SystemReset] ${table}.${column} nullify: ${error.message}`);
      } catch (err: any) {
        console.error(`[SystemReset] Error nullifying ${table}.${column}:`, err);
      }
    };
    
    // Helper to safely delete child records
    const safeDeleteChildren = async (table: string) => {
      try {
        const { error } = await supabase
          .from(table as any)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) {
          console.warn(`[SystemReset] ${table} delete: ${error.message}`);
          errors.push(`${table}: ${error.message}`);
        } else {
          console.log(`[SystemReset] ✓ Deleted from ${table}`);
        }
      } catch (err: any) {
        console.error(`[SystemReset] Error deleting ${table}:`, err);
        errors.push(`${table}: ${err.message}`);
      }
    };
    
    // Clear agent_transactions.invoice_id before deleting invoices
    if (selectedTableNames.includes("invoices")) {
      await safeNullify("agent_transactions", "invoice_id");
      await safeNullify("custom_orders", "invoice_id");
      await safeNullify("payment_receipts", "invoice_id");
      await safeNullify("quotations", "converted_to_invoice_id");
      // Delete invoice_items first (child of invoices)
      await safeDeleteChildren("invoice_items");
    }

    // Clear agent_inventory.product_id before deleting inventory (if ever needed)
    if (selectedTableNames.includes("agent_inventory")) {
      await safeNullify("agent_inventory", "product_id");
    }
    
    // Handle quotations FK constraints
    if (selectedTableNames.includes("quotations")) {
      await safeNullify("invoices", "source_quotation_id");
      await safeNullify("custom_orders", "quotation_id");
      // Delete quotation_items first (child of quotations)
      await safeDeleteChildren("quotation_items");
    }
    
    // Handle circular foreign key constraints between invoices and quotations
    if (selectedTableNames.includes("invoices") && selectedTableNames.includes("quotations")) {
      await safeNullify("invoices", "source_quotation_id");
      await safeNullify("quotations", "converted_to_invoice_id");
    }
    
    // Clear sales_transactions references before deleting sales
    if (selectedTableNames.includes("sales_transactions")) {
      // Sales transactions reference inventory - nullify if needed
      await safeNullify("sales_transactions", "product_id");
    }

    // NEW FK CONSTRAINT HANDLING

    // Handle custom_orders FK constraints - delete children first
    if (selectedTableNames.includes("custom_orders")) {
      await safeDeleteChildren("custom_order_adjustments");
      await safeDeleteChildren("custom_order_items");
    }

    // Handle job_cards FK constraints - delete children first
    if (selectedTableNames.includes("job_cards")) {
      await safeDeleteChildren("job_material_usage");
    }

    // Handle assets FK constraints - delete logs first
    if (selectedTableNames.includes("assets")) {
      await safeDeleteChildren("asset_logs");
    }

    // Handle customers FK constraints - nullify references before deleting
    if (selectedTableNames.includes("customers")) {
      await safeNullify("invoices", "customer_id");
      await safeNullify("quotations", "customer_id");
      await safeNullify("custom_orders", "customer_id");
      await safeNullify("sales_transactions", "customer_id");
      await safeNullify("job_cards", "customer_id");
    }

    // Handle vendors FK constraints - nullify references before deleting
    if (selectedTableNames.includes("vendors")) {
      await safeNullify("expenses", "vendor_id");
      await safeNullify("accounts_payable", "vendor_id");
    }

    // Now delete the selected tables in order
    for (const category of selectedCategories) {
      for (const table of category.tables) {
        console.log(`[SystemReset] Deleting from: ${table}`);
        try {
          const { data, error, count } = await supabase
            .from(table as any)
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000")
            .select("id");

          if (error) {
            console.error(`[SystemReset] Error deleting ${table}:`, error.message);
            errors.push(`${table}: ${error.message}`);
          } else {
            console.log(`[SystemReset] ✓ Deleted ${data?.length || 0} rows from ${table}`);
          }
        } catch (err: any) {
          console.error(`[SystemReset] Exception deleting ${table}:`, err);
          errors.push(`${table}: ${err.message}`);
        }
      }
    }
    
    console.log("[SystemReset] Completed. Errors:", errors);

    setIsResetting(false);
    setIsConfirmOpen(false);
    setConfirmText("");

    if (errors.length > 0) {
      toast({
        title: "Partial Reset",
        description: `Some tables had errors: ${errors.join(", ")}`,
        variant: "destructive",
      });
    } else {
      setResetComplete(true);
      toast({
        title: "Reset Complete",
        description: `Successfully cleared ${selectedCategories.length} data categories`,
      });
      setTimeout(() => setResetComplete(false), 3000);
    }

    // Deselect all after reset
    deselectAll();
  };

  if (!isAdmin) {
    return (
      <Card className="bg-white border-destructive/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <Shield className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">Access Denied</h3>
              <p className="text-sm text-muted-foreground">Only administrators can access system reset</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        x: warningFlash ? [0, -8, 8, -6, 6, -4, 4, -2, 2, 0] : 0,
        rotate: warningFlash ? [0, -1, 1, -0.5, 0.5, 0] : 0,
      }}
      transition={{
        x: { duration: 0.5, ease: "easeInOut" },
        rotate: { duration: 0.5, ease: "easeInOut" },
      }}
      className="space-y-6"
    >
      <Card className="bg-white border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-destructive">System Data Reset</CardTitle>
              <CardDescription>
                Clear transactional data for testing or fresh production start
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800">Warning: This action is irreversible</p>
                <p className="text-amber-700 mt-1">
                  Selected data will be permanently deleted. This does NOT affect: Products, Employees, 
                  WASH Forums, Blog Posts, Users, or Company Statistics structure.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Select Data to Clear</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  category.checked
                    ? "bg-destructive/5 border-destructive/30"
                    : "bg-muted/30 border-border hover:bg-muted/50"
                }`}
                onClick={() => toggleCategory(category.id)}
              >
                <Checkbox
                  id={category.id}
                  checked={category.checked}
                  onCheckedChange={() => toggleCategory(category.id)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={category.id}
                    className="font-medium cursor-pointer"
                  >
                    {category.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {category.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Backup option */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Backup before reset</p>
                  <p className="text-xs text-blue-600">Export selected data to Excel before deletion</p>
                </div>
              </div>
              <Switch
                checked={backupBeforeReset}
                onCheckedChange={setBackupBeforeReset}
              />
            </div>
          </div>

          {/* Manual backup button */}
          <Button
            variant="outline"
            className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
            disabled={selectedCategories.length === 0 || isBackingUp}
            onClick={backupDataToCSV}
          >
            {isBackingUp ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Backing up...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Backup Now ({selectedCategories.length} categories)
              </>
            )}
          </Button>

          {/* Restore from backup */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Upload className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-800">Restore from backup</p>
                <p className="text-xs text-emerald-600">Import data from a previously exported Excel file</p>
              </div>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleRestoreFromBackup}
                disabled={isRestoring}
                className="hidden"
              />
              <div className={`flex items-center justify-center gap-2 w-full py-2 px-4 rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-colors ${isRestoring ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isRestoring ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Restoring data...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Choose Backup File
                  </>
                )}
              </div>
            </label>
          </div>

          {restoreComplete && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-green-800 font-medium">Data restored successfully</p>
            </div>
          )}

          {resetComplete && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-green-800 font-medium">Data reset completed successfully</p>
            </div>
          )}

          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            disabled={selectedCategories.length === 0 || isResetting || isBackingUp || isLoadingCounts}
            onClick={handleOpenConfirmDialog}
          >
            {isLoadingCounts ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading counts...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Reset Selected Data ({selectedCategories.length} categories)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Dramatic full-screen warning flash overlay */}
      <AnimatePresence>
        {warningFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: flashCount % 2 === 0 ? 0.8 : 0,
              backgroundColor: flashCount % 2 === 0 ? "hsl(0, 84%, 60%)" : "transparent"
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
          >
            <motion.div
              animate={{ 
                scale: flashCount % 2 === 0 ? [1, 1.2, 1] : 1,
                rotate: flashCount % 2 === 0 ? [0, -5, 5, 0] : 0
              }}
              transition={{ duration: 0.15 }}
              className="text-white"
            >
              <Skull className="h-32 w-32 drop-shadow-2xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className={`${warningFlash ? 'animate-pulse border-destructive border-2' : ''} max-h-[90vh] overflow-y-auto`}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <motion.div
                animate={isConfirmOpen ? { rotate: [0, -10, 10, -10, 0] } : {}}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <AlertTriangle className="h-5 w-5" />
              </motion.div>
              <span className="flex items-center gap-2">
                Confirm System Reset
                <Zap className="h-4 w-4 text-amber-500" />
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-destructive/10 border border-destructive/30 rounded-lg p-3"
              >
                <p className="font-semibold text-destructive flex items-center gap-2">
                  <Skull className="h-4 w-4" />
                  DANGER ZONE - PERMANENT DATA DELETION
                </p>
              </motion.div>
              <p>You are about to permanently delete data from:</p>
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                {selectedCategories.map((cat, index) => {
                  const totalCount = cat.tables.reduce((sum, table) => sum + (recordCounts[table] || 0), 0);
                  return (
                    <motion.div 
                      key={cat.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground">{cat.label}</span>
                      <span className={`font-mono font-semibold px-2 py-0.5 rounded ${totalCount > 0 ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                        {totalCount.toLocaleString()} records
                      </span>
                    </motion.div>
                  );
                })}
                <div className="border-t border-border pt-2 mt-2 flex items-center justify-between font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="font-mono bg-destructive/30 text-destructive px-2 py-0.5 rounded">
                    {Object.values(recordCounts).reduce((sum, count) => sum + count, 0).toLocaleString()} records
                  </span>
                </div>
              </div>
              <motion.p 
                className="font-bold text-destructive text-center py-2 bg-destructive/5 rounded-lg"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ⚠️ THIS ACTION CANNOT BE UNDONE ⚠️
              </motion.p>
              <div className="space-y-2">
                <Label htmlFor="confirm-input">
                  Type <span className="font-mono font-bold bg-destructive/10 px-2 py-1 rounded">{confirmPhrase}</span> to confirm:
                </Label>
                <Input
                  id="confirm-input"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={confirmPhrase}
                  className={`font-mono text-center text-lg ${
                    confirmText === confirmPhrase 
                      ? "border-destructive bg-destructive/5 text-destructive font-bold" 
                      : ""
                  }`}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <motion.div
              whileHover={{ scale: confirmText === confirmPhrase ? 1.05 : 1 }}
              whileTap={{ scale: confirmText === confirmPhrase ? 0.95 : 1 }}
            >
              <AlertDialogAction
                onClick={handleReset}
                disabled={confirmText !== confirmPhrase || isResetting}
                className="bg-destructive hover:bg-destructive/90 gap-2"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="animate-pulse">DESTROYING DATA...</span>
                  </>
                ) : (
                  <>
                    <Skull className="h-4 w-4" />
                    EXECUTE RESET
                  </>
                )}
              </AlertDialogAction>
            </motion.div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}