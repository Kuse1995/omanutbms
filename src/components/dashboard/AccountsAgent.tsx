import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DollarSign, FileText, RefreshCw, Loader2, Receipt, TrendingUp, TrendingDown, FilePlus, FileCheck, BarChart3, BookOpen, Eye, Pencil, Trash2, Calculator, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { useTenant } from "@/hooks/useTenant";
import { InvoiceModal } from "./InvoiceModal";
import { ExpenseModal } from "./ExpenseModal";
import { ExpenseViewModal } from "./ExpenseViewModal";
import { InvoicesManager } from "./InvoicesManager";
import { QuotationsManager } from "./QuotationsManager";
import { FinancialReportGenerator } from "./FinancialReportGenerator";
import { BasicAccounting } from "./BasicAccounting";
import { AdvancedAccounting } from "./AdvancedAccounting";
import { FeatureGuard } from "./FeatureGuard";

interface Transaction {
  id: string;
  ai_client: string | null;
  bank_date: string;
  bank_amount: number;
  status: string;
}

interface SalesTransaction {
  id: string;
  product_name: string;
  quantity: number;
  unit_price_zmw: number;
  total_amount_zmw: number;
  payment_method: string | null;
  customer_name: string | null;
  receipt_number: string | null;
  item_type: string;
  created_at: string;
}

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

export function AccountsAgent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [salesTransactions, setSalesTransactions] = useState<SalesTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isExpenseViewOpen, setIsExpenseViewOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { role } = useAuth();
  const { terminology, currencySymbol, isEnabled } = useFeatures();
  const { tenantId } = useTenant();
  
  const canEdit = role === "admin";
  const showAdvancedAccounting = isEnabled('advanced_accounting');

  const fetchTransactions = async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, ai_client, bank_date, bank_amount, status")
        .eq("tenant_id", tenantId)
        .order("bank_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transaction data",
        variant: "destructive",
      });
    }
  };

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

  const fetchSalesTransactions = async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from("sales_transactions")
        .select("id, product_name, quantity, unit_price_zmw, total_amount_zmw, payment_method, customer_name, receipt_number, item_type, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSalesTransactions(data || []);
    } catch (error) {
      console.error("Error fetching sales transactions:", error);
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([fetchTransactions(), fetchExpenses(), fetchSalesTransactions()]);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (tenantId) {
      fetchAllData();
    }

    const transactionsChannel = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => fetchTransactions()
      )
      .subscribe();

    const expensesChannel = supabase
      .channel("expenses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => fetchExpenses()
      )
      .subscribe();

    const salesChannel = supabase
      .channel("sales-transactions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_transactions" },
        () => fetchSalesTransactions()
      )
      .subscribe();

    // Listen for payroll changes to update expenses (payroll creates expense entries)
    const payrollChannel = supabase
      .channel("payroll-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payroll_records" },
        () => fetchExpenses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(payrollChannel);
    };
  }, [tenantId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllData();
    toast({
      title: "Refreshed",
      description: "Data has been updated",
    });
  };

  // Calculate revenue from sales_transactions (primary source)
  const salesRevenue = salesTransactions.reduce((sum, s) => sum + Number(s.total_amount_zmw), 0);
  // Also include paid transactions from transactions table as fallback
  const paidTransactions = transactions.filter((t) => t.status === "paid" || t.status === "reviewed");
  const transactionRevenue = paidTransactions.reduce((sum, t) => sum + Number(t.bank_amount), 0);
  // Total revenue is from sales_transactions (don't double count if both tables have same data)
  const totalRevenue = salesRevenue > 0 ? salesRevenue : transactionRevenue;
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount_zmw), 0);
  const netProfit = totalRevenue - totalExpenses;

  const handleGenerateInvoice = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsInvoiceOpen(true);
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
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Accounts</h2>
          <p className="text-muted-foreground">{terminology.revenueLabel}, Expenses & Profit Tracking</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Record Expense
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-green-700 dark:text-green-400 text-sm font-medium">Total {terminology.revenueLabel}</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                    {currencySymbol} {totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 dark:from-red-950/30 dark:to-rose-950/30 dark:border-red-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/50">
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-red-700 dark:text-red-400 text-sm font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-800 dark:text-red-300">
                    {currencySymbol} {totalExpenses.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className={`bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-50 to-cyan-50 border-blue-200 dark:from-blue-950/30 dark:to-cyan-950/30 dark:border-blue-800' : 'from-orange-50 to-amber-50 border-orange-200 dark:from-orange-950/30 dark:to-amber-950/30 dark:border-orange-800'}`}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${netProfit >= 0 ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-orange-100 dark:bg-orange-900/50'}`}>
                  <DollarSign className={`h-6 w-6 ${netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${netProfit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>Net Profit</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-orange-800 dark:text-orange-300'}`}>
                    {currencySymbol} {netProfit.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="bg-card border shadow-sm">
        <Tabs defaultValue="invoices-manager" className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="invoices-manager" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FilePlus className="h-4 w-4 mr-2" />
                {terminology.transactionsLabel}
              </TabsTrigger>
              <TabsTrigger value="quotations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileCheck className="h-4 w-4 mr-2" />
                Quotations
              </TabsTrigger>
              <TabsTrigger value="basic-books" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                <Calculator className="h-4 w-4 mr-2" />
                Basic Books
              </TabsTrigger>
              {showAdvancedAccounting && (
                <TabsTrigger value="advanced-books" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Advanced Books
                </TabsTrigger>
              )}
              <TabsTrigger value="reports" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                AI Reports
              </TabsTrigger>
              <TabsTrigger value="sales" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Sales ({salesTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="h-4 w-4 mr-2" />
                Transactions ({transactions.length})
              </TabsTrigger>
              <TabsTrigger value="expenses" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                <Receipt className="h-4 w-4 mr-2" />
                Expenses ({expenses.length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="invoices-manager" className="mt-0">
              <InvoicesManager />
            </TabsContent>
            <TabsContent value="quotations" className="mt-0">
              <QuotationsManager />
            </TabsContent>
            <TabsContent value="basic-books" className="mt-0">
              <BasicAccounting />
            </TabsContent>
            {showAdvancedAccounting && (
              <TabsContent value="advanced-books" className="mt-0">
                <FeatureGuard feature="advanced_accounting" featureName="Advanced Accounting">
                  <AdvancedAccounting />
                </FeatureGuard>
              </TabsContent>
            )}
            <TabsContent value="reports" className="mt-0">
              <FinancialReportGenerator />
            </TabsContent>
            <TabsContent value="sales" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Product/Service</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Receipt #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No sales transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesTransactions.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(sale.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sale.product_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{sale.item_type || "product"}</p>
                          </div>
                        </TableCell>
                        <TableCell>{sale.customer_name || "Walk-in"}</TableCell>
                        <TableCell className="text-center">{sale.quantity}</TableCell>
                        <TableCell className="text-right">
                          {currencySymbol} {Number(sale.unit_price_zmw).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {currencySymbol} {Number(sale.total_amount_zmw).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            sale.payment_method === "cash" ? "bg-green-50 text-green-700 border-green-200" :
                            sale.payment_method === "mobile_money" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            sale.payment_method === "card" ? "bg-purple-50 text-purple-700 border-purple-200" :
                            sale.payment_method === "credit_invoice" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            ""
                          }>
                            {sale.payment_method?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Cash"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {sale.receipt_number || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="transactions" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{terminology.customerLabel} Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {transaction.ai_client || `Unknown ${terminology.customerLabel}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(transaction.bank_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {currencySymbol} {Number(transaction.bank_amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {transaction.status === "paid" || transaction.status === "reviewed" ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              Paid
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateInvoice(transaction)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              {terminology.transactionLabel}
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTransactionToDelete(transaction)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="expenses" className="mt-0">
              <h3 className="text-lg font-semibold mb-4">Expense History</h3>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No expenses recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((expense) => (
                      <TableRow key={expense.id} className="cursor-pointer" onClick={() => { setSelectedExpense(expense); setIsExpenseViewOpen(true); }}>
                        <TableCell className="text-muted-foreground">
                          {new Date(expense.date_incurred).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              expense.category === "Cost of Goods Sold" 
                                ? "border-purple-300 text-purple-700 bg-purple-50"
                                : expense.category === "Salaries"
                                ? "border-blue-300 text-blue-700 bg-blue-50"
                                : expense.category === "Marketing"
                                ? "border-pink-300 text-pink-700 bg-pink-50"
                                : expense.category === "Operations/Rent"
                                ? "border-amber-300 text-amber-700 bg-amber-50"
                                : "border-gray-300 text-gray-700 bg-gray-50"
                            }
                          >
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {expense.vendor_name}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {currencySymbol} {Number(expense.amount_zmw).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); setSelectedExpense(expense); setIsExpenseViewOpen(true); }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); setExpenseToEdit(expense); setIsExpenseModalOpen(true); }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); setExpenseToDelete(expense); }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
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
          </CardContent>
        </Tabs>
      </Card>

      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        transaction={selectedTransaction}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => { setIsExpenseModalOpen(false); setExpenseToEdit(null); }}
        onSuccess={fetchExpenses}
        expenseToEdit={expenseToEdit}
      />

      <ExpenseViewModal
        expense={selectedExpense}
        isOpen={isExpenseViewOpen}
        onClose={() => { setIsExpenseViewOpen(false); setSelectedExpense(null); }}
      />

      {/* Delete Expense Confirmation */}
      <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense from {expenseToDelete?.vendor_name} for {currencySymbol} {expenseToDelete?.amount_zmw.toLocaleString()}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={async () => {
                if (!expenseToDelete) return;
                setIsDeleting(true);
                const { error } = await supabase.from("expenses").delete().eq("id", expenseToDelete.id);
                setIsDeleting(false);
                if (error) {
                  toast({ title: "Error", description: "Failed to delete expense", variant: "destructive" });
                } else {
                  toast({ title: "Deleted", description: "Expense has been deleted" });
                  fetchExpenses();
                }
                setExpenseToDelete(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Transaction Confirmation */}
      <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction for {transactionToDelete?.ai_client || `Unknown ${terminology.customerLabel}`} ({currencySymbol} {transactionToDelete?.bank_amount.toLocaleString()})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={async () => {
                if (!transactionToDelete) return;
                setIsDeleting(true);
                const { error } = await supabase.from("transactions").delete().eq("id", transactionToDelete.id);
                setIsDeleting(false);
                if (error) {
                  toast({ title: "Error", description: "Failed to delete transaction", variant: "destructive" });
                } else {
                  toast({ title: "Deleted", description: "Transaction has been deleted" });
                  fetchTransactions();
                }
                setTransactionToDelete(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}