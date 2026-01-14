import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useTenant } from "@/hooks/useTenant";

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

interface PayrollRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onSuccess: () => void;
  selectedMonth: string;
}

interface PayrollEntry {
  employee_id: string;
  selected: boolean;
  pay_type: string;
  basic_salary: number;
  hourly_rate: number;
  hours_worked: number;
  shifts_worked: number;
  shift_rate: number;
  allowances: number;
  overtime_pay: number;
  bonus: number;
  loan_deduction: number;
  other_deductions: number;
}

// Zambian PAYE brackets (2024)
const calculatePAYE = (taxableIncome: number): number => {
  if (taxableIncome <= 5100) return 0;
  if (taxableIncome <= 7100) return (taxableIncome - 5100) * 0.2;
  if (taxableIncome <= 9200) return 400 + (taxableIncome - 7100) * 0.3;
  return 1030 + (taxableIncome - 9200) * 0.37;
};

// NAPSA contribution (5% employee, 5% employer)
const calculateNAPSA = (grossPay: number): number => {
  const ceiling = 26055; // NAPSA ceiling
  const effectivePay = Math.min(grossPay, ceiling);
  return effectivePay * 0.05;
};

export const PayrollRunModal = ({
  isOpen,
  onClose,
  employees,
  onSuccess,
  selectedMonth,
}: PayrollRunModalProps) => {
  const [loading, setLoading] = useState(false);
  const { tenantId } = useTenant();
  const [entries, setEntries] = useState<PayrollEntry[]>(() =>
    employees.map((emp) => ({
      employee_id: emp.id,
      selected: true,
      pay_type: emp.pay_type || "monthly",
      basic_salary: emp.base_salary_zmw || 0,
      hourly_rate: emp.hourly_rate || 0,
      hours_worked: 0,
      shifts_worked: 0,
      shift_rate: emp.shift_rate || 0,
      allowances: 0,
      overtime_pay: 0,
      bonus: 0,
      loan_deduction: 0,
      other_deductions: 0,
    }))
  );

  const updateEntry = (id: string, field: keyof PayrollEntry, value: number | boolean | string) => {
    setEntries((prev) =>
      prev.map((e) => (e.employee_id === id ? { ...e, [field]: value } : e))
    );
  };

  const calculateTotals = (entry: PayrollEntry) => {
    let basePay = 0;
    
    // Calculate base pay based on pay type
    if (entry.pay_type === "hourly") {
      basePay = entry.hourly_rate * entry.hours_worked;
    } else if (entry.pay_type === "per_shift") {
      basePay = entry.shift_rate * entry.shifts_worked;
    } else if (entry.pay_type === "daily") {
      // For daily, hours_worked represents days worked
      basePay = entry.hourly_rate * entry.hours_worked; // Reusing hourly_rate as daily_rate
    } else {
      basePay = entry.basic_salary;
    }
    
    const gross = basePay + entry.allowances + entry.overtime_pay + entry.bonus;
    const napsa = calculateNAPSA(gross);
    const paye = calculatePAYE(gross - napsa);
    const totalDeductions = napsa + paye + entry.loan_deduction + entry.other_deductions;
    const net = gross - totalDeductions;
    return { basePay, gross, napsa, paye, totalDeductions, net };
  };

  const handleSubmit = async () => {
    const selectedEntries = entries.filter((e) => e.selected);
    if (selectedEntries.length === 0) {
      toast.error("Select at least one employee");
      return;
    }
    
    if (!tenantId) {
      toast.error("Unable to determine your organization. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      const monthDate = new Date(selectedMonth + "-01");
      const payPeriodStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const payPeriodEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

      const payrollRecords = selectedEntries.map((entry) => {
        const { basePay, gross, napsa, paye, totalDeductions, net } = calculateTotals(entry);
        return {
          employee_id: entry.employee_id,
          employee_type: "employee",
          pay_period_start: payPeriodStart,
          pay_period_end: payPeriodEnd,
          basic_salary: entry.pay_type === "monthly" ? entry.basic_salary : 0,
          shift_pay: entry.pay_type !== "monthly" ? basePay : 0,
          hours_worked: entry.hours_worked,
          shifts_worked: entry.shifts_worked,
          hourly_rate: entry.hourly_rate,
          allowances: entry.allowances,
          overtime_pay: entry.overtime_pay,
          bonus: entry.bonus,
          napsa_deduction: napsa,
          paye_deduction: paye,
          other_deductions: entry.other_deductions,
          loan_deduction: entry.loan_deduction,
          gross_pay: gross,
          total_deductions: totalDeductions,
          net_pay: net,
          status: "draft",
          tenant_id: tenantId,
        };
      });

      const { error } = await supabase.from("payroll_records").insert(payrollRecords);
      if (error) throw error;

      toast.success(`Payroll generated for ${selectedEntries.length} employees`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error running payroll:", error);
      toast.error("Failed to run payroll");
    } finally {
      setLoading(false);
    }
  };

  const employeeMap = new Map(employees.map((e) => [e.id, { name: e.full_name, pay_type: e.pay_type || "monthly" }]));

  const grandTotals = entries
    .filter((e) => e.selected)
    .reduce(
      (acc, entry) => {
        const { gross, napsa, paye, totalDeductions, net } = calculateTotals(entry);
        return {
          gross: acc.gross + gross,
          napsa: acc.napsa + napsa,
          paye: acc.paye + paye,
          deductions: acc.deductions + totalDeductions,
          net: acc.net + net,
        };
      },
      { gross: 0, napsa: 0, paye: 0, deductions: 0, net: 0 }
    );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Run Payroll - {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p>
              <strong>NAPSA:</strong> 5% of gross (ceiling: K26,055) |{" "}
              <strong>PAYE:</strong> Progressive tax brackets applied |{" "}
              <strong>Shift Pay:</strong> Enter hours/shifts for non-monthly workers
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Employee</TableHead>
                <TableHead className="w-20">Pay Type</TableHead>
                <TableHead className="w-24">Rate/Salary</TableHead>
                <TableHead className="w-20">Hrs/Shifts</TableHead>
                <TableHead className="w-20">Allowances</TableHead>
                <TableHead className="w-20">Overtime</TableHead>
                <TableHead className="w-20">Loans</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const { gross, net } = calculateTotals(entry);
                const empInfo = employeeMap.get(entry.employee_id);
                const payTypeLabels: Record<string, string> = {
                  monthly: "Monthly",
                  hourly: "Hourly",
                  daily: "Daily",
                  per_shift: "Per Shift",
                };
                return (
                  <TableRow key={entry.employee_id}>
                    <TableCell>
                      <Checkbox
                        checked={entry.selected}
                        onCheckedChange={(checked) =>
                          updateEntry(entry.employee_id, "selected", !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {empInfo?.name}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded ${
                        entry.pay_type === "monthly" ? "bg-blue-100 text-blue-700" :
                        entry.pay_type === "hourly" ? "bg-green-100 text-green-700" :
                        entry.pay_type === "per_shift" ? "bg-purple-100 text-purple-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {payTypeLabels[entry.pay_type] || "Monthly"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {entry.pay_type === "monthly" ? (
                        <Input
                          type="number"
                          value={entry.basic_salary}
                          onChange={(e) =>
                            updateEntry(entry.employee_id, "basic_salary", parseFloat(e.target.value) || 0)
                          }
                          className="h-8 w-20"
                        />
                      ) : entry.pay_type === "hourly" ? (
                        <Input
                          type="number"
                          value={entry.hourly_rate}
                          onChange={(e) =>
                            updateEntry(entry.employee_id, "hourly_rate", parseFloat(e.target.value) || 0)
                          }
                          className="h-8 w-20"
                          placeholder="K/hr"
                        />
                      ) : (
                        <Input
                          type="number"
                          value={entry.shift_rate}
                          onChange={(e) =>
                            updateEntry(entry.employee_id, "shift_rate", parseFloat(e.target.value) || 0)
                          }
                          className="h-8 w-20"
                          placeholder="K/shift"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.pay_type !== "monthly" && (
                        entry.pay_type === "per_shift" ? (
                          <Input
                            type="number"
                            value={entry.shifts_worked}
                            onChange={(e) =>
                              updateEntry(entry.employee_id, "shifts_worked", parseInt(e.target.value) || 0)
                            }
                            className="h-8 w-16"
                            placeholder="Shifts"
                          />
                        ) : (
                          <Input
                            type="number"
                            value={entry.hours_worked}
                            onChange={(e) =>
                              updateEntry(entry.employee_id, "hours_worked", parseFloat(e.target.value) || 0)
                            }
                            className="h-8 w-16"
                            placeholder="Hours"
                          />
                        )
                      )}
                      {entry.pay_type === "monthly" && <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={entry.allowances}
                        onChange={(e) =>
                          updateEntry(entry.employee_id, "allowances", parseFloat(e.target.value) || 0)
                        }
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={entry.overtime_pay}
                        onChange={(e) =>
                          updateEntry(entry.employee_id, "overtime_pay", parseFloat(e.target.value) || 0)
                        }
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={entry.loan_deduction}
                        onChange={(e) =>
                          updateEntry(entry.employee_id, "loan_deduction", parseFloat(e.target.value) || 0)
                        }
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">K{gross.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-primary">K{net.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="bg-primary/5 p-4 rounded-lg">
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-sm text-muted-foreground">Total Gross</div>
                <div className="text-lg font-bold">K{grandTotals.gross.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">NAPSA</div>
                <div className="text-lg font-bold text-orange-600">K{grandTotals.napsa.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">PAYE</div>
                <div className="text-lg font-bold text-purple-600">K{grandTotals.paye.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Deductions</div>
                <div className="text-lg font-bold text-red-600">K{grandTotals.deductions.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Net Pay</div>
                <div className="text-lg font-bold text-primary">K{grandTotals.net.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Payroll
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
