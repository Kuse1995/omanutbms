import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Scale, Download, CheckCircle, XCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useTenant } from "@/hooks/useTenant";

interface TrialBalanceAccount {
  accountName: string;
  accountType: "asset" | "liability" | "equity" | "revenue" | "expense";
  debit: number;
  credit: number;
}

export function TrialBalance() {
  const [accounts, setAccounts] = useState<TrialBalanceAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const { tenantId } = useTenant();

  useEffect(() => {
    if (tenantId) {
      fetchTrialBalanceData();
    }

    // Real-time subscriptions for automatic updates
    const salesChannel = supabase
      .channel("tb-sales-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_transactions" },
        () => fetchTrialBalanceData()
      )
      .subscribe();

    const expensesChannel = supabase
      .channel("tb-expenses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => fetchTrialBalanceData()
      )
      .subscribe();

    const invoicesChannel = supabase
      .channel("tb-invoices-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => fetchTrialBalanceData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, [asOfDate, tenantId]);

  const fetchTrialBalanceData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [salesRes, expensesRes, invoicesRes] = await Promise.all([
        supabase
          .from("sales_transactions")
          .select("total_amount_zmw")
          .eq("tenant_id", tenantId)
          .lte("created_at", asOfDate + "T23:59:59"),
        supabase
          .from("expenses")
          .select("category, amount_zmw")
          .eq("tenant_id", tenantId)
          .lte("date_incurred", asOfDate),
        supabase
          .from("invoices")
          .select("total_amount, status")
          .eq("tenant_id", tenantId)
          .lte("invoice_date", asOfDate),
      ]);

      const accountsMap: Record<string, TrialBalanceAccount> = {};

      // Revenue from sales
      const totalSalesRevenue = (salesRes.data || []).reduce((sum, s) => sum + Number(s.total_amount_zmw), 0);
      if (totalSalesRevenue > 0) {
        accountsMap["Revenue - Product Sales"] = {
          accountName: "Revenue - Product Sales",
          accountType: "revenue",
          debit: 0,
          credit: totalSalesRevenue,
        };
      }

      // Cash account (assuming all sales are cash for simplicity)
      if (totalSalesRevenue > 0) {
        accountsMap["Cash"] = {
          accountName: "Cash",
          accountType: "asset",
          debit: totalSalesRevenue,
          credit: 0,
        };
      }

      // Expenses by category
      const expensesByCategory: Record<string, number> = {};
      (expensesRes.data || []).forEach((exp) => {
        expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + Number(exp.amount_zmw);
      });

      let totalExpenses = 0;
      Object.entries(expensesByCategory).forEach(([category, amount]) => {
        accountsMap[`Expense - ${category}`] = {
          accountName: `Expense - ${category}`,
          accountType: "expense",
          debit: amount,
          credit: 0,
        };
        totalExpenses += amount;
      });

      // Reduce cash by expenses
      if (accountsMap["Cash"] && totalExpenses > 0) {
        accountsMap["Cash"].debit -= totalExpenses;
        if (accountsMap["Cash"].debit < 0) {
          accountsMap["Cash"].credit = Math.abs(accountsMap["Cash"].debit);
          accountsMap["Cash"].debit = 0;
        }
      }

      // Accounts Receivable (pending invoices)
      const pendingInvoices = (invoicesRes.data || []).filter((inv) => inv.status !== "paid");
      const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      if (pendingAmount > 0) {
        accountsMap["Accounts Receivable"] = {
          accountName: "Accounts Receivable",
          accountType: "asset",
          debit: pendingAmount,
          credit: 0,
        };
      }

      // Revenue from paid invoices
      const paidInvoices = (invoicesRes.data || []).filter((inv) => inv.status === "paid");
      const invoiceRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      if (invoiceRevenue > 0) {
        if (accountsMap["Revenue - Product Sales"]) {
          accountsMap["Revenue - Product Sales"].credit += invoiceRevenue;
        } else {
          accountsMap["Revenue - Invoice Payments"] = {
            accountName: "Revenue - Invoice Payments",
            accountType: "revenue",
            debit: 0,
            credit: invoiceRevenue,
          };
        }
        // Add to cash
        if (accountsMap["Cash"]) {
          accountsMap["Cash"].debit += invoiceRevenue;
        }
      }

      // Calculate retained earnings (net income)
      const totalRevenue = Object.values(accountsMap)
        .filter((a) => a.accountType === "revenue")
        .reduce((sum, a) => sum + a.credit, 0);
      const totalExpenseAmount = Object.values(accountsMap)
        .filter((a) => a.accountType === "expense")
        .reduce((sum, a) => sum + a.debit, 0);
      const netIncome = totalRevenue - totalExpenseAmount;

      if (netIncome !== 0) {
        accountsMap["Retained Earnings"] = {
          accountName: "Retained Earnings",
          accountType: "equity",
          debit: netIncome < 0 ? Math.abs(netIncome) : 0,
          credit: netIncome > 0 ? netIncome : 0,
        };
      }

      setAccounts(Object.values(accountsMap).sort((a, b) => {
        const order = { asset: 0, liability: 1, equity: 2, revenue: 3, expense: 4 };
        return order[a.accountType] - order[b.accountType];
      }));
    } catch (error) {
      console.error("Error fetching trial balance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("trial-balance-content");
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`trial-balance-${asOfDate}.pdf`);
  };

  const totalDebits = accounts.reduce((sum, a) => sum + a.debit, 0);
  const totalCredits = accounts.reduce((sum, a) => sum + a.credit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#004B8D]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Scale className="h-6 w-6 text-[#004B8D]" />
          <h3 className="text-lg font-semibold text-[#003366]">Trial Balance</h3>
          {isBalanced ? (
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              Balanced
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600 text-sm">
              <XCircle className="h-4 w-4" />
              Unbalanced (Diff: K {Math.abs(totalDebits - totalCredits).toLocaleString()})
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="asOfDate">As of:</Label>
            <Input
              id="asOfDate"
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div id="trial-balance-content">
        <Card>
          <CardHeader className="py-3 text-center border-b">
            <CardTitle className="text-xl">Trial Balance</CardTitle>
            <p className="text-sm text-muted-foreground">As of {format(new Date(asOfDate), "dd MMMM yyyy")}</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit (K)</TableHead>
                  <TableHead className="text-right">Credit (K)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {accounts.map((account, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{account.accountName}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{account.accountType}</TableCell>
                        <TableCell className="text-right">
                          {account.debit > 0 ? account.debit.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {account.credit > 0 ? account.credit.toLocaleString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-bold border-t-2">
                      <TableCell colSpan={2} className="text-right">Totals:</TableCell>
                      <TableCell className="text-right">K {totalDebits.toLocaleString()}</TableCell>
                      <TableCell className="text-right">K {totalCredits.toLocaleString()}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
