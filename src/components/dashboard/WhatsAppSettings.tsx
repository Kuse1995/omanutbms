import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useBranch } from "@/hooks/useBranch";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, Plus, Trash2, Phone, Loader2, 
  Crown, UserCog, Calculator, Users, ShoppingCart, Banknote, Eye, Wrench,
  Check, X
} from "lucide-react";
import { format } from "date-fns";

interface WhatsAppMapping {
  id: string;
  tenant_id: string;
  user_id: string;
  whatsapp_number: string;
  display_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  last_used_at: string | null;
  created_at: string;
  employee_id?: string | null;
  branch_id?: string | null;
}

interface TenantUser {
  user_id: string;
  role: string;
  profiles: { full_name: string | null } | null;
}

interface Employee {
  id: string;
  full_name: string;
  department: string | null;
}

// WhatsApp-specific role configurations with permissions
const whatsappRoles = {
  admin: {
    label: "Admin",
    icon: Crown,
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
    description: "Full access to all WhatsApp functions",
    canDo: [
      "Record sales and generate receipts",
      "Check stock and list products",
      "Generate invoices and record expenses",
      "View team attendance and approve time",
      "Access all sales summaries and reports",
      "Manage pending orders and low stock alerts"
    ],
    cannotDo: []
  },
  manager: {
    label: "Manager",
    icon: UserCog,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    description: "Full access to all WhatsApp functions",
    canDo: [
      "Record sales and generate receipts",
      "Check stock and list products",
      "Generate invoices and record expenses",
      "View team attendance and approve time",
      "Access all sales summaries and reports",
      "Manage pending orders and low stock alerts"
    ],
    cannotDo: []
  },
  accountant: {
    label: "Accountant",
    icon: Calculator,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200",
    description: "Invoices, expenses, and financial data",
    canDo: [
      "Generate invoices and record expenses",
      "View sales summaries and reports",
      "Clock in/out and view own attendance",
      "View own payslip information"
    ],
    cannotDo: [
      "Record sales transactions",
      "View or manage team attendance",
      "Update order statuses"
    ]
  },
  hr_manager: {
    label: "HR Manager",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
    description: "Team attendance and HR functions",
    canDo: [
      "View team attendance records",
      "View sales summaries for reporting",
      "Clock in/out and view own schedule",
      "View assigned tasks and schedule"
    ],
    cannotDo: [
      "Record sales or expenses",
      "Generate invoices",
      "Manage inventory or stock"
    ]
  },
  sales_rep: {
    label: "Sales Rep",
    icon: ShoppingCart,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 border-cyan-200",
    description: "Sales, stock checks, and customers",
    canDo: [
      "Record sales and generate receipts",
      "Check stock and list products",
      "Look up customer information",
      "Clock in/out with attendance",
      "View own tasks and schedule"
    ],
    cannotDo: [
      "Record expenses",
      "Generate invoices",
      "View team attendance",
      "Access financial reports"
    ]
  },
  cashier: {
    label: "Cashier",
    icon: Banknote,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
    description: "Sales recording and stock checks only",
    canDo: [
      "Record sales and generate receipts",
      "Check stock levels",
      "Clock in/out with attendance"
    ],
    cannotDo: [
      "Record expenses or generate invoices",
      "View sales summaries or reports",
      "Access team attendance",
      "Manage orders or customers"
    ]
  },
  staff: {
    label: "Staff/Production",
    icon: Wrench,
    color: "text-slate-600",
    bgColor: "bg-slate-50 border-slate-200",
    description: "Tasks, production, and attendance",
    canDo: [
      "View assigned tasks and orders",
      "Update order/production status",
      "Clock in/out with location verification",
      "View own schedule and attendance"
    ],
    cannotDo: [
      "Record sales or expenses",
      "Access financial data",
      "View team information",
      "Generate invoices or receipts"
    ]
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "text-gray-600",
    bgColor: "bg-gray-50 border-gray-200",
    description: "Read-only access to dashboards",
    canDo: [
      "View sales summaries (limited)",
      "Check stock levels"
    ],
    cannotDo: [
      "Record any transactions",
      "Modify any data",
      "Access team or HR functions",
      "Generate documents"
    ]
  }
};

type WhatsAppRoleKey = keyof typeof whatsappRoles;

export function WhatsAppSettings() {
  const { tenantId } = useTenant();
  const { branches, isMultiBranchEnabled } = useBranch();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMapping, setNewMapping] = useState({
    user_id: "",
    whatsapp_number: "+260",
    display_name: "",
    role: "viewer" as WhatsAppRoleKey,
    employee_id: "",
    branch_id: "",
  });

  // Fetch WhatsApp mappings
  const { data: mappings, isLoading } = useQuery({
    queryKey: ["whatsapp-mappings", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("whatsapp_user_mappings")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WhatsAppMapping[];
    },
    enabled: !!tenantId,
  });

  // Fetch tenant users for dropdown
  const { data: tenantUsers } = useQuery({
    queryKey: ["tenant-users", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data: users, error } = await supabase
        .from("tenant_users")
        .select("user_id, role")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      
      const userIds = users.map(u => u.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      
      return users.map(u => ({
        user_id: u.user_id,
        role: u.role,
        profiles: profiles?.find(p => p.user_id === u.user_id) || null,
      })) as TenantUser[];
    },
    enabled: !!tenantId,
  });

  // Fetch employees for linking
  const { data: employees } = useQuery({
    queryKey: ["employees-for-whatsapp", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, department")
        .eq("tenant_id", tenantId)
        .order("full_name");
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!tenantId,
  });

  // Add mapping mutation
  const addMutation = useMutation({
    mutationFn: async (mapping: typeof newMapping) => {
      const insertData: any = {
        tenant_id: tenantId,
        user_id: mapping.user_id,
        whatsapp_number: mapping.whatsapp_number,
        display_name: mapping.display_name,
        role: mapping.role,
        created_by: user?.id,
      };
      
      // Only add employee_id if selected
      if (mapping.employee_id) {
        insertData.employee_id = mapping.employee_id;
      }
      
      // Only add branch_id if multi-branch and selected
      if (isMultiBranchEnabled && mapping.branch_id) {
        insertData.branch_id = mapping.branch_id;
      }
      
      const { error } = await supabase.from("whatsapp_user_mappings").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-mappings"] });
      setIsAddModalOpen(false);
      setNewMapping({ user_id: "", whatsapp_number: "+260", display_name: "", role: "viewer", employee_id: "", branch_id: "" });
      toast({ title: "Success", description: "WhatsApp number added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add WhatsApp number.", variant: "destructive" });
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_user_mappings")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-mappings"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_user_mappings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-mappings"] });
      toast({ title: "Deleted", description: "WhatsApp mapping removed." });
    },
  });

  const handleUserSelect = (userId: string) => {
    const selectedUser = tenantUsers?.find((u) => u.user_id === userId);
    // Map BMS role to closest WhatsApp role
    const bmsRole = selectedUser?.role || "viewer";
    const mappedRole = (Object.keys(whatsappRoles).includes(bmsRole) ? bmsRole : "viewer") as WhatsAppRoleKey;
    
    setNewMapping({
      ...newMapping,
      user_id: userId,
      display_name: selectedUser?.profiles?.full_name || "",
      role: mappedRole,
    });
  };

  const selectedRoleConfig = whatsappRoles[newMapping.role];
  const RoleIcon = selectedRoleConfig?.icon || Eye;

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="p-3 rounded-full bg-primary/10">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">WhatsApp Business Integration</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your team can message the Omanut BMS WhatsApp number to record sales, check stock, and manage your business on the go.
              Each role has specific permissions for what they can do via WhatsApp.
            </p>
            <div className="mt-3 p-3 bg-background rounded-lg border">
              <p className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                WhatsApp Number: <span className="text-primary">Contact admin@omanut.co for setup</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mappings Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Registered Phone Numbers</CardTitle>
            <CardDescription>Team members who can access BMS via WhatsApp</CardDescription>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Phone
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mappings && mappings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => {
                  const roleConfig = whatsappRoles[mapping.role as WhatsAppRoleKey] || whatsappRoles.viewer;
                  const MappingRoleIcon = roleConfig.icon;
                  return (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-mono">{mapping.whatsapp_number}</TableCell>
                      <TableCell>{mapping.display_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize gap-1 ${roleConfig.bgColor}`}>
                          <MappingRoleIcon className={`h-3 w-3 ${roleConfig.color}`} />
                          {roleConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={mapping.is_active}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: mapping.id, is_active: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {mapping.last_used_at ? format(new Date(mapping.last_used_at), "MMM d, HH:mm") : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(mapping.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No phone numbers registered yet.</p>
              <p className="text-sm">Add team members to enable WhatsApp access.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add WhatsApp Number</DialogTitle>
            <DialogDescription>Link a team member's WhatsApp number to access BMS</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Team Member Selection */}
            <div className="space-y-2">
              <Label>Team Member</Label>
              <Select value={newMapping.user_id} onValueChange={handleUserSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {tenantUsers?.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.profiles?.full_name || "Unnamed User"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Link to Employee (Optional) */}
            <div className="space-y-2">
              <Label>Link to Employee Record <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select value={newMapping.employee_id} onValueChange={(v) => setNewMapping({ ...newMapping, employee_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee for tasks/attendance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No employee link</SelectItem>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.department && `(${emp.department})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link to enable my_tasks, my_pay, and attendance features
              </p>
            </div>

            {/* Branch Assignment (if multi-branch) */}
            {isMultiBranchEnabled && branches && branches.length > 1 && (
              <div className="space-y-2">
                <Label>Branch Assignment <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select value={newMapping.branch_id} onValueChange={(v) => setNewMapping({ ...newMapping, branch_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Scope sales and inventory queries to a specific branch
                </p>
              </div>
            )}

            {/* WhatsApp Number */}
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input
                value={newMapping.whatsapp_number}
                onChange={(e) => setNewMapping({ ...newMapping, whatsapp_number: e.target.value })}
                placeholder="+260971234567"
              />
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={newMapping.display_name}
                onChange={(e) => setNewMapping({ ...newMapping, display_name: e.target.value })}
                placeholder="John Mwanza"
              />
            </div>

            {/* Role Selection with Icon */}
            <div className="space-y-2">
              <Label>WhatsApp Role</Label>
              <Select value={newMapping.role} onValueChange={(v) => setNewMapping({ ...newMapping, role: v as WhatsAppRoleKey })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(whatsappRoles).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span>{config.label}</span>
                          <span className="text-muted-foreground text-xs">- {config.description}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Role Permission Preview */}
            {selectedRoleConfig && (
              <div className={`p-4 rounded-lg border ${selectedRoleConfig.bgColor}`}>
                <div className="flex items-center gap-2 mb-3">
                  <RoleIcon className={`h-5 w-5 ${selectedRoleConfig.color}`} />
                  <span className="font-medium">{selectedRoleConfig.label} Permissions</span>
                </div>
                
                {selectedRoleConfig.canDo.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-green-700 mb-1">Can do via WhatsApp:</p>
                    <ul className="space-y-1">
                      {selectedRoleConfig.canDo.map((item, i) => (
                        <li key={i} className="text-xs flex items-start gap-1.5">
                          <Check className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {selectedRoleConfig.cannotDo.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-700 mb-1">Cannot do:</p>
                    <ul className="space-y-1">
                      {selectedRoleConfig.cannotDo.map((item, i) => (
                        <li key={i} className="text-xs flex items-start gap-1.5 text-muted-foreground">
                          <X className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate(newMapping)} disabled={!newMapping.user_id || !newMapping.whatsapp_number || addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
