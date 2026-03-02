import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Landmark, Download, Banknote, Smartphone, Building2, CreditCard, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useTenant } from "@/hooks/useTenant";

const ACCOUNT_CONFIG: Record<string, { label: string; icon: typeof Banknote; colorClass: string; bgClass: string }> = {
  cash: { label: "Cash Account", icon: Banknote, colorClass: "text-green-700", bgClass: "from-green-50 to-green-100 border-green-200" },
  mobile_money: { label: "Mobile Money", icon: Smartphone, colorClass: "text-yellow-700", bgClass: "from-yellow-50 to-yellow-100 border-yellow-200" },
  bank_transfer: { label: "Bank Account", icon: Building2, colorClass: "text-blue-700", bgClass: "from-blue-50 to-blue-100 border-blue-200" },
  card: { label: "Card / POS", icon: CreditCard, colorClass: "text-purple-700", bgClass: "from-purple-50 to-purple-100 border-purple-200" },
};

function normalizePaymentMethod(method: string | null): string {
  if (!method) return "cash";
  const lower = method.toLowerCase().trim();
  if (lower === "cash" || lower === "Cash") return "cash";
  if (lower.includes("mobile") || lower.includes("momo") || lower === "mobile_money") return "mobile_money";
  if (lower.includes("bank") || lower === "bank_transfer") return "bank_transfer";
  if (lower.includes("card") || lower.includes("pos")) return "card";
  return "cash";
}

interface AccountSummary {
  inflows: number;
  outflows: number;
  balance: number;
  transactions: AccountTransaction[];
}

interface AccountTransaction {
  id: string;
  date: string;
  description: string;
  type: "inflow" | "outflow";
  amount: number;
  source: string;
}

export function AccountBalancesDashboard() {
  const [accounts, setAccounts] = useState<Record<string, AccountSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const { tenantId } = useTenant();

  useEffect(() => {
    if (tenantId) fetchData();

    const channels = ["sales_transactions", "expenses", "payment_receipts"].map((table, i) =>
      supabase
        .channel(`acct-bal-${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => fetchData())
        .subscribe()
    );
    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
  }, [startDate, endDate, tenantId]);

  const fetchData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [salesRes, expensesRes, receiptsRes] = await Promise.all([
        supabase.from("sales_transactions").select("*").eq("tenant_id", tenantId)
          .gte("created_at", startDate).lte("created_at", endDate + "T23:59:59"),
        supabase.from("expenses").select("*").eq("tenant_id", tenantId)
          .gte("date_incurred", startDate).lte("date_incurred", endDate),
        supabase.from("payment_receipts").select("*").eq("tenant_id", tenantId)
          .gte("payment_date", startDate).lte("payment_date", endDate),
      ]);

      const accts: Record<string, AccountSummary> = {};
      Object.keys(ACCOUNT_CONFIG).forEach((key) => {
        accts[key] = { inflows: 0, outflows: 0, balance: 0, transactions: [] };
      });

      // Sales → inflows to the payment method account
      ((salesRes.data as any[]) || []).forEach((sale) => {
        const method = normalizePaymentMethod(sale.payment_method);
        const amount = Number(sale.total_amount_zmw || 0);
        accts[method].inflows += amount;
        accts[method].transactions.push({
          id: `sale-${sale.id}`,
          date: sale.created_at,
          description: `Sale: ${sale.product_name} x${sale.quantity}`,
          type: "inflow",
          amount,
          source: "Sales",
        });
      });

      // Payment receipts (invoice payments only) → inflows
      ((receiptsRes.data as any[]) || []).forEach((receipt) => {
        if (!receipt.invoice_id) return;
        const method = normalizePaymentMethod(receipt.payment_method);
        const amount = Number(receipt.amount_paid || 0);
        accts[method].inflows += amount;
        accts[method].transactions.push({
          id: `receipt-${receipt.id}`,
          date: receipt.payment_date,
          description: `Payment: ${receipt.client_name} (${receipt.receipt_number})`,
          type: "inflow",
          amount,
          source: "Invoice Payment",
        });
      });

      // Expenses → outflows (default to cash since expenses don't have payment_method yet)
      ((expensesRes.data as any[]) || []).forEach((expense) => {
        const method = normalizePaymentMethod((expense as any).payment_method || "cash");
        const amount = Number(expense.amount_zmw || 0);
        accts[method].outflows += amount;
        accts[method].transactions.push({
          id: `expense-${expense.id}`,
          date: expense.date_incurred,
          description: `Expense: ${expense.vendor_name} - ${expense.category}`,
          type: "outflow",
          amount,
          source: "Expenses",
        });
      });

      // Calculate balances and sort transactions
      Object.values(accts).forEach((a) => {
        a.balance = a.inflows - a.outflows;
        a.transactions.sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
      });

      setAccounts(accts);
    } catch (error) {
      console.error("Error fetching account balances:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const el = document.getElementById("account-balances-content");
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, w, h);
    pdf.save(`account-balances-${startDate}-to-${endDate}.pdf`);
  };

  const totalBalance = Object.values(accounts).reduce((s, a) => s + a.balance, 0);
  const displayedTransactions = selectedAccount === "all"
    ? Object.entries(accounts).flatMap(([key, a]) =>
        a.transactions.map((t) => ({ ...t, account: key }))
      ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : (accounts[selectedAccount]?.transactions || []).map((t) => ({ ...t, account: selectedAccount }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Landmark className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Account Balances</h3>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label>From:</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Label>To:</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div id="account-balances-content" className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(ACCOUNT_CONFIG).map(([key, cfg]) => {
            const acct = accounts[key] || { inflows: 0, outflows: 0, balance: 0 };
            const Icon = cfg.icon;
            return (
              <Card
                key={key}
                className={`bg-gradient-to-br ${cfg.bgClass} border cursor-pointer transition-shadow hover:shadow-md ${selectedAccount === key ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedAccount(selectedAccount === key ? "all" : key)}
              >
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${cfg.colorClass}`} />
                    <span className={`font-semibold text-sm ${cfg.colorClass}`}>{cfg.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${cfg.colorClass}`}>K {acct.balance.toLocaleString()}</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">↑ K {acct.inflows.toLocaleString()}</span>
                    <span className="text-red-600">↓ K {acct.outflows.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Total Balance */}
        <Card className="bg-card border">
          <CardContent className="py-3 flex justify-between items-center">
            <span className="font-semibold text-muted-foreground">Combined Balance (All Accounts)</span>
            <span className={`text-xl font-bold ${totalBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
              K {totalBalance.toLocaleString()}
            </span>
          </CardContent>
        </Card>

        {/* Transaction Table */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">
                {selectedAccount === "all"
                  ? `All transactions (${displayedTransactions.length})`
                  : `${ACCOUNT_CONFIG[selectedAccount]?.label} transactions (${displayedTransactions.length})`}
              </CardTitle>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {Object.entries(ACCOUNT_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Inflow (K)</TableHead>
                  <TableHead className="text-right">Outflow (K)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No transactions found for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">{format(new Date(tx.date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate">{tx.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ACCOUNT_CONFIG[tx.account]?.label || tx.account}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.source}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {tx.type === "inflow" ? tx.amount.toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {tx.type === "outflow" ? tx.amount.toLocaleString() : "-"}
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
