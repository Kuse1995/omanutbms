import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wallet, Download, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useTenant } from "@/hooks/useTenant";

interface CashEntry {
  id: string;
  date: string;
  particulars: string;
  voucherNo: string;
  receipt: number;
  payment: number;
  balance: number;
}

export function CashBook() {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const { tenantId } = useTenant();

  useEffect(() => {
    if (tenantId) {
      fetchCashData();
    }

    // Real-time subscriptions for automatic updates
    const salesChannel = supabase
      .channel("cashbook-sales-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_transactions" },
        () => fetchCashData()
      )
      .subscribe();

    const expensesChannel = supabase
      .channel("cashbook-expenses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => fetchCashData()
      )
      .subscribe();

    // Payroll creates expense entries when marked paid
    const payrollChannel = supabase
      .channel("cashbook-payroll-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payroll_records" },
        () => fetchCashData()
      )
      .subscribe();

    // Payment receipts also affect cash book
    const receiptsChannel = supabase
      .channel("cashbook-receipts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_receipts" },
        () => fetchCashData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(payrollChannel);
      supabase.removeChannel(receiptsChannel);
    };
  }, [startDate, endDate, tenantId]);

  const fetchCashData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [salesRes, expensesRes, receiptsRes] = await Promise.all([
        supabase
          .from("sales_transactions")
          .select("*")
          .eq("tenant_id", tenantId)
          .gte("created_at", startDate)
          .lte("created_at", endDate + "T23:59:59")
          .eq("payment_method", "cash")
          .order("created_at", { ascending: true }),
        supabase
          .from("expenses")
          .select("*")
          .eq("tenant_id", tenantId)
          .gte("date_incurred", startDate)
          .lte("date_incurred", endDate)
          .order("date_incurred", { ascending: true }),
        supabase
          .from("payment_receipts")
          .select("*")
          .eq("tenant_id", tenantId)
          .gte("payment_date", startDate)
          .lte("payment_date", endDate)
          .eq("payment_method", "cash")
          .order("payment_date", { ascending: true }),
      ]);

      const cashEntries: CashEntry[] = [];

      // Get all sales receipt numbers to avoid double-counting
      const salesReceiptNumbers = new Set(
        (salesRes.data || []).map((sale) => sale.receipt_number).filter(Boolean)
      );

      // Add cash sales as receipts
      (salesRes.data || []).forEach((sale) => {
        cashEntries.push({
          id: `sale-${sale.id}`,
          date: sale.created_at,
          particulars: `Cash Sale: ${sale.product_name} x${sale.quantity}`,
          voucherNo: sale.receipt_number || sale.id.slice(0, 8).toUpperCase(),
          receipt: Number(sale.total_amount_zmw),
          payment: 0,
          balance: 0,
        });
      });

      // Add expenses as payments
      (expensesRes.data || []).forEach((expense) => {
        cashEntries.push({
          id: `expense-${expense.id}`,
          date: expense.date_incurred,
          particulars: `${expense.category}: ${expense.vendor_name}`,
          voucherNo: expense.id.slice(0, 8).toUpperCase(),
          receipt: 0,
          payment: Number(expense.amount_zmw),
          balance: 0,
        });
      });

      // Add payment receipts as receipts (excluding those already counted in sales)
      (receiptsRes.data || []).forEach((receipt) => {
        // Skip if this receipt is already counted from sales_transactions
        if (salesReceiptNumbers.has(receipt.receipt_number)) {
          return;
        }
        cashEntries.push({
          id: `receipt-${receipt.id}`,
          date: receipt.payment_date,
          particulars: `Payment Received: ${receipt.client_name}`,
          voucherNo: receipt.receipt_number,
          receipt: Number(receipt.amount_paid),
          payment: 0,
          balance: 0,
        });
      });

      // Sort by date
      cashEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
      let balance = 0;
      cashEntries.forEach((entry) => {
        balance += entry.receipt - entry.payment;
        entry.balance = balance;
      });

      setEntries(cashEntries);
    } catch (error) {
      console.error("Error fetching cash data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("cash-book-content");
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`cash-book-${startDate}-to-${endDate}.pdf`);
  };

  const totalReceipts = entries.reduce((sum, e) => sum + e.receipt, 0);
  const totalPayments = entries.reduce((sum, e) => sum + e.payment, 0);
  const closingBalance = totalReceipts - totalPayments;

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
          <Wallet className="h-6 w-6 text-[#004B8D]" />
          <h3 className="text-lg font-semibold text-[#003366]">Cash Book</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="start">From:</Label>
            <Input
              id="start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="end">To:</Label>
            <Input
              id="end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <ArrowDownCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-700">Total Receipts</p>
                <p className="text-xl font-bold text-green-800">K {totalReceipts.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <ArrowUpCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-red-700">Total Payments</p>
                <p className="text-xl font-bold text-red-800">K {totalPayments.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${closingBalance >= 0 ? 'from-blue-50 to-blue-100' : 'from-orange-50 to-orange-100'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Wallet className={`h-8 w-8 ${closingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              <div>
                <p className={`text-sm ${closingBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Closing Balance</p>
                <p className={`text-xl font-bold ${closingBalance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                  K {closingBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div id="cash-book-content">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-muted-foreground">
              Cash transactions from {format(new Date(startDate), "dd MMM yyyy")} to {format(new Date(endDate), "dd MMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead className="text-right">Receipt (K)</TableHead>
                  <TableHead className="text-right">Payment (K)</TableHead>
                  <TableHead className="text-right">Balance (K)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No cash transactions found for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {format(new Date(entry.date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-sm max-w-[300px] truncate">
                          {entry.particulars}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {entry.voucherNo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {entry.receipt > 0 ? entry.receipt.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {entry.payment > 0 ? entry.payment.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {entry.balance.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell colSpan={3} className="text-right">Totals:</TableCell>
                      <TableCell className="text-right text-green-700">K {totalReceipts.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-700">K {totalPayments.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-[#004B8D]">K {closingBalance.toLocaleString()}</TableCell>
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
