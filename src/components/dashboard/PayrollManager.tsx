import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, DollarSign, Users, Calendar, Loader2, Eye, Check, Download } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { PayrollRunModal } from "./PayrollRunModal";
import { PayslipModal } from "./PayslipModal";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";

interface PayrollRecord {
  id: string;
  employee_id: string | null;
  profile_user_id: string | null;
  employee_type: string;
  pay_period_start: string;
  pay_period_end: string;
  basic_salary: number;
  allowances: number;
  overtime_pay: number;
  bonus: number;
  napsa_deduction: number;
  paye_deduction: number;
  other_deductions: number;
  loan_deduction: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  payment_method: string | null;
  payment_reference: string | null;
  status: string;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  employee_name?: string;
}

interface Employee {
  id: string;
  full_name: string;
  base_salary_zmw: number;
  employee_type: string;
  pay_type: string;
  hourly_rate: number;
  daily_rate: number;
  shift_rate: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  approved: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
};

export const PayrollManager = () => {
  const { isAdmin, user } = useAuth();
  const { tenantId } = useTenant();
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payrollRes, employeesRes] = await Promise.all([
        supabase.from("payroll_records").select("*").order("created_at", { ascending: false }),
        supabase.from("employees").select("id, full_name, base_salary_zmw, employee_type, pay_type, hourly_rate, daily_rate, shift_rate").eq("employment_status", "active"),
      ]);

      if (payrollRes.error) throw payrollRes.error;
      if (employeesRes.error) throw employeesRes.error;

      // Map employee names to payroll records
      const employeeMap = new Map(employeesRes.data?.map((e) => [e.id, e.full_name]) || []);
      const recordsWithNames = (payrollRes.data || []).map((r) => ({
        ...r,
        employee_name: r.employee_id ? employeeMap.get(r.employee_id) || "Unknown" : "BMS User",
      }));

      setPayrollRecords(recordsWithNames);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error("Error fetching payroll data:", error);
      toast.error("Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getMonthOptions = () => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      });
    }
    return options;
  };

  const filteredRecords = payrollRecords.filter((r) => {
    const recordMonth = format(new Date(r.pay_period_start), "yyyy-MM");
    return recordMonth === selectedMonth;
  });

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payroll_records")
        .update({ status: "approved" })
        .eq("id", id);
      if (error) throw error;
      toast.success("Payroll approved");
      fetchData();
    } catch (error) {
      console.error("Error approving payroll:", error);
      toast.error("Failed to approve payroll");
    }
  };

  const handleMarkPaid = async (id: string) => {
    const record = payrollRecords.find((r) => r.id === id);
    if (!record) return;

    try {
      const paidDate = new Date().toISOString().split("T")[0];
      
      // Update payroll status
      const { error } = await supabase
        .from("payroll_records")
        .update({ status: "paid", paid_date: paidDate })
        .eq("id", id);
      if (error) throw error;

      // Record as expense for accounting
      const { error: expenseError } = await supabase.from("expenses").insert({
        tenant_id: tenantId,
        date_incurred: paidDate,
        category: "Salaries & Wages",
        amount_zmw: record.net_pay,
        vendor_name: record.employee_name || "Employee",
        notes: `Salary payment for ${format(new Date(record.pay_period_start), "MMMM yyyy")} - ${record.employee_name}`,
        recorded_by: user?.id,
      });

      if (expenseError) {
        console.error("Error recording expense:", expenseError);
        toast.error("Payroll marked as paid but expense recording failed. Please record manually in expenses.");
        // Still refresh to show the updated payroll status
        fetchData();
        return;
      }

      toast.success("Marked as paid and recorded in expenses");
      fetchData();
    } catch (error) {
      console.error("Error marking paid:", error);
      toast.error("Failed to mark as paid");
    }
  };

  const totals = filteredRecords.reduce(
    (acc, r) => ({
      gross: acc.gross + r.gross_pay,
      deductions: acc.deductions + r.total_deductions,
      net: acc.net + r.net_pay,
      napsa: acc.napsa + r.napsa_deduction,
      paye: acc.paye + r.paye_deduction,
    }),
    { gross: 0, deductions: 0, net: 0, napsa: 0, paye: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{filteredRecords.length}</div>
            <div className="text-xs text-muted-foreground">Payslips</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <div className="text-2xl font-bold">K{totals.gross.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Gross Pay</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">K{totals.deductions.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Deductions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">K{totals.net.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Net Pay</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-orange-600">
              NAPSA: K{totals.napsa.toLocaleString()}
            </div>
            <div className="text-sm text-purple-600">
              PAYE: K{totals.paye.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getMonthOptions().map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsRunModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Run Payroll
        </Button>
      </div>

      {/* Payroll Table */}
      {filteredRecords.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No payroll records for {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}. Run payroll to generate payslips.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payroll - {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Basic</TableHead>
                  <TableHead className="text-right">Allowances</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">NAPSA</TableHead>
                  <TableHead className="text-right">PAYE</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.employee_name}</TableCell>
                    <TableCell className="text-right">K{record.basic_salary.toLocaleString()}</TableCell>
                    <TableCell className="text-right">K{record.allowances.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">K{record.gross_pay.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-orange-600">K{record.napsa_deduction.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-purple-600">K{record.paye_deduction.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-primary">K{record.net_pay.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[record.status]}>{record.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedPayslip(record)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {record.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600"
                            onClick={() => handleApprove(record.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {record.status === "approved" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600"
                            onClick={() => handleMarkPaid(record.id)}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PayrollRunModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        employees={employees}
        onSuccess={fetchData}
        selectedMonth={selectedMonth}
      />

      <PayslipModal
        isOpen={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
        payroll={selectedPayslip}
      />
    </div>
  );
};
