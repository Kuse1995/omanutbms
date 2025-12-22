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
import { DollarSign, Droplets, FileText, RefreshCw, Loader2, Receipt, TrendingUp, TrendingDown, FilePlus, FileCheck, BarChart3, BookOpen, Eye, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { InvoiceModal } from "./InvoiceModal";
import { ExpenseModal } from "./ExpenseModal";
import { ExpenseViewModal } from "./ExpenseViewModal";
import { InvoicesManager } from "./InvoicesManager";
import { QuotationsManager } from "./QuotationsManager";
import { FinancialReportGenerator } from "./FinancialReportGenerator";
import { GeneralLedger } from "./GeneralLedger";
import { CashBook } from "./CashBook";
import { TrialBalance } from "./TrialBalance";
import { ProfitLossStatement } from "./ProfitLossStatement";
import { BalanceSheet } from "./BalanceSheet";
import AccountsPayable from "./AccountsPayable";
import AccountsReceivableAging from "./AccountsReceivableAging";
import { CreditSalesReport } from "./CreditSalesReport";

interface Transaction {
  id: string;
  ai_client: string | null;
  bank_date: string;
  bank_amount: number;
  status: string;
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

const LITERS_PER_ZMW = 0.5;

export function AccountsAgent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
  
  const canEdit = role === "admin";

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, ai_client, bank_date, bank_amount, status")
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
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, date_incurred, category, amount_zmw, vendor_name, notes, receipt_image_url, created_at")
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

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([fetchTransactions(), fetchExpenses()]);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchAllData();

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

    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllData();
    toast({
      title: "Refreshed",
      description: "Data has been updated",
    });
  };

  const paidTransactions = transactions.filter((t) => t.status === "paid" || t.status === "reviewed");
  const totalRevenue = paidTransactions.reduce((sum, t) => sum + Number(t.bank_amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount_zmw), 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalLitersDonated = Math.round(totalRevenue * LITERS_PER_ZMW);

  const handleGenerateInvoice = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsInvoiceOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#004B8D]" />
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
          <h2 className="text-2xl font-display font-bold text-[#003366] mb-2">Accounts Agent</h2>
          <p className="text-[#004B8D]/60">Revenue, Expenses & Profit Tracking</p>
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
            className="border-[#004B8D]/20 text-[#004B8D] hover:bg-[#004B8D]/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-green-700 text-sm font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-800">
                    K {totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-red-700 text-sm font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-800">
                    K {totalExpenses.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className={`bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-50 to-cyan-50 border-blue-200' : 'from-orange-50 to-amber-50 border-orange-200'}`}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${netProfit >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                  <DollarSign className={`h-6 w-6 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Net Profit</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                    K {netProfit.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Impact Calculator Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-br from-[#004B8D]/10 to-[#0077B6]/10 border-[#004B8D]/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-[#004B8D]/10">
                <Droplets className="h-6 w-6 text-[#0077B6]" />
              </div>
              <div>
                <p className="text-[#004B8D] text-sm font-medium">Impact Calculator</p>
                <p className="text-2xl font-bold text-[#003366]">
                  {totalLitersDonated.toLocaleString()} Liters
                </p>
                <p className="text-[#004B8D]/60 text-xs">Total Safe Water Donated (Rate: 1 ZMW = {LITERS_PER_ZMW} liters)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Card className="bg-white border-[#004B8D]/10 shadow-sm">
        <Tabs defaultValue="invoices-manager" className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="bg-[#004B8D]/10 flex-wrap h-auto gap-1">
              <TabsTrigger value="invoices-manager" className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white">
                <FilePlus className="h-4 w-4 mr-2" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="quotations" className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white">
                <FileCheck className="h-4 w-4 mr-2" />
                Quotations
              </TabsTrigger>
              <TabsTrigger value="books" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                <BookOpen className="h-4 w-4 mr-2" />
                Books
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                AI Reports
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-[#004B8D] data-[state=active]:text-white">
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
            <TabsContent value="books" className="mt-0">
              <Tabs defaultValue="ledger" className="w-full">
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  <TabsTrigger value="ledger">General Ledger</TabsTrigger>
                  <TabsTrigger value="cashbook">Cash Book</TabsTrigger>
                  <TabsTrigger value="trial">Trial Balance</TabsTrigger>
                  <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
                  <TabsTrigger value="pnl">P&L Statement</TabsTrigger>
                  <TabsTrigger value="receivables">A/R Aging</TabsTrigger>
                  <TabsTrigger value="payables">A/P Tracking</TabsTrigger>
                  <TabsTrigger value="credit-sales">Credit Sales</TabsTrigger>
                </TabsList>
                <TabsContent value="ledger"><GeneralLedger /></TabsContent>
                <TabsContent value="cashbook"><CashBook /></TabsContent>
                <TabsContent value="trial"><TrialBalance /></TabsContent>
                <TabsContent value="balance"><BalanceSheet /></TabsContent>
                <TabsContent value="pnl"><ProfitLossStatement /></TabsContent>
                <TabsContent value="receivables"><AccountsReceivableAging /></TabsContent>
                <TabsContent value="payables"><AccountsPayable /></TabsContent>
                <TabsContent value="credit-sales"><CreditSalesReport /></TabsContent>
              </Tabs>
            </TabsContent>
            <TabsContent value="reports" className="mt-0">
              <FinancialReportGenerator />
            </TabsContent>
            <TabsContent value="transactions" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#004B8D]/10 hover:bg-transparent">
                    <TableHead className="text-[#004B8D]/70">Client Name</TableHead>
                    <TableHead className="text-[#004B8D]/70">Date</TableHead>
                    <TableHead className="text-[#004B8D]/70 text-right">Amount (ZMW)</TableHead>
                    <TableHead className="text-[#004B8D]/70">Status</TableHead>
                    <TableHead className="text-[#004B8D]/70 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-[#004B8D]/50 py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id} className="border-[#004B8D]/10 hover:bg-[#004B8D]/5">
                        <TableCell className="text-[#003366] font-medium">
                          {transaction.ai_client || "Unknown Client"}
                        </TableCell>
                        <TableCell className="text-[#003366]/70">
                          {new Date(transaction.bank_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right text-[#003366]">
                          K {Number(transaction.bank_amount).toLocaleString()}
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
                              className="border-[#004B8D]/20 text-[#004B8D] hover:bg-[#004B8D]/10"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Invoice
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
              <h3 className="text-lg font-semibold text-[#003366] mb-4">Expense History</h3>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#004B8D]/10 hover:bg-transparent">
                    <TableHead className="text-[#004B8D]/70">Date</TableHead>
                    <TableHead className="text-[#004B8D]/70">Category</TableHead>
                    <TableHead className="text-[#004B8D]/70">Vendor</TableHead>
                    <TableHead className="text-[#004B8D]/70 text-right">Amount (ZMW)</TableHead>
                    <TableHead className="text-[#004B8D]/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-[#004B8D]/50 py-8">
                        No expenses recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((expense) => (
                      <TableRow key={expense.id} className="border-[#004B8D]/10 hover:bg-[#004B8D]/5 cursor-pointer" onClick={() => { setSelectedExpense(expense); setIsExpenseViewOpen(true); }}>
                        <TableCell className="text-[#003366]/70">
                          {new Date(expense.date_incurred).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              expense.category === "Cost of Goods Sold - Vestergaard" 
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
                        <TableCell className="text-[#003366] font-medium">
                          {expense.vendor_name}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          K {Number(expense.amount_zmw).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); setSelectedExpense(expense); setIsExpenseViewOpen(true); }}
                              className="text-[#004B8D] hover:text-[#003366] hover:bg-[#004B8D]/10"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); setExpenseToEdit(expense); setIsExpenseModalOpen(true); }}
                                  className="text-[#004B8D] hover:text-[#003366] hover:bg-[#004B8D]/10"
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
              Are you sure you want to delete this expense from {expenseToDelete?.vendor_name} for K {expenseToDelete?.amount_zmw.toLocaleString()}? This action cannot be undone.
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
              Are you sure you want to delete this transaction for {transactionToDelete?.ai_client || "Unknown Client"} (K {transactionToDelete?.bank_amount.toLocaleString()})? This action cannot be undone.
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
