import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { Loader2, FileText, Download, TrendingUp, TrendingDown, DollarSign, Droplets } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ReportInsights {
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: string;
  totalImpactUnits?: number;
  salesCount: number;
  invoiceRevenue: number;
  pendingAmount: number;
  expensesByCategory: Record<string, number>;
  salesByProduct: Record<string, { quantity: number; revenue: number }>;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
}

export function FinancialReportGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [report, setReport] = useState<{ summary: string; insights: ReportInsights } | null>(null);
  const { toast } = useToast();
  const { tenantId } = useTenant();

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-financial-report", {
        body: { periodStart, periodEnd, tenantId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setReport({ summary: data.summary, insights: data.insights });
      toast({ title: "Report Generated", description: "AI financial report is ready" });
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to generate report", 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("report-content");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`financial-report-${periodStart}-to-${periodEnd}.pdf`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    }
  };

  const setQuickPeriod = (months: number) => {
    const end = new Date();
    const start = subMonths(end, months);
    setPeriodStart(format(startOfMonth(start), "yyyy-MM-dd"));
    setPeriodEnd(format(endOfMonth(subMonths(end, 1)), "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            AI Financial Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => setQuickPeriod(1)}>Last Month</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickPeriod(3)}>Last 3 Months</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickPeriod(6)}>Last 6 Months</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickPeriod(12)}>Last Year</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="periodStart">Period Start</Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="periodEnd">Period End</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={generateReport} 
                disabled={isGenerating}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate AI Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div id="report-content" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-700">K {report.insights.revenue.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-700">K {report.insights.expenses.toLocaleString()}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Net Profit</p>
                    <p className={`text-2xl font-bold ${report.insights.netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      K {report.insights.netProfit.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{report.insights.profitMargin}% margin</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            {report.insights.totalImpactUnits !== undefined && report.insights.totalImpactUnits > 0 && (
              <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Impact Units</p>
                      <p className="text-2xl font-bold text-cyan-700">{report.insights.totalImpactUnits.toLocaleString()}</p>
                    </div>
                    <Droplets className="h-8 w-8 text-cyan-500" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* AI Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Executive Summary (AI Generated)</CardTitle>
              <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg">
                  <p className="whitespace-pre-line text-gray-700 leading-relaxed">{report.summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(report.insights.expensesByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full" 
                              style={{ 
                                width: `${(amount / report.insights.expenses) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-24 text-right">K {amount.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Products by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(report.insights.salesByProduct)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .slice(0, 5)
                    .map(([product, data]) => (
                      <div key={product} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-900">{product}</span>
                          <p className="text-xs text-gray-500">{data.quantity} units sold</p>
                        </div>
                        <span className="text-sm font-medium text-green-600">K {data.revenue.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-800">{report.insights.paidInvoicesCount}</p>
                  <p className="text-sm text-gray-600">Paid Invoices</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-800">{report.insights.pendingInvoicesCount}</p>
                  <p className="text-sm text-gray-600">Pending Invoices</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">K {report.insights.invoiceRevenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Collected</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-700">K {report.insights.pendingAmount.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Outstanding</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
