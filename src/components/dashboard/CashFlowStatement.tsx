import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, ChevronDown, ChevronRight, TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, subQuarters, startOfQuarter, startOfYear } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useTenant } from "@/hooks/useTenant";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CashFlowCategory {
  label: string;
  amount: number;
  type: "inflow" | "outflow";
}

interface CashFlowData {
  operating: {
    inflows: CashFlowCategory[];
    outflows: CashFlowCategory[];
    net: number;
  };
  investing: {
    inflows: CashFlowCategory[];
    outflows: CashFlowCategory[];
    net: number;
  };
  financing: {
    inflows: CashFlowCategory[];
    outflows: CashFlowCategory[];
    net: number;
  };
  netCashFlow: number;
}

const FINANCING_KEYWORDS = ["loan", "interest", "dividend", "owner", "equity", "capital", "shareholder", "debt", "mortgage", "financing"];

function isFinancingCategory(category: string): boolean {
  const lower = category.toLowerCase();
  return FINANCING_KEYWORDS.some(kw => lower.includes(kw));
}

export function CashFlowStatement() {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [openSections, setOpenSections] = useState({ operating: true, investing: true, financing: true });
  const { tenantId } = useTenant();
  const reportRef = useRef<HTMLDivElement>(null);

  const setQuickPeriod = (period: "month" | "quarter" | "year") => {
    const now = new Date();
    if (period === "month") {
      setStartDate(format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd"));
    } else if (period === "quarter") {
      const lastQ = subQuarters(now, 1);
      setStartDate(format(startOfQuarter(lastQ), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(lastQ), "yyyy-MM-dd"));
    } else {
      setStartDate(format(startOfYear(now), "yyyy-MM-dd"));
      setEndDate(format(now, "yyyy-MM-dd"));
    }
  };

  useEffect(() => {
    if (tenantId) fetchData();

    const channels = [
      supabase.channel("cf-sales").on("postgres_changes", { event: "*", schema: "public", table: "sales_transactions" }, () => fetchData()).subscribe(),
      supabase.channel("cf-expenses").on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => fetchData()).subscribe(),
      supabase.channel("cf-receipts").on("postgres_changes", { event: "*", schema: "public", table: "payment_receipts" }, () => fetchData()).subscribe(),
      supabase.channel("cf-assets").on("postgres_changes", { event: "*", schema: "public", table: "assets" }, () => fetchData()).subscribe(),
    ];

    return () => { channels.forEach(c => supabase.removeChannel(c)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, tenantId]);

  async function fetchData() {
    if (!tenantId) return;
    setIsLoading(true);

    try {
      const [salesRes, receiptsRes, expensesRes, assetsRes] = await Promise.all([
        supabase.from("sales_transactions").select("total_amount_zmw, payment_method, sale_date").eq("tenant_id", tenantId).gte("sale_date", startDate).lte("sale_date", endDate),
        supabase.from("payment_receipts").select("amount_paid, payment_method, payment_date").eq("tenant_id", tenantId).gte("payment_date", startDate).lte("payment_date", endDate),
        supabase.from("expenses").select("amount_zmw, category, date_incurred").eq("tenant_id", tenantId).gte("date_incurred", startDate).lte("date_incurred", endDate),
        supabase.from("assets").select("purchase_cost, purchase_date, disposal_value, disposal_date, status").eq("tenant_id", tenantId),
      ]);

      const sales = salesRes.data || [];
      const receipts = receiptsRes.data || [];
      const expenses = expensesRes.data || [];
      const assets = assetsRes.data || [];

      // --- Operating ---
      const totalSalesRevenue = sales.reduce((s, t) => s + (t.total_amount_zmw || 0), 0);
      const totalCollections = receipts.reduce((s, r) => s + (r.amount_paid || 0), 0);

      const operatingExpenses: Record<string, number> = {};
      const financingExpenses: Record<string, number> = {};

      expenses.forEach(e => {
        const cat = e.category || "Other";
        const amt = e.amount_zmw || 0;
        if (isFinancingCategory(cat)) {
          financingExpenses[cat] = (financingExpenses[cat] || 0) + amt;
        } else {
          operatingExpenses[cat] = (operatingExpenses[cat] || 0) + amt;
        }
      });

      const operatingInflows: CashFlowCategory[] = [];
      if (totalSalesRevenue > 0) operatingInflows.push({ label: "Cash from Product Sales", amount: totalSalesRevenue, type: "inflow" });
      if (totalCollections > 0) operatingInflows.push({ label: "Cash from Invoice Collections", amount: totalCollections, type: "inflow" });

      const operatingOutflows: CashFlowCategory[] = Object.entries(operatingExpenses)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => ({ label: cat, amount: amt, type: "outflow" as const }));

      const totalOpInflow = operatingInflows.reduce((s, i) => s + i.amount, 0);
      const totalOpOutflow = operatingOutflows.reduce((s, i) => s + i.amount, 0);

      // --- Investing ---
      const assetPurchases = assets
        .filter(a => a.purchase_date >= startDate && a.purchase_date <= endDate)
        .reduce((s, a) => s + (a.purchase_cost || 0), 0);

      const assetDisposals = assets
        .filter(a => a.disposal_date && a.disposal_date >= startDate && a.disposal_date <= endDate && a.status === "disposed")
        .reduce((s, a) => s + (a.disposal_value || 0), 0);

      const investingInflows: CashFlowCategory[] = [];
      if (assetDisposals > 0) investingInflows.push({ label: "Proceeds from Asset Disposals", amount: assetDisposals, type: "inflow" });

      const investingOutflows: CashFlowCategory[] = [];
      if (assetPurchases > 0) investingOutflows.push({ label: "Purchase of Fixed Assets", amount: assetPurchases, type: "outflow" });

      const investingNet = assetDisposals - assetPurchases;

      // --- Financing ---
      const financingOutflows: CashFlowCategory[] = Object.entries(financingExpenses)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => ({ label: cat, amount: amt, type: "outflow" as const }));

      const totalFinOutflow = financingOutflows.reduce((s, i) => s + i.amount, 0);

      setData({
        operating: { inflows: operatingInflows, outflows: operatingOutflows, net: totalOpInflow - totalOpOutflow },
        investing: { inflows: investingInflows, outflows: investingOutflows, net: investingNet },
        financing: { inflows: [], outflows: financingOutflows, net: -totalFinOutflow },
        netCashFlow: (totalOpInflow - totalOpOutflow) + investingNet + (-totalFinOutflow),
      });
    } catch (err) {
      console.error("Error fetching cash flow data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const exportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`cash-flow-statement-${startDate}-to-${endDate}.pdf`);
  };

  const formatCurrency = (amount: number) => {
    const prefix = amount < 0 ? "-" : "";
    return `${prefix}K ${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const toggleSection = (key: "operating" | "investing" | "financing") => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderLineItems = (items: CashFlowCategory[], isOutflow: boolean) => (
    <div className="space-y-1 pl-4">
      {items.map((item, idx) => (
        <div key={idx} className="flex justify-between text-sm py-1">
          <span className="text-muted-foreground">{item.label}</span>
          <span className={isOutflow ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}>
            {isOutflow ? `(${formatCurrency(item.amount)})` : formatCurrency(item.amount)}
          </span>
        </div>
      ))}
    </div>
  );

  const renderSection = (
    title: string,
    section: CashFlowData["operating"],
    key: "operating" | "investing" | "financing",
    icon: React.ReactNode
  ) => (
    <Collapsible open={openSections[key]} onOpenChange={() => toggleSection(key)} className="border border-border rounded-lg">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors rounded-lg">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          {icon}
          {openSections[key] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {title}
        </div>
        <span className={`font-bold ${section.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
          {formatCurrency(section.net)}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-3">
        {section.inflows.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Cash Inflows</p>
            {renderLineItems(section.inflows, false)}
          </div>
        )}
        {section.outflows.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Cash Outflows</p>
            {renderLineItems(section.outflows, true)}
          </div>
        )}
        {section.inflows.length === 0 && section.outflows.length === 0 && (
          <p className="text-sm text-muted-foreground italic pl-4">No transactions in this period</p>
        )}
        <div className="flex justify-between pt-2 border-t border-border font-semibold text-sm">
          <span>Net Cash from {title}</span>
          <span className={section.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
            {formatCurrency(section.net)}
          </span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs">Start Date</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">End Date</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod("month")}>Last Month</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod("quarter")}>Last Quarter</Button>
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod("year")}>Year to Date</Button>
        </div>
        <Button variant="outline" size="sm" onClick={exportPDF} disabled={!data}>
          <Download className="h-4 w-4 mr-1" /> Export PDF
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <p className="text-muted-foreground text-center py-8">No data available</p>
      ) : (
        <div ref={reportRef} className="space-y-4">
          <div className="text-center pb-2">
            <h3 className="text-lg font-bold text-foreground">Cash Flow Statement</h3>
            <p className="text-sm text-muted-foreground">
              Period: {format(new Date(startDate), "dd MMM yyyy")} — {format(new Date(endDate), "dd MMM yyyy")}
            </p>
          </div>

          {renderSection("Operating Activities", data.operating, "operating",
            <TrendingUp className="h-4 w-4 text-primary" />
          )}
          {renderSection("Investing Activities", data.investing, "investing",
            <TrendingDown className="h-4 w-4 text-accent-foreground" />
          )}
          {renderSection("Financing Activities", data.financing, "financing",
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          )}

          {/* Net Cash Flow Summary */}
          <Card className={`border-2 ${data.netCashFlow >= 0 ? "border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20" : "border-destructive/30 bg-destructive/5"}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Change in Cash</p>
                <p className={`text-2xl font-bold ${data.netCashFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  {formatCurrency(data.netCashFlow)}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground space-y-1">
                <p>Operating: {formatCurrency(data.operating.net)}</p>
                <p>Investing: {formatCurrency(data.investing.net)}</p>
                <p>Financing: {formatCurrency(data.financing.net)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
