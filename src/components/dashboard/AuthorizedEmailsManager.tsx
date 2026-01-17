import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useBranch, Branch } from "@/hooks/useBranch";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Mail, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Users,
  Crown,
  UserCog,
  Eye,
  Building2
} from "lucide-react";
import { z } from "zod";

type AppRole = "admin" | "manager" | "viewer";

interface AuthorizedEmail {
  id: string;
  email: string;
  added_by: string | null;
  created_at: string;
  notes: string | null;
  default_role: AppRole;
  branch_id: string | null;
}

const emailSchema = z.string().email("Please enter a valid email address");

const roleConfig: Record<AppRole, { label: string; icon: typeof Crown; color: string; bgColor: string }> = {
  admin: { label: "Admin", icon: Crown, color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200" },
  manager: { label: "Manager", icon: UserCog, color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200" },
  viewer: { label: "Viewer", icon: Eye, color: "text-slate-600", bgColor: "bg-slate-50 border-slate-200" },
};

export function AuthorizedEmailsManager() {
  const [emails, setEmails] = useState<AuthorizedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("viewer");
  const [newBranchId, setNewBranchId] = useState<string>("all");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const { tenantId, loading: tenantLoading } = useTenant();
  const { branches, isMultiBranchEnabled } = useBranch();
  const { toast } = useToast();

  // Super admin email that can see all authorized emails
  const SUPER_ADMIN_EMAIL = "abkanyanta@gmail.com";
  const isSuperAdminUser = user?.email === SUPER_ADMIN_EMAIL;

  console.log("AuthorizedEmailsManager auth state", { userId: user?.id, email: user?.email, isAdmin, isSuperAdmin, isSuperAdminUser, tenantId, authLoading, roleSource: "authorized_emails_fallback_enabled" });

  useEffect(() => {
    if (tenantId || isSuperAdminUser) {
      fetchEmails();
    }
  }, [tenantId, isSuperAdminUser]);

  // Helper to get branch name
  const getBranchName = (branchId: string | null): string => {
    if (!branchId) return "All Branches";
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || "Unknown";
  };

  const fetchEmails = async () => {
    setLoading(true);
    
    // Regular tenant admins should only see their tenant's emails
    // Super admin sees all emails across all tenants
    if (!isSuperAdminUser && !tenantId) {
      setEmails([]);
      setLoading(false);
      return;
    }

    try {
      let data: AuthorizedEmail[] = [];
      
      if (isSuperAdminUser) {
        // Super admin sees all emails
        const { data: allEmails, error } = await supabase
          .from("authorized_emails")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        data = allEmails || [];
      } else {
        // Regular tenant admins ONLY see their tenant's emails
        const { data: tenantEmails, error } = await supabase
          .from("authorized_emails")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        data = tenantEmails || [];
      }
      
      setEmails(data);
    } catch (error) {
      console.error("Error fetching authorized emails:", error);
      toast({
        title: "Error",
        description: "Failed to load authorized emails",
        variant: "destructive",
      });
      setEmails([]);
    }
    setLoading(false);
  };


  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = emailSchema.safeParse(newEmail.trim());
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    // Check if email already exists
    if (emails.some(e => e.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      setError("This email is already authorized");
      return;
    }

    setIsAdding(true);
    const { error } = await supabase
      .from("authorized_emails")
      .insert({
        email: newEmail.trim().toLowerCase(),
        notes: newNotes.trim() || null,
        added_by: user?.id,
        default_role: newRole,
        tenant_id: tenantId,
        branch_id: newBranchId === "all" ? null : newBranchId,
      });

    if (error) {
      console.error("Error adding email:", error);
      toast({
        title: "Error",
        description: error.message.includes("duplicate") 
          ? "This email is already authorized" 
          : "Failed to add email",
        variant: "destructive",
      });
    } else {
      const branchInfo = newBranchId === "all" ? "all branches" : getBranchName(newBranchId);
      toast({
        title: "Email Added",
        description: `${newEmail} can now access the BMS as ${roleConfig[newRole].label} (${branchInfo})`,
      });
      setNewEmail("");
      setNewNotes("");
      setNewRole("viewer");
      setNewBranchId("all");
      fetchEmails();
    }
    setIsAdding(false);
  };

  const handleUpdateBranch = async (id: string, branchId: string) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("authorized_emails")
      .update({ branch_id: branchId === "all" ? null : branchId })
      .eq("id", id);

    if (error) {
      console.error("Error updating branch:", error);
      toast({
        title: "Error",
        description: "Failed to update branch assignment",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Branch Updated",
        description: `Branch assignment updated to ${branchId === "all" ? "All Branches" : getBranchName(branchId)}`,
      });
      fetchEmails();
    }
    setUpdatingId(null);
  };

  const handleUpdateRole = async (id: string, newRole: AppRole) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("authorized_emails")
      .update({ default_role: newRole })
      .eq("id", id);

    if (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Role Updated",
        description: `Role changed to ${roleConfig[newRole].label}`,
      });
      fetchEmails();
    }
    setUpdatingId(null);
  };

  const handleDeleteEmail = async (id: string, email: string) => {
    // Prevent deleting the last admin email
    if (emails.length <= 1) {
      toast({
        title: "Cannot Remove",
        description: "You must keep at least one authorized email",
        variant: "destructive",
      });
      return;
    }

    setDeletingId(id);
    const { error } = await supabase
      .from("authorized_emails")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting email:", error);
      toast({
        title: "Error",
        description: "Failed to remove email",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email Removed",
        description: `${email} can no longer access the BMS`,
      });
      fetchEmails();
    }
    setDeletingId(null);
  };

  if (authLoading || tenantLoading) {
    return (
      <Card className="bg-white border-[#004B8D]/10 shadow-sm">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 text-[#004B8D]/30 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold text-[#003366] mb-2">Loading...</h3>
          <p className="text-[#004B8D]/60">Checking your access permissions.</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="bg-white border-[#004B8D]/10 shadow-sm">
        <CardContent className="py-12 text-center">
          <Shield className="w-12 h-12 text-[#004B8D]/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#003366] mb-2">Admin Access Required</h3>
          <p className="text-[#004B8D]/60">Only administrators can manage authorized emails.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#003366]">BMS Access Control</h2>
          <p className="text-sm text-[#004B8D]/60">Manage who can log in with magic links</p>
        </div>
      </div>

      {/* Add Email Form */}
      <Card className="bg-white border-[#004B8D]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#003366] flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Authorized Email
          </CardTitle>
          <CardDescription className="text-[#004B8D]/60">
            Grant BMS access to a new email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddEmail} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#004B8D]">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#004B8D]/50" />
                  <Input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="user@company.com"
                    className="pl-10 bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] placeholder:text-[#004B8D]/40"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[#004B8D]">Notes (optional)</Label>
                <Input
                  id="notes"
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g., Department"
                  className="bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] placeholder:text-[#004B8D]/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#004B8D]">Access Role</Label>
                <Select value={newRole} onValueChange={(value: AppRole) => setNewRole(value)}>
                  <SelectTrigger className="w-full bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#004B8D]/20">
                    {(Object.keys(roleConfig) as AppRole[]).map((role) => {
                      const config = roleConfig[role];
                      const Icon = config.icon;
                      return (
                        <SelectItem key={role} value={role} className="text-[#003366]">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${config.color}`} />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#004B8D]/60">
                  Admin: Full access • Manager: Edit access • Viewer: Read-only
                </p>
              </div>

              {isMultiBranchEnabled && (
                <div className="space-y-2">
                  <Label className="text-[#004B8D]">Branch Assignment</Label>
                  <Select value={newBranchId} onValueChange={setNewBranchId}>
                    <SelectTrigger className="w-full bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366]">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#004B8D]/20">
                      <SelectItem value="all" className="text-[#003366]">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <span>All Branches (Full Access)</span>
                        </div>
                      </SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id} className="text-[#003366]">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#004B8D]" />
                            <span>{branch.name}</span>
                            {branch.is_headquarters && (
                              <Badge variant="outline" className="ml-1 text-xs py-0">HQ</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#004B8D]/60">
                    Assign user to specific branch or grant access to all
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isAdding || !newEmail.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Email
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email List */}
      <Card className="bg-white border-[#004B8D]/10 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#003366] flex items-center gap-2">
                <Users className="w-5 h-5" />
                Authorized Emails
              </CardTitle>
              <CardDescription className="text-[#004B8D]/60">
                {emails.length} email{emails.length !== 1 ? "s" : ""} with BMS access
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-300 text-emerald-600 bg-emerald-50">
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#004B8D] animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8 text-[#004B8D]/50">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No authorized emails yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#004B8D]/10 hover:bg-transparent">
                  <TableHead className="text-[#004B8D]/70">Email</TableHead>
                  <TableHead className="text-[#004B8D]/70">Role</TableHead>
                  {isMultiBranchEnabled && (
                    <TableHead className="text-[#004B8D]/70">Branch</TableHead>
                  )}
                  <TableHead className="text-[#004B8D]/70">Notes</TableHead>
                  <TableHead className="text-[#004B8D]/70">Added</TableHead>
                  <TableHead className="text-[#004B8D]/70 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((item) => {
                  const roleInfo = roleConfig[item.default_role];
                  const RoleIcon = roleInfo.icon;
                  return (
                    <TableRow key={item.id} className="border-[#004B8D]/10 hover:bg-[#004B8D]/5">
                      <TableCell className="font-medium text-[#003366]">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[#004B8D]/50" />
                          {item.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={item.default_role} 
                          onValueChange={(value: AppRole) => handleUpdateRole(item.id, value)}
                          disabled={updatingId === item.id}
                        >
                          <SelectTrigger className={`w-32 h-8 text-xs border ${roleInfo.bgColor} ${roleInfo.color}`}>
                            <SelectValue>
                              <div className="flex items-center gap-1.5">
                                {updatingId === item.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RoleIcon className="w-3 h-3" />
                                )}
                                <span>{roleInfo.label}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#004B8D]/20">
                            {(Object.keys(roleConfig) as AppRole[]).map((role) => {
                              const config = roleConfig[role];
                              const Icon = config.icon;
                              return (
                                <SelectItem key={role} value={role} className="text-[#003366]">
                                  <div className="flex items-center gap-2">
                                    <Icon className={`w-4 h-4 ${config.color}`} />
                                    <span>{config.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {isMultiBranchEnabled && (
                        <TableCell>
                          <Select 
                            value={item.branch_id || "all"} 
                            onValueChange={(value) => handleUpdateBranch(item.id, value)}
                            disabled={updatingId === item.id}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs border bg-slate-50 border-slate-200">
                              <SelectValue>
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="w-3 h-3 text-[#004B8D]" />
                                  <span className="truncate">{getBranchName(item.branch_id)}</span>
                                </div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white border-[#004B8D]/20">
                              <SelectItem value="all" className="text-[#003366]">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-emerald-600" />
                                  <span>All Branches</span>
                                </div>
                              </SelectItem>
                              {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id} className="text-[#003366]">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-[#004B8D]" />
                                    <span>{branch.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      <TableCell className="text-[#004B8D]/60">
                        {item.notes || "—"}
                      </TableCell>
                      <TableCell className="text-[#004B8D]/60 text-sm">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEmail(item.id, item.email)}
                          disabled={deletingId === item.id || emails.length <= 1}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
