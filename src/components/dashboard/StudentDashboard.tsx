import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, CreditCard, AlertTriangle, Users, TrendingUp, Loader2 } from "lucide-react";
import type { DashboardTab } from "@/pages/Dashboard";

interface StudentDashboardProps {
  setActiveTab?: (tab: DashboardTab) => void;
}

interface FeeStats {
  totalStudents: number;
  totalExpected: number;
  totalCollected: number;
  collectionRate: number;
  topDebtors: { name: string; balance: number }[];
}

export function StudentDashboard({ setActiveTab }: StudentDashboardProps) {
  const { tenantId } = useTenant();
  const { currencySymbol } = useBusinessConfig();
  const [stats, setStats] = useState<FeeStats>({
    totalStudents: 0,
    totalExpected: 0,
    totalCollected: 0,
    collectionRate: 0,
    topDebtors: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Count students
        const { count: studentCount } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId);

        // Get invoices for fee tracking
        const { data: invoices } = await supabase
          .from('invoices')
          .select('client_name, total_amount, paid_amount, status')
          .eq('tenant_id', tenantId);

        const totalExpected = (invoices || []).reduce((s, i) => s + (i.total_amount || 0), 0);
        const totalCollected = (invoices || []).reduce((s, i) => s + (i.paid_amount || 0), 0);

        // Build debtor list from unpaid invoices
        const debtorMap: Record<string, number> = {};
        (invoices || []).forEach(inv => {
          if (inv.status !== 'paid' && inv.client_name) {
            const balance = (inv.total_amount || 0) - (inv.paid_amount || 0);
            if (balance > 0) {
              debtorMap[inv.client_name] = (debtorMap[inv.client_name] || 0) + balance;
            }
          }
        });

        const topDebtors = Object.entries(debtorMap)
          .map(([name, balance]) => ({ name, balance }))
          .sort((a, b) => b.balance - a.balance)
          .slice(0, 5);

        setStats({
          totalStudents: studentCount || 0,
          totalExpected,
          totalCollected,
          collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
          topDebtors,
        });
      } catch (error) {
        console.error('Error fetching student dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          School Overview
        </h1>
        <p className="text-muted-foreground">Enrollment & fee collection summary</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fees Collected</p>
                <p className="text-2xl font-bold">{currencySymbol}{stats.totalCollected.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold">{currencySymbol}{(stats.totalExpected - stats.totalCollected).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-bold">{stats.collectionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setActiveTab?.('sales')}>
          <CreditCard className="h-4 w-4 mr-2" />
          Collect Fee
        </Button>
        <Button variant="outline" onClick={() => setActiveTab?.('accounts')}>
          Fee Statements
        </Button>
        <Button variant="outline" onClick={() => setActiveTab?.('customers')}>
          View Students
        </Button>
      </div>

      {/* Top Debtors */}
      {stats.topDebtors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Top Outstanding Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topDebtors.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{currencySymbol}{d.balance.toLocaleString()}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
