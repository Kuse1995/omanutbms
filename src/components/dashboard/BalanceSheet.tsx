import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileSpreadsheet, Download, CheckCircle, XCircle } from "lucide-react";
import { format, endOfMonth } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useTenant } from "@/hooks/useTenant";

interface BalanceSheetData {
  assets: {
    current: {
      cashOnHand: number;
      mobileMoneyBalance: number;
      bankBalance: number;
      cardPosBalance: number;
      accountsReceivable: number;
      inventory: number;
      totalCurrent: number;
    };
    totalAssets: number;
  };
  liabilities: {
    current: {
      accountsPayable: number;
      totalCurrent: number;
    };
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    currentPeriodEarnings: number;
    totalEquity: number;
  };
}

export function BalanceSheet() {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const { tenantId } = useTenant();

  useEffect(() => {
    if (tenantId) {
      fetchBalanceSheetData();
    }

    // Real-time subscriptions for automatic updates
    const salesChannel = supabase
      .channel("bs-sales-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_transactions" },
        () => fetchBalanceSheetData()
      )
      .subscribe();

    const expensesChannel = supabase
      .channel("bs-expenses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => fetchBalanceSheetData()
      )
      .subscribe();

    const invoicesChannel = supabase
      .channel("bs-invoices-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => fetchBalanceSheetData()
      )
      .subscribe();

    // Payroll creates expense entries when marked paid
    const payrollChannel = supabase
      .channel("bs-payroll-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payroll_records" },
        () => fetchBalanceSheetData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(payrollChannel);
    };
  }, [asOfDate, tenantId]);

  const fetchBalanceSheetData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [salesRes, expensesRes, invoicesRes, inventoryRes, payablesRes] = await Promise.all([
        supabase
          .from("sales_transactions")
          .select("total_amount_zmw, payment_method")
          .eq("tenant_id", tenantId)
          .lte("created_at", asOfDate + "T23:59:59"),
        supabase
          .from("expenses")
          .select("amount_zmw, category")
          .eq("tenant_id", tenantId)
          .lte("date_incurred", asOfDate),
        supabase
          .from("invoices")
          .select("total_amount, status")
          .eq("tenant_id", tenantId)
          .lte("invoice_date", asOfDate),
        supabase
          .from("inventory")
          .select("current_stock, unit_price")
          .eq("tenant_id", tenantId),
        supabase
          .from("accounts_payable")
          .select("amount_zmw, status, paid_amount")
          .eq("tenant_id", tenantId)
          .lte("created_at", asOfDate + "T23:59:59"),
      ]);

      // Calculate Assets
      const totalSalesRevenue = (salesRes.data || []).reduce((sum, s) => sum + Number(s.total_amount_zmw), 0);
      const totalExpenses = (expensesRes.data || []).reduce((sum, e) => sum + Number(e.amount_zmw), 0);
      
      // Paid invoices add to cash
      const paidInvoices = (invoicesRes.data || []).filter((inv) => inv.status === "paid");
      const invoiceRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      
      // Pending invoices = Accounts Receivable
      const pendingInvoices = (invoicesRes.data || []).filter((inv) => inv.status !== "paid");
      const accountsReceivable = pendingInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      
      // Cash = all revenue - all expenses
      const cash = totalSalesRevenue + invoiceRevenue - totalExpenses;
      
      // Inventory value
      const inventoryValue = (inventoryRes.data || []).reduce(
        (sum, item) => sum + (Number(item.current_stock) * Number(item.unit_price)),
        0
      );

      const totalCurrentAssets = cash + accountsReceivable + inventoryValue;
      const totalAssets = totalCurrentAssets;

      // Calculate Liabilities from accounts_payable table
      const accountsPayable = (payablesRes.data || [])
        .filter((p) => p.status !== "paid")
        .reduce((sum, p) => sum + (Number(p.amount_zmw) - Number(p.paid_amount || 0)), 0);
      const totalCurrentLiabilities = accountsPayable;
      const totalLiabilities = totalCurrentLiabilities;

      // Calculate Equity
      const totalRevenue = totalSalesRevenue + invoiceRevenue;
      const netIncome = totalRevenue - totalExpenses;
      const retainedEarnings = 0; // Opening balance, would need historical data
      const currentPeriodEarnings = netIncome;
      const totalEquity = retainedEarnings + currentPeriodEarnings;

      setData({
        assets: {
          current: {
            cash: Math.max(0, cash),
            accountsReceivable,
            inventory: inventoryValue,
            totalCurrent: totalCurrentAssets,
          },
          totalAssets,
        },
        liabilities: {
          current: {
            accountsPayable,
            totalCurrent: totalCurrentLiabilities,
          },
          totalLiabilities,
        },
        equity: {
          retainedEarnings,
          currentPeriodEarnings,
          totalEquity,
        },
      });
    } catch (error) {
      console.error("Error fetching balance sheet data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("balance-sheet-content");
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`balance-sheet-${asOfDate}.pdf`);
  };

  const isBalanced = data ? Math.abs(data.assets.totalAssets - (data.liabilities.totalLiabilities + data.equity.totalEquity)) < 0.01 : false;

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
          <FileSpreadsheet className="h-6 w-6 text-[#004B8D]" />
          <h3 className="text-lg font-semibold text-[#003366]">Balance Sheet</h3>
          {data && (
            isBalanced ? (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Balanced
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <XCircle className="h-4 w-4" />
                Unbalanced
              </div>
            )
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="bsDate">As of:</Label>
            <Input
              id="bsDate"
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

      {data && (
        <div id="balance-sheet-content">
          <Card>
            <CardHeader className="py-4 text-center border-b bg-gradient-to-r from-[#004B8D]/5 to-[#0077B6]/5">
              <CardTitle className="text-xl">Balance Sheet</CardTitle>
              <p className="text-sm text-muted-foreground">
                As of {format(new Date(asOfDate), "dd MMMM yyyy")}
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Assets Column */}
                <div className="space-y-4">
                  <h4 className="font-bold text-lg text-[#003366] border-b-2 border-[#004B8D] pb-2">
                    ASSETS
                  </h4>
                  
                  <div>
                    <h5 className="font-semibold text-[#004B8D] mb-2">Current Assets</h5>
                    <div className="space-y-2 pl-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cash & Cash Equivalents</span>
                        <span>K {data.assets.current.cash.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Accounts Receivable</span>
                        <span>K {data.assets.current.accountsReceivable.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Inventory</span>
                        <span>K {data.assets.current.inventory.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Total Current Assets</span>
                        <span>K {data.assets.current.totalCurrent.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#003366]">TOTAL ASSETS</span>
                      <span className="text-xl font-bold text-blue-700">
                        K {data.assets.totalAssets.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Liabilities & Equity Column */}
                <div className="space-y-4">
                  <h4 className="font-bold text-lg text-[#003366] border-b-2 border-[#004B8D] pb-2">
                    LIABILITIES & EQUITY
                  </h4>

                  {/* Liabilities */}
                  <div>
                    <h5 className="font-semibold text-[#004B8D] mb-2">Current Liabilities</h5>
                    <div className="space-y-2 pl-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Accounts Payable</span>
                        <span>K {data.liabilities.current.accountsPayable.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Total Current Liabilities</span>
                        <span>K {data.liabilities.current.totalCurrent.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-red-700">Total Liabilities</span>
                      <span className="font-bold text-red-700">
                        K {data.liabilities.totalLiabilities.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Equity */}
                  <div>
                    <h5 className="font-semibold text-[#004B8D] mb-2">Shareholders' Equity</h5>
                    <div className="space-y-2 pl-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Retained Earnings (Opening)</span>
                        <span>K {data.equity.retainedEarnings.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Period Earnings</span>
                        <span className={data.equity.currentPeriodEarnings >= 0 ? "text-green-600" : "text-red-600"}>
                          K {data.equity.currentPeriodEarnings.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Total Equity</span>
                        <span>K {data.equity.totalEquity.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#003366]">TOTAL LIABILITIES & EQUITY</span>
                      <span className="text-xl font-bold text-green-700">
                        K {(data.liabilities.totalLiabilities + data.equity.totalEquity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Check */}
              <div className={`mt-6 p-4 rounded-lg text-center ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-medium ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                  {isBalanced 
                    ? "✓ The Balance Sheet is balanced (Assets = Liabilities + Equity)"
                    : `✗ Difference: K ${Math.abs(data.assets.totalAssets - (data.liabilities.totalLiabilities + data.equity.totalEquity)).toLocaleString()}`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
