import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, XCircle, DollarSign, AlertTriangle, Search, Loader2 } from "lucide-react";
import { format, addDays, addMonths, addYears, isAfter, isBefore, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface Payment {
  id: string;
  tenant_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  billing_period: string;
  plan_key: string;
  phone_number: string | null;
  operator: string | null;
  created_at: string;
  verified_at: string | null;
  payment_reference: string | null;
  failure_reason: string | null;
  tenant_name?: string;
}

interface ExpiringTenant {
  tenant_id: string;
  tenant_name: string;
  billing_plan: string;
  billing_end_date: string;
  billing_status: string;
}

export function SubscriptionPaymentsManager() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expiringTenants, setExpiringTenants] = useState<ExpiringTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("this_month");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
    fetchExpiringTenants();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscription_payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading payments", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch tenant names
    const tenantIds = [...new Set((data || []).map(p => p.tenant_id))];
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name")
      .in("id", tenantIds);

    const tenantMap = new Map((tenants || []).map(t => [t.id, t.name]));
    const enriched = (data || []).map(p => ({
      ...p,
      tenant_name: tenantMap.get(p.tenant_id) || "Unknown",
    }));

    setPayments(enriched);
    setLoading(false);
  };

  const fetchExpiringTenants = async () => {
    const sevenDaysFromNow = format(addDays(new Date(), 7), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("business_profiles")
      .select("tenant_id, billing_plan, billing_end_date, billing_status")
      .not("billing_end_date", "is", null)
      .lte("billing_end_date", sevenDaysFromNow);

    if (error || !data) return;

    const tenantIds = data.map(d => d.tenant_id);
    const { data: tenants } = await supabase.from("tenants").select("id, name").in("id", tenantIds);
    const tenantMap = new Map((tenants || []).map(t => [t.id, t.name]));

    setExpiringTenants(
      data.map(d => ({
        ...d,
        tenant_name: tenantMap.get(d.tenant_id) || "Unknown",
        billing_end_date: d.billing_end_date!,
      }))
    );
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayment) return;
    setConfirming(selectedPayment.id);

    // 1. Update subscription_payments
    const { error: payError } = await supabase
      .from("subscription_payments")
      .update({ status: "completed", verified_at: new Date().toISOString() })
      .eq("id", selectedPayment.id);

    if (payError) {
      toast({ title: "Error confirming payment", description: payError.message, variant: "destructive" });
      setConfirming(null);
      return;
    }

    // 2. Update business_profiles billing dates
    const now = new Date();
    const endDate = selectedPayment.billing_period === "annual"
      ? addYears(now, 1)
      : addMonths(now, 1);

    await supabase
      .from("business_profiles")
      .update({
        billing_status: "active",
        billing_start_date: format(now, "yyyy-MM-dd"),
        billing_end_date: format(endDate, "yyyy-MM-dd"),
        billing_plan: selectedPayment.plan_key,
      })
      .eq("tenant_id", selectedPayment.tenant_id);

    toast({ title: "Payment confirmed", description: `${selectedPayment.tenant_name}'s subscription is now active.` });
    setConfirming(null);
    setConfirmDialogOpen(false);
    setSelectedPayment(null);
    fetchPayments();
    fetchExpiringTenants();
  };

  // Filters
  const filteredPayments = payments.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (searchQuery && !p.tenant_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (dateFilter === "this_month") {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      const d = new Date(p.created_at);
      if (isBefore(d, start) || isAfter(d, end)) return false;
    } else if (dateFilter === "last_month") {
      const start = startOfMonth(subMonths(new Date(), 1));
      const end = endOfMonth(subMonths(new Date(), 1));
      const d = new Date(p.created_at);
      if (isBefore(d, start) || isAfter(d, end)) return false;
    }
    return true;
  });

  // Summary stats (this month)
  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.created_at);
    return isAfter(d, startOfMonth(new Date())) && isBefore(d, endOfMonth(new Date()));
  });
  const totalAmount = thisMonthPayments.reduce((s, p) => s + Number(p.amount), 0);
  const confirmedCount = thisMonthPayments.filter(p => p.status === "completed").length;
  const confirmedAmount = thisMonthPayments.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const pendingCount = thisMonthPayments.filter(p => p.status === "pending").length;
  const failedCount = thisMonthPayments.filter(p => p.status === "failed" || p.status === "expired").length;

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-green-600 text-white">Completed</Badge>;
      case "pending": return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      case "expired": return <Badge variant="outline" className="text-muted-foreground">Expired</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const planLabel = (key: string) => {
    const map: Record<string, string> = { starter: "Starter", growth: "Pro/Growth", enterprise: "Enterprise" };
    return map[key] || key;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthPayments.length}</div>
            <p className="text-xs text-muted-foreground">K{totalAmount.toLocaleString()} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{confirmedCount}</div>
            <p className="text-xs text-muted-foreground">K{confirmedAmount.toLocaleString()} collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed/Expired</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{failedCount}</div>
            <p className="text-xs text-muted-foreground">Unsuccessful attempts</p>
          </CardContent>
        </Card>
      </div>

      {/* Expiry Alerts */}
      {expiringTenants.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Subscriptions Expiring / Expired ({expiringTenants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringTenants.map(t => {
                const expired = isBefore(new Date(t.billing_end_date), new Date());
                return (
                  <div key={t.tenant_id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{t.tenant_name}</span>
                      <span className="text-muted-foreground ml-2">({planLabel(t.billing_plan)})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={expired ? "text-destructive font-medium" : "text-yellow-600"}>
                        {expired ? "Expired" : "Expiring"} {format(new Date(t.billing_end_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenant..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all_time">All Time</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No payments found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.tenant_name}</TableCell>
                    <TableCell>{p.currency} {Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell>{planLabel(p.plan_key)}</TableCell>
                    <TableCell className="capitalize">{p.billing_period}</TableCell>
                    <TableCell>{p.operator || p.payment_method || "—"}</TableCell>
                    <TableCell className="text-xs">{p.phone_number || "—"}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-xs">{format(new Date(p.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                    <TableCell className="text-xs">{p.verified_at ? format(new Date(p.verified_at), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell>
                      {p.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={confirming === p.id}
                          onClick={() => { setSelectedPayment(p); setConfirmDialogOpen(true); }}
                        >
                          {confirming === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Mark <strong>{selectedPayment?.tenant_name}</strong>'s payment of{" "}
              <strong>{selectedPayment?.currency} {Number(selectedPayment?.amount || 0).toLocaleString()}</strong>{" "}
              ({planLabel(selectedPayment?.plan_key || "")} — {selectedPayment?.billing_period}) as completed?
              This will activate their subscription.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPayment} disabled={!!confirming}>
              {confirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
