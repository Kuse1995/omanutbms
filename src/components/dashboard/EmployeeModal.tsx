import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useBranch } from "@/hooks/useBranch";
import { EmployeeAccessSection, type EmployeeAccessState } from "./EmployeeAccessSection";
import { useEmployeeAccess } from "@/hooks/useEmployeeAccess";

interface Employee {
  id: string;
  full_name: string;
  employee_type: string;
  department: string | null;
  job_title: string | null;
  employment_status: string;
  hire_date: string;
  termination_date: string | null;
  base_salary_zmw: number;
  pay_type: string;
  hourly_rate: number;
  daily_rate: number;
  shift_rate: number;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  nrc_number: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess: () => void;
}

const initialAccessState: EmployeeAccessState = {
  bmsAccessEnabled: false,
  bmsEmail: "",
  bmsRole: "viewer",
  bmsBranchId: null,
  existingAuthorizedEmailId: null,
  whatsappEnabled: false,
  whatsappNumber: "",
  whatsappRole: "staff",
  whatsappSelfService: true,
  existingWhatsappMappingId: null,
};

export const EmployeeModal = ({ isOpen, onClose, employee, onSuccess }: EmployeeModalProps) => {
  const [loading, setLoading] = useState(false);
  const { tenantId } = useTenant();
  const { currentBranch, isMultiBranchEnabled } = useBranch();
  const { saveEmployeeAccess } = useEmployeeAccess();
  const [accessState, setAccessState] = useState<EmployeeAccessState>(initialAccessState);
  const [formData, setFormData] = useState({
    full_name: "",
    employee_type: "office_staff",
    department: "",
    job_title: "",
    employment_status: "active",
    hire_date: new Date().toISOString().split("T")[0],
    termination_date: "",
    base_salary_zmw: 0,
    pay_type: "monthly" as "monthly" | "hourly" | "daily" | "per_shift",
    hourly_rate: 0,
    daily_rate: 0,
    shift_rate: 0,
    phone: "",
    email: "",
    nrc_number: "",
    address: "",
    bank_name: "",
    bank_account_number: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name,
        employee_type: employee.employee_type,
        department: employee.department || "",
        job_title: employee.job_title || "",
        employment_status: employee.employment_status,
        hire_date: employee.hire_date,
        termination_date: employee.termination_date || "",
        base_salary_zmw: employee.base_salary_zmw,
        pay_type: (employee.pay_type || "monthly") as "monthly" | "hourly" | "daily" | "per_shift",
        hourly_rate: employee.hourly_rate || 0,
        daily_rate: employee.daily_rate || 0,
        shift_rate: employee.shift_rate || 0,
        phone: employee.phone || "",
        email: employee.email || "",
        nrc_number: employee.nrc_number || "",
        address: employee.address || "",
        bank_name: employee.bank_name || "",
        bank_account_number: employee.bank_account_number || "",
        emergency_contact_name: employee.emergency_contact_name || "",
        emergency_contact_phone: employee.emergency_contact_phone || "",
        notes: employee.notes || "",
      });
    } else {
      setFormData({
        full_name: "",
        employee_type: "office_staff",
        department: "",
        job_title: "",
        employment_status: "active",
        hire_date: new Date().toISOString().split("T")[0],
        termination_date: "",
        base_salary_zmw: 0,
        pay_type: "monthly",
        hourly_rate: 0,
        daily_rate: 0,
        shift_rate: 0,
        phone: "",
        email: "",
        nrc_number: "",
        address: "",
        bank_name: "",
        bank_account_number: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        notes: "",
      });
      // Reset access state for new employee
      setAccessState(initialAccessState);
    }
  }, [employee, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error("Employee name is required");
      return;
    }
    
    if (!tenantId) {
      toast.error("Unable to determine your organization. Please log in again.");
      return;
    }

    // Validate access fields if enabled
    if (accessState.bmsAccessEnabled && !accessState.bmsEmail) {
      toast.error("BMS login email is required when BMS access is enabled");
      return;
    }
    if (accessState.whatsappEnabled && !accessState.whatsappNumber) {
      toast.error("WhatsApp number is required when WhatsApp access is enabled");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        ...formData,
        department: formData.department || null,
        job_title: formData.job_title || null,
        termination_date: formData.termination_date || null,
        phone: formData.phone || null,
        email: formData.email || null,
        nrc_number: formData.nrc_number || null,
        address: formData.address || null,
        bank_name: formData.bank_name || null,
        bank_account_number: formData.bank_account_number || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        notes: formData.notes || null,
        tenant_id: tenantId,
      };

      // Assign to current branch if multi-branch is enabled and we're creating a new employee
      if (!employee && isMultiBranchEnabled && currentBranch) {
        payload.branch_id = currentBranch.id;
      }

      let savedEmployeeId: string;

      if (employee) {
        const { error } = await supabase
          .from("employees")
          .update(payload)
          .eq("id", employee.id);
        if (error) throw error;
        savedEmployeeId = employee.id;
      } else {
        const { data, error } = await supabase
          .from("employees")
          .insert([payload as any])
          .select()
          .single();
        if (error) throw error;
        savedEmployeeId = data.id;
      }

      // Save access settings
      const accessSuccess = await saveEmployeeAccess({
        employeeId: savedEmployeeId,
        employeeName: formData.full_name,
        tenantId,
        accessState,
      });

      if (!accessSuccess) {
        toast.warning("Employee saved but some access settings may not have been applied");
      } else {
        toast.success(employee ? "Employee updated" : "Employee added");
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving employee:", error);
      toast.error("Failed to save employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="nrc_number">NRC Number</Label>
                <Input
                  id="nrc_number"
                  value={formData.nrc_number}
                  onChange={(e) => setFormData({ ...formData, nrc_number: e.target.value })}
                  placeholder="e.g., 123456/78/1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+260..."
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Employment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employee_type">Employee Type</Label>
                <Select
                  value={formData.employee_type}
                  onValueChange={(value) => setFormData({ ...formData, employee_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="cleaner">Cleaner</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="office_staff">Office Staff</SelectItem>
                    <SelectItem value="part_time">Part-Time</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="employment_status">Status</Label>
                <Select
                  value={formData.employment_status}
                  onValueChange={(value) => setFormData({ ...formData, employment_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="e.g., Senior Driver"
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Operations"
                />
              </div>
              <div>
                <Label htmlFor="hire_date">Hire/Start Date</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="termination_date">Contract End Date</Label>
                <Input
                  id="termination_date"
                  type="date"
                  value={formData.termination_date}
                  onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
                  placeholder="Leave empty for permanent"
                />
              </div>
              <div>
                <Label htmlFor="pay_type">Pay Type</Label>
                <Select
                  value={formData.pay_type}
                  onValueChange={(value) => setFormData({ ...formData, pay_type: value as "monthly" | "hourly" | "daily" | "per_shift" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly Salary</SelectItem>
                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                    <SelectItem value="daily">Daily Rate</SelectItem>
                    <SelectItem value="per_shift">Per Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.pay_type === "monthly" && (
                <div>
                  <Label htmlFor="base_salary_zmw">Monthly Salary (ZMW)</Label>
                  <Input
                    id="base_salary_zmw"
                    type="number"
                    min="0"
                    value={formData.base_salary_zmw}
                    onChange={(e) => setFormData({ ...formData, base_salary_zmw: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
              {formData.pay_type === "hourly" && (
                <div>
                  <Label htmlFor="hourly_rate">Hourly Rate (ZMW)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
              {formData.pay_type === "daily" && (
                <div>
                  <Label htmlFor="daily_rate">Daily Rate (ZMW)</Label>
                  <Input
                    id="daily_rate"
                    type="number"
                    min="0"
                    value={formData.daily_rate}
                    onChange={(e) => setFormData({ ...formData, daily_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
              {formData.pay_type === "per_shift" && (
                <div>
                  <Label htmlFor="shift_rate">Per-Shift Rate (ZMW)</Label>
                  <Input
                    id="shift_rate"
                    type="number"
                    min="0"
                    value={formData.shift_rate}
                    onChange={(e) => setFormData({ ...formData, shift_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Banking Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Banking Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="e.g., Zanaco"
                />
              </div>
              <div>
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  placeholder="Account number"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  placeholder="+260..."
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          {/* Access & Integration Section */}
          {tenantId && (
            <EmployeeAccessSection
              employeeId={employee?.id || null}
              employeeEmail={formData.email}
              employeePhone={formData.phone}
              tenantId={tenantId}
              accessState={accessState}
              onAccessStateChange={setAccessState}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {employee ? "Update" : "Add"} Employee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
