import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Users, Briefcase, Car, Sparkles, Edit, Trash2, Phone, Mail, Loader2, Clock, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { EmployeeModal } from "./EmployeeModal";
import { useAuth } from "@/hooks/useAuth";

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

const employeeTypeIcons: Record<string, React.ReactNode> = {
  driver: <Car className="h-4 w-4" />,
  cleaner: <Sparkles className="h-4 w-4" />,
  security: <Users className="h-4 w-4" />,
  office_staff: <Briefcase className="h-4 w-4" />,
  part_time: <Clock className="h-4 w-4" />,
  temporary: <Calendar className="h-4 w-4" />,
  contract: <FileText className="h-4 w-4" />,
};

const employeeTypeLabels: Record<string, string> = {
  driver: "Driver",
  cleaner: "Cleaner",
  security: "Security",
  office_staff: "Office Staff",
  part_time: "Part-Time",
  temporary: "Temporary",
  contract: "Contract",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  on_leave: "bg-yellow-100 text-yellow-800",
  terminated: "bg-red-100 text-red-800",
};

export const EmployeeManager = () => {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("full_name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
      toast.success("Employee deleted");
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Failed to delete employee");
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || emp.employee_type === filterType;
    const matchesStatus = filterStatus === "all" || emp.employment_status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const typeCounts = {
    total: employees.length,
    driver: employees.filter((e) => e.employee_type === "driver").length,
    cleaner: employees.filter((e) => e.employee_type === "cleaner").length,
    security: employees.filter((e) => e.employee_type === "security").length,
    office_staff: employees.filter((e) => e.employee_type === "office_staff").length,
    part_time: employees.filter((e) => e.employee_type === "part_time").length,
    temporary: employees.filter((e) => e.employee_type === "temporary").length,
    contract: employees.filter((e) => e.employee_type === "contract").length,
  };

  const fullTimeTypes = ["driver", "cleaner", "security", "office_staff"];
  const contractTypes = ["part_time", "temporary", "contract"];

  const fullTimeEmployees = filteredEmployees.filter((e) => fullTimeTypes.includes(e.employee_type));
  const contractEmployees = filteredEmployees.filter((e) => contractTypes.includes(e.employee_type));

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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-primary">{typeCounts.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-blue-600">{typeCounts.driver}</div>
            <div className="text-xs text-muted-foreground">Drivers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-purple-600">{typeCounts.cleaner}</div>
            <div className="text-xs text-muted-foreground">Cleaners</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-orange-600">{typeCounts.security}</div>
            <div className="text-xs text-muted-foreground">Security</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-green-600">{typeCounts.office_staff}</div>
            <div className="text-xs text-muted-foreground">Office</div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-amber-600">{typeCounts.part_time}</div>
            <div className="text-xs text-muted-foreground">Part-Time</div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-cyan-600">{typeCounts.temporary}</div>
            <div className="text-xs text-muted-foreground">Temporary</div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-pink-600">{typeCounts.contract}</div>
            <div className="text-xs text-muted-foreground">Contract</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="driver">Drivers</SelectItem>
              <SelectItem value="cleaner">Cleaners</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="office_staff">Office Staff</SelectItem>
              <SelectItem value="part_time">Part-Time</SelectItem>
              <SelectItem value="temporary">Temporary</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setSelectedEmployee(null); setIsModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Employee Tabs */}
      <Tabs defaultValue="full-time" className="space-y-4">
        <TabsList>
          <TabsTrigger value="full-time" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Full-Time Staff ({fullTimeEmployees.length})
          </TabsTrigger>
          <TabsTrigger value="contract" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contract/Part-Time ({contractEmployees.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="full-time">
          <EmployeeGrid
            employees={fullTimeEmployees}
            getInitials={getInitials}
            statusColors={statusColors}
            onEdit={(emp) => { setSelectedEmployee(emp); setIsModalOpen(true); }}
            onDelete={handleDelete}
            isAdmin={isAdmin}
            emptyMessage="No full-time employees found. Add drivers, cleaners, security, or office staff."
          />
        </TabsContent>

        <TabsContent value="contract">
          <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              <FileText className="h-4 w-4 inline mr-2" />
              Manage part-time workers, temporary staff, and task-based contractors here.
            </p>
          </div>
          <EmployeeGrid
            employees={contractEmployees}
            getInitials={getInitials}
            statusColors={statusColors}
            onEdit={(emp) => { setSelectedEmployee(emp); setIsModalOpen(true); }}
            onDelete={handleDelete}
            isAdmin={isAdmin}
            emptyMessage="No contract or part-time employees found. Add temporary, part-time, or contract workers."
          />
        </TabsContent>
      </Tabs>

      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedEmployee(null); }}
        employee={selectedEmployee}
        onSuccess={fetchEmployees}
      />
    </div>
  );
};

// Extracted grid component for reuse
interface EmployeeGridProps {
  employees: Employee[];
  getInitials: (name: string) => string;
  statusColors: Record<string, string>;
  onEdit: (emp: Employee) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  emptyMessage: string;
}

const EmployeeGrid = ({ employees, getInitials, statusColors, onEdit, onDelete, isAdmin, emptyMessage }: EmployeeGridProps) => {
  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {employees.map((employee) => (
        <Card key={employee.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={employee.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(employee.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{employee.full_name}</h3>
                  <Badge className={statusColors[employee.employment_status] || "bg-gray-100"}>
                    {employee.employment_status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  {employeeTypeIcons[employee.employee_type]}
                  <span>{employee.job_title || employeeTypeLabels[employee.employee_type]}</span>
                </div>
                {employee.department && (
                  <div className="text-xs text-muted-foreground mb-2">{employee.department}</div>
                )}
                {employee.termination_date && (
                  <div className="text-xs text-amber-600 mb-2">
                    Contract ends: {new Date(employee.termination_date).toLocaleDateString()}
                  </div>
                )}
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {employee.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  {employee.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">
                    K{employee.base_salary_zmw.toLocaleString()}/mo
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(employee)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onDelete(employee.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
