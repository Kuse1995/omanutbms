import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Download, DollarSign, Minus } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface PLData {
  revenue: {
    productSales: number;
    invoiceRevenue: number;
    totalRevenue: number;
  };
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: Record<string, number>;
  totalOperatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
}

export function ProfitLossStatement() {
  const [plData, setPLData] = useState<PLData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));

  useEffect(() => {
    fetchPLData();
  }, [startDate, endDate]);

  const fetchPLData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, expensesRes, invoicesRes] = await Promise.all([
        supabase
          .from("sales_transactions")
          .select("total_amount_zmw")
          .gte("created_at", startDate)
          .lte("created_at", endDate + "T23:59:59"),
        supabase
          .from("expenses")
          .select("category, amount_zmw")
          .gte("date_incurred", startDate)
          .lte("date_incurred", endDate),
        supabase
          .from("invoices")
          .select("total_amount")
          .eq("status", "paid")
          .gte("invoice_date", startDate)
          .lte("invoice_date", endDate),
      ]);

      // Calculate revenue
      const productSales = (salesRes.data || []).reduce((sum, s) => sum + Number(s.total_amount_zmw), 0);
      const invoiceRevenue = (invoicesRes.data || []).reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      const totalRevenue = productSales + invoiceRevenue;

      // Calculate expenses by category
      const expensesByCategory: Record<string, number> = {};
      let costOfGoodsSold = 0;

      (expensesRes.data || []).forEach((exp) => {
        const amount = Number(exp.amount_zmw);
        if (exp.category === "Cost of Goods Sold - Vestergaard") {
          costOfGoodsSold += amount;
        } else {
          expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + amount;
        }
      });

      const totalOperatingExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
      const grossProfit = totalRevenue - costOfGoodsSold;
      const operatingIncome = grossProfit - totalOperatingExpenses;
      const netIncome = operatingIncome; // Simplified, no taxes/interest

      setPLData({
        revenue: {
          productSales,
          invoiceRevenue,
          totalRevenue,
        },
        costOfGoodsSold,
        grossProfit,
        operatingExpenses: expensesByCategory,
        totalOperatingExpenses,
        operatingIncome,
        netIncome,
      });
    } catch (error) {
      console.error("Error fetching P&L data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("pl-statement-content");
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`profit-loss-${startDate}-to-${endDate}.pdf`);
  };

  const setQuickPeriod = (months: number) => {
    const end = new Date();
    const start = subMonths(end, months);
    setStartDate(format(startOfMonth(start), "yyyy-MM-dd"));
    setEndDate(format(endOfMonth(subMonths(end, 1)), "yyyy-MM-dd"));
  };

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
          <TrendingUp className="h-6 w-6 text-[#004B8D]" />
          <h3 className="text-lg font-semibold text-[#003366]">Profit & Loss Statement</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod(1)}>Last Month</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod(3)}>Last Quarter</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod(12)}>Last Year</Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label htmlFor="plStart">From:</Label>
          <Input
            id="plStart"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="plEnd">To:</Label>
          <Input
            id="plEnd"
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

      {plData && (
        <div id="pl-statement-content">
          <Card>
            <CardHeader className="py-4 text-center border-b bg-gradient-to-r from-[#004B8D]/5 to-[#0077B6]/5">
              <CardTitle className="text-xl">Income Statement (Profit & Loss)</CardTitle>
              <p className="text-sm text-muted-foreground">
                For the period {format(new Date(startDate), "dd MMM yyyy")} to {format(new Date(endDate), "dd MMM yyyy")}
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Revenue Section */}
                <div>
                  <h4 className="font-semibold text-[#003366] mb-3 border-b pb-2">Revenue</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Product Sales</span>
                      <span>K {plData.revenue.productSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invoice Revenue</span>
                      <span>K {plData.revenue.invoiceRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Revenue</span>
                      <span className="text-green-600">K {plData.revenue.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Cost of Goods Sold */}
                <div>
                  <h4 className="font-semibold text-[#003366] mb-3 border-b pb-2">Cost of Goods Sold</h4>
                  <div className="pl-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Product Cost (Vestergaard)</span>
                      <span className="text-red-600">K {plData.costOfGoodsSold.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Gross Profit */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#003366]">Gross Profit</span>
                    <span className={`text-xl font-bold ${plData.grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      K {plData.grossProfit.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gross Margin: {plData.revenue.totalRevenue > 0 
                      ? ((plData.grossProfit / plData.revenue.totalRevenue) * 100).toFixed(1) 
                      : 0}%
                  </p>
                </div>

                {/* Operating Expenses */}
                <div>
                  <h4 className="font-semibold text-[#003366] mb-3 border-b pb-2">Operating Expenses</h4>
                  <div className="space-y-2 pl-4">
                    {Object.entries(plData.operatingExpenses).length === 0 ? (
                      <p className="text-muted-foreground text-sm">No operating expenses recorded</p>
                    ) : (
                      Object.entries(plData.operatingExpenses)
                        .sort((a, b) => b[1] - a[1])
                        .map(([category, amount]) => (
                          <div key={category} className="flex justify-between">
                            <span className="text-muted-foreground">{category}</span>
                            <span className="text-red-600">K {amount.toLocaleString()}</span>
                          </div>
                        ))
                    )}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Operating Expenses</span>
                      <span className="text-red-600">K {plData.totalOperatingExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Operating Income */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#003366]">Operating Income</span>
                    <span className={`text-lg font-bold ${plData.operatingIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      K {plData.operatingIncome.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Net Income */}
                <div className={`p-6 rounded-lg ${plData.netIncome >= 0 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <DollarSign className={`h-6 w-6 ${plData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      <span className="font-bold text-lg text-[#003366]">Net Income</span>
                    </div>
                    <span className={`text-2xl font-bold ${plData.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      K {plData.netIncome.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Net Profit Margin: {plData.revenue.totalRevenue > 0 
                      ? ((plData.netIncome / plData.revenue.totalRevenue) * 100).toFixed(1) 
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
