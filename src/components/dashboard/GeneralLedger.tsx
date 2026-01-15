import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, Download } from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useTenant } from "@/hooks/useTenant";

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  balance: number;
  type: "revenue" | "expense" | "asset" | "liability";
}

export function GeneralLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAccount, setFilterAccount] = useState("");
  const { tenantId } = useTenant();

  useEffect(() => {
    if (tenantId) {
      fetchLedgerData();
    }

    // Real-time subscriptions for automatic updates
    const salesChannel = supabase
      .channel("ledger-sales-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_transactions" },
        () => fetchLedgerData()
      )
      .subscribe();

    const expensesChannel = supabase
      .channel("ledger-expenses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => fetchLedgerData()
      )
      .subscribe();

    const paymentsChannel = supabase
      .channel("ledger-payments-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_receipts" },
        () => fetchLedgerData()
      )
      .subscribe();

    // Payroll creates expense entries when marked paid - listen for updates
    const payrollChannel = supabase
      .channel("ledger-payroll-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payroll_records" },
        () => fetchLedgerData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(payrollChannel);
    };
  }, [tenantId]);

  const fetchLedgerData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      // Fetch all financial data and combine into ledger format
      const [salesRes, expensesRes, paymentsRes] = await Promise.all([
        supabase.from("sales_transactions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: true }),
        supabase.from("expenses").select("*").eq("tenant_id", tenantId).order("date_incurred", { ascending: true }),
        supabase.from("payment_receipts").select("*").eq("tenant_id", tenantId).order("payment_date", { ascending: true }),
      ]);

      const ledgerEntries: LedgerEntry[] = [];
      let runningBalance = 0;

      // Add sales as revenue (credit to revenue, debit to cash/receivables)
      (salesRes.data || []).forEach((sale) => {
        runningBalance += Number(sale.total_amount_zmw);
        ledgerEntries.push({
          id: `sale-${sale.id}`,
          date: sale.created_at,
          description: `Sale: ${sale.product_name} x${sale.quantity}`,
          account: "Revenue - Product Sales",
          debit: 0,
          credit: Number(sale.total_amount_zmw),
          balance: runningBalance,
          type: "revenue",
        });
      });

      // Add expenses as debits
      (expensesRes.data || []).forEach((expense) => {
        runningBalance -= Number(expense.amount_zmw);
        ledgerEntries.push({
          id: `expense-${expense.id}`,
          date: expense.date_incurred,
          description: `Expense: ${expense.vendor_name} - ${expense.category}`,
          account: `Expense - ${expense.category}`,
          debit: Number(expense.amount_zmw),
          credit: 0,
          balance: runningBalance,
          type: "expense",
        });
      });

      // Add payment receipts as revenue (actual cash received)
      // Only include payments linked to invoices to avoid double-counting with sales_transactions
      (paymentsRes.data || []).forEach((payment) => {
        // Only show payment receipts that are linked to invoices
        // Direct sales already appear in sales_transactions
        if (payment.invoice_id) {
          runningBalance += Number(payment.amount_paid);
          ledgerEntries.push({
            id: `payment-${payment.id}`,
            date: payment.payment_date,
            description: `Payment Receipt ${payment.receipt_number}: ${payment.client_name}`,
            account: "Revenue - Invoice Payments",
            debit: 0,
            credit: Number(payment.amount_paid),
            balance: runningBalance,
            type: "revenue",
          });
        }
      });

      // Sort by date
      ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Recalculate running balance after sorting
      let balance = 0;
      ledgerEntries.forEach((entry) => {
        balance += entry.credit - entry.debit;
        entry.balance = balance;
      });

      setEntries(ledgerEntries);
    } catch (error) {
      console.error("Error fetching ledger data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("general-ledger-content");
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`general-ledger-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const filteredEntries = filterAccount
    ? entries.filter((e) => e.account.toLowerCase().includes(filterAccount.toLowerCase()))
    : entries;

  const totalDebits = filteredEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredits = filteredEntries.reduce((sum, e) => sum + e.credit, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#004B8D]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BookOpen className="h-6 w-6 text-[#004B8D]" />
          <h3 className="text-lg font-semibold text-[#003366]">General Ledger</h3>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter by account..."
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="w-64"
          />
          <Button onClick={handleDownloadPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div id="general-ledger-content">
        <Card>
          <CardHeader className="py-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm text-muted-foreground">
                Showing {filteredEntries.length} entries
              </CardTitle>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">Total Credits: K {totalCredits.toLocaleString()}</span>
                <span className="text-red-600 font-medium">Total Debits: K {totalDebits.toLocaleString()}</span>
                <span className="text-[#004B8D] font-bold">Net: K {(totalCredits - totalDebits).toLocaleString()}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Debit (K)</TableHead>
                  <TableHead className="text-right">Credit (K)</TableHead>
                  <TableHead className="text-right">Balance (K)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No ledger entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {format(new Date(entry.date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate">
                        {entry.description}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            entry.type === "revenue"
                              ? "border-green-300 text-green-700 bg-green-50"
                              : entry.type === "expense"
                              ? "border-red-300 text-red-700 bg-red-50"
                              : "border-blue-300 text-blue-700 bg-blue-50"
                          }
                        >
                          {entry.account}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {entry.debit > 0 ? entry.debit.toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {entry.credit > 0 ? entry.credit.toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {entry.balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
