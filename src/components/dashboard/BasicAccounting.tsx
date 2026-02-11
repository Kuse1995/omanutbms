import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { DollarSign, Receipt, TrendingUp, TrendingDown, Loader2, Eye, Pencil, Trash2, BookOpen, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { useTenant } from "@/hooks/useTenant";
import { ExpenseModal } from "./ExpenseModal";
import { ExpenseViewModal } from "./ExpenseViewModal";
import { CashBook } from "./CashBook";

interface Expense {
  id: string;
  date_incurred: string;
  category: string;
  amount_zmw: number;
  vendor_name: string;
  notes: string | null;
  receipt_image_url?: string | null;
  created_at?: string;
}

/**
 * BasicAccounting - Core accounting module
 * Includes: Expenses, Cashbook, Simple summaries
 * Part of core modules (always enabled)
 */
export function BasicAccounting() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isExpenseViewOpen, setIsExpenseViewOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { role } = useAuth();
  const { terminology, currencySymbol } = useFeatures();
  const { tenantId } = useTenant();
  
  const canEdit = role === "admin";

  const fetchExpenses = async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, date_incurred, category, amount_zmw, vendor_name, notes, receipt_image_url, created_at")
        .eq("tenant_id", tenantId)
        .order("date_incurred", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast({
        title: "Error",
        description: "Failed to fetch expense data",
        variant: "destructive",
      });
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    await fetchExpenses();
    setIsLoading(false);
  };

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }

    const expensesChannel = supabase
      .channel("expenses-basic-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => fetchExpenses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(expensesChannel);
    };
  }, [tenantId]);

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount_zmw), 0);

  const handleDownloadCSV = () => {
    if (expenses.length === 0) return;
    const headers = ["Date", "Category", "Vendor", "Amount", "Notes"];
    const rows = expenses.map((e) => [
      format(new Date(e.date_incurred), "yyyy-MM-dd"),
      e.category,
      e.vendor_name,
      Number(e.amount_zmw).toFixed(2),
      (e.notes || "").replace(/,/g, ";"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseToDelete.id);
      if (error) throw error;
      toast({ title: "Expense Deleted", description: "The expense has been removed" });
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({ title: "Error", description: "Failed to delete expense", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setExpenseToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Basic Accounting</h2>
          <p className="text-muted-foreground">Expenses & Cash Flow Tracking</p>
        </div>
        <Button
          onClick={() => setIsExpenseModalOpen(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Receipt className="h-4 w-4 mr-2" />
          Record Expense
        </Button>
      </div>

      {/* Summary Card */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6">
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 dark:from-red-950/20 dark:to-rose-950/20 dark:border-red-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-red-700 dark:text-red-300 text-sm font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-red-800 dark:text-red-200">
                  {currencySymbol} {totalExpenses.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Card className="bg-card border-border shadow-sm">
        <Tabs defaultValue="cashbook" className="w-full">
          <div className="p-4 pb-0">
            <TabsList className="bg-muted">
              <TabsTrigger value="cashbook" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BookOpen className="h-4 w-4 mr-2" />
                Cash Book
              </TabsTrigger>
              <TabsTrigger value="expenses" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                <Receipt className="h-4 w-4 mr-2" />
                Expenses ({expenses.length})
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="p-4">
            <TabsContent value="cashbook" className="mt-0">
              <CashBook />
            </TabsContent>
            <TabsContent value="expenses" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Category</TableHead>
                    <TableHead className="text-muted-foreground">Vendor</TableHead>
                    <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No expenses recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((expense) => (
                      <TableRow key={expense.id} className="border-border hover:bg-muted/50">
                        <TableCell className="text-foreground">
                          {new Date(expense.date_incurred).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground font-medium">
                          {expense.vendor_name}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {currencySymbol} {Number(expense.amount_zmw).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setIsExpenseViewOpen(true);
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setExpenseToEdit(expense);
                                    setIsExpenseModalOpen(true);
                                  }}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpenseToDelete(expense)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSuccess={fetchExpenses}
        expenseToEdit={expenseToEdit || undefined}
      />

      {selectedExpense && (
        <ExpenseViewModal
          isOpen={isExpenseViewOpen}
          onClose={() => setIsExpenseViewOpen(false)}
          expense={selectedExpense}
        />
      )}

      <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
