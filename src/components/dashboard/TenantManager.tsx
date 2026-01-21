import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Building2, Users, CreditCard, Trash2, Package } from "lucide-react";
import { TenantAddonsDialog } from "./TenantAddonsDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { getBusinessTypeOptions, BusinessType } from "@/lib/business-type-config";
import { getBillingPlanOptions, getBillingStatusOptions, BillingPlan, BillingStatus } from "@/lib/billing-plans";
import { useBillingPlans } from "@/hooks/useBillingPlans";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  user_count?: number;
  billing_plan?: string;
  billing_status?: string;
  business_type?: BusinessType;
}

export function TenantManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { plans } = useBillingPlans();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editingBillingProfile, setEditingBillingProfile] = useState<{
    billing_plan: BillingPlan;
    billing_status: BillingStatus;
    billing_notes: string;
    billing_start_date: string;
    billing_end_date: string;
  } | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [addonsDialogTenant, setAddonsDialogTenant] = useState<Tenant | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    status: "active",
    businessType: "retail" as BusinessType,
    adminEmail: "",
    adminRole: "admin" as "admin" | "manager" | "viewer",
    billingPlan: "starter" as BillingPlan,
    billingStatus: "trial" as BillingStatus,
  });

  const businessTypeOptions = getBusinessTypeOptions();
  const billingPlanOptions = getBillingPlanOptions();
  const billingStatusOptions = getBillingStatusOptions();

  // Fetch all tenants with user counts and billing info
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["all-tenants"],
    queryFn: async () => {
      const { data: tenantsData, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user counts and billing info for each tenant
      const tenantsWithDetails = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          const { count } = await supabase
            .from("tenant_users")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant.id);
          
          // Get billing info and business type from business_profiles
          const { data: profile } = await supabase
            .from("business_profiles")
            .select("billing_plan, billing_status, business_type")
            .eq("tenant_id", tenant.id)
            .single();
          
          return { 
            ...tenant, 
            user_count: count || 0,
            billing_plan: profile?.billing_plan || 'starter',
            billing_status: profile?.billing_status || 'inactive',
            business_type: (profile?.business_type as BusinessType) || 'retail',
          };
        })
      );

      return tenantsWithDetails as Tenant[];
    },
  });

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // 1. Create tenant
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          name: data.name,
          slug: data.slug.toLowerCase().replace(/\s+/g, "-"),
          status: data.status,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 2. Create business profile for tenant with business_type, billing info, and plan features
      // Enterprise plan gets all features enabled by default
      const isEnterprise = data.billingPlan === 'enterprise';
      const isGrowth = data.billingPlan === 'growth';
      
      const { error: profileError } = await supabase
        .from("business_profiles")
        .insert({
          tenant_id: tenant.id,
          company_name: data.name,
          business_type: data.businessType,
          billing_plan: data.billingPlan,
          billing_status: data.billingStatus,
          billing_start_date: new Date().toISOString().split('T')[0],
          // Enable features based on billing plan
          inventory_enabled: true, // All plans
          payroll_enabled: isGrowth || isEnterprise,
          agents_enabled: isGrowth || isEnterprise,
          impact_enabled: isGrowth || isEnterprise,
          website_enabled: isGrowth || isEnterprise,
          whatsapp_enabled: true, // All plans now have WhatsApp (with usage limits)
          advanced_accounting_enabled: isEnterprise, // Enterprise only
          whatsapp_messages_used: 0,
          whatsapp_usage_reset_date: new Date().toISOString().split('T')[0]
        });

      if (profileError) throw profileError;

      // 3. Create tenant statistics
      const { error: statsError } = await supabase
        .from("tenant_statistics")
        .insert({
          tenant_id: tenant.id,
        });

      if (statsError) throw statsError;

      // 4. If admin email provided, add to authorized_emails
      if (data.adminEmail) {
        const { error: emailError } = await supabase
          .from("authorized_emails")
          .insert({
            tenant_id: tenant.id,
            email: data.adminEmail.toLowerCase(),
            default_role: data.adminRole,
          });

        if (emailError) throw emailError;
      }

      return tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tenants"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Tenant created",
        description: "The new tenant has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data, businessType }: { id: string; data: Partial<Tenant>; businessType?: BusinessType }) => {
      // Update tenant table
      const { error } = await supabase
        .from("tenants")
        .update({ name: data.name, slug: data.slug, status: data.status })
        .eq("id", id);

      if (error) throw error;

      // Update business type in business_profiles if provided
      if (businessType) {
        const { error: profileError } = await supabase
          .from("business_profiles")
          .update({ business_type: businessType })
          .eq("tenant_id", id);

        if (profileError) throw profileError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tenants"] });
      setIsEditOpen(false);
      setEditingTenant(null);
      toast({
        title: "Tenant updated",
        description: "The tenant has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      status: "active",
      businessType: "retail",
      adminEmail: "",
      adminRole: "admin",
      billingPlan: "starter",
      billingStatus: "trial",
    });
  };

  // Update billing mutation
  const updateBillingMutation = useMutation({
    mutationFn: async ({ tenantId, billing }: { 
      tenantId: string; 
      billing: {
        billing_plan: string;
        billing_status: string;
        billing_notes: string;
        billing_start_date: string;
        billing_end_date: string;
      }
    }) => {
      // Determine feature enablement based on plan
      const isEnterprise = billing.billing_plan === 'enterprise';
      const isGrowth = billing.billing_plan === 'growth';
      
      const { error } = await supabase
        .from("business_profiles")
        .update({
          billing_plan: billing.billing_plan,
          billing_status: billing.billing_status,
          billing_notes: billing.billing_notes || null,
          billing_start_date: billing.billing_start_date || null,
          billing_end_date: billing.billing_end_date || null,
          // Update feature flags based on new plan
          inventory_enabled: true, // All plans
          payroll_enabled: isGrowth || isEnterprise,
          agents_enabled: isGrowth || isEnterprise,
          impact_enabled: isGrowth || isEnterprise,
          website_enabled: isGrowth || isEnterprise,
          whatsapp_enabled: isGrowth || isEnterprise,
          advanced_accounting_enabled: isEnterprise, // Enterprise only
        })
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tenants"] });
      toast({
        title: "Billing updated",
        description: "Tenant billing and feature access have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating billing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditBilling = async (tenant: Tenant) => {
    // Fetch full billing details
    const { data: profile } = await supabase
      .from("business_profiles")
      .select("billing_plan, billing_status, billing_notes, billing_start_date, billing_end_date")
      .eq("tenant_id", tenant.id)
      .single();
    
    setEditingTenant(tenant);
    setEditingBillingProfile({
      billing_plan: (profile?.billing_plan as BillingPlan) || "starter",
      billing_status: (profile?.billing_status as BillingStatus) || "inactive",
      billing_notes: profile?.billing_notes || "",
      billing_start_date: profile?.billing_start_date || "",
      billing_end_date: profile?.billing_end_date || "",
    });
  };

  const handleSaveBilling = () => {
    if (!editingTenant || !editingBillingProfile) return;
    
    updateBillingMutation.mutate({
      tenantId: editingTenant.id,
      billing: editingBillingProfile,
    });
    
    setEditingBillingProfile(null);
    setEditingTenant(null);
  };

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      // Delete in order to respect foreign key constraints
      // Some tables use SET NULL instead of CASCADE, so we delete them explicitly
      
      // WhatsApp tables (whatsapp_audit_logs uses SET NULL)
      await supabase.from("whatsapp_audit_logs").delete().eq("tenant_id", tenantId);
      await supabase.from("whatsapp_usage_logs").delete().eq("tenant_id", tenantId);
      await supabase.from("whatsapp_pending_actions").delete().eq("tenant_id", tenantId);
      await supabase.from("whatsapp_conversation_drafts").delete().eq("tenant_id", tenantId);
      await supabase.from("whatsapp_user_mappings").delete().eq("tenant_id", tenantId);
      
      // Core tenant tables
      await supabase.from("tenant_users").delete().eq("tenant_id", tenantId);
      await supabase.from("authorized_emails").delete().eq("tenant_id", tenantId);
      await supabase.from("business_profiles").delete().eq("tenant_id", tenantId);
      await supabase.from("tenant_statistics").delete().eq("tenant_id", tenantId);
      
      // Finally delete tenant (CASCADE will handle remaining tables)
      const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tenants"] });
      setDeletingTenant(null);
      toast({
        title: "Tenant deleted",
        description: "The tenant and all related data have been permanently deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteTenant = () => {
    if (!deletingTenant) return;
    deleteTenantMutation.mutate(deletingTenant.id);
  };

  const getBillingStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "trial":
        return <Badge className="bg-blue-500">Trial</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "inactive":
      default:
        return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50);
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleCreate = () => {
    if (!formData.name || !formData.slug) {
      toast({
        title: "Validation error",
        description: "Name and slug are required.",
        variant: "destructive",
      });
      return;
    }
    createTenantMutation.mutate(formData);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingTenant) return;
    updateTenantMutation.mutate({
      id: editingTenant.id,
      data: {
        name: editingTenant.name,
        slug: editingTenant.slug,
        status: editingTenant.status,
      },
      businessType: editingTenant.business_type,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading tenants...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tenant Management
          </CardTitle>
          <CardDescription>
            Create and manage organization tenants
          </CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Create a new organization tenant and optionally add an admin user.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Acme Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="acme-corp"
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for the tenant
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value: BusinessType) => setFormData((prev) => ({ ...prev, businessType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Determines available features and terminology
                </p>
              </div>
              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Billing Plan
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="billingPlan">Plan</Label>
                    <Select
                      value={formData.billingPlan}
                      onValueChange={(value: BillingPlan) => setFormData((prev) => ({ ...prev, billingPlan: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {billingPlanOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingStatus">Status</Label>
                    <Select
                      value={formData.billingStatus}
                      onValueChange={(value: BillingStatus) => setFormData((prev) => ({ ...prev, billingStatus: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {billingStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-3">Initial Admin (Optional)</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, adminEmail: e.target.value }))}
                      placeholder="admin@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminRole">Admin Role</Label>
                    <Select
                      value={formData.adminRole}
                      onValueChange={(value: "admin" | "manager" | "viewer") => 
                        setFormData((prev) => ({ ...prev, adminRole: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={createTenantMutation.isPending}
              >
                {createTenantMutation.isPending ? "Creating..." : "Create Tenant"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {tenants && tenants.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Add-ons</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                  <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {plans[tenant.billing_plan as BillingPlan]?.label || tenant.billing_plan || "No Plan"}
                    </Badge>
                  </TableCell>
                  <TableCell>{getBillingStatusBadge(tenant.billing_status || 'inactive')}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddonsDialogTenant(tenant)}
                      className="gap-1 text-xs"
                    >
                      <Package className="h-3 w-3" />
                      Manage
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {tenant.user_count}
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(tenant.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBilling(tenant)}
                        title="Edit Billing"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(tenant)}
                        title="Edit Tenant"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingTenant(tenant)}
                        title="Delete Tenant"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tenants found</p>
            <p className="text-sm text-muted-foreground">Create your first tenant to get started</p>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tenant</DialogTitle>
              <DialogDescription>
                Update tenant details
              </DialogDescription>
            </DialogHeader>
            {editingTenant && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input
                    value={editingTenant.name}
                    onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={editingTenant.slug}
                    onChange={(e) => setEditingTenant({ ...editingTenant, slug: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingTenant.status}
                    onValueChange={(value) => setEditingTenant({ ...editingTenant, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <Select
                    value={editingTenant.business_type || 'retail'}
                    onValueChange={(value: BusinessType) => setEditingTenant({ ...editingTenant, business_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Determines available features, categories, and terminology
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={updateTenantMutation.isPending}
              >
                {updateTenantMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Billing Edit Dialog */}
        <Dialog open={!!editingBillingProfile} onOpenChange={(open) => !open && setEditingBillingProfile(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Edit Billing - {editingTenant?.name}
              </DialogTitle>
              <DialogDescription>
                Manage billing plan and status for this tenant
              </DialogDescription>
            </DialogHeader>
            {editingBillingProfile && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Billing Plan</Label>
                    <Select
                      value={editingBillingProfile.billing_plan}
                      onValueChange={(value: BillingPlan) => 
                        setEditingBillingProfile({ ...editingBillingProfile, billing_plan: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {billingPlanOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Billing Status</Label>
                    <Select
                      value={editingBillingProfile.billing_status}
                      onValueChange={(value: BillingStatus) => 
                        setEditingBillingProfile({ ...editingBillingProfile, billing_status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {billingStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={editingBillingProfile.billing_start_date}
                      onChange={(e) => 
                        setEditingBillingProfile({ ...editingBillingProfile, billing_start_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date (Optional)</Label>
                    <Input
                      type="date"
                      value={editingBillingProfile.billing_end_date}
                      onChange={(e) => 
                        setEditingBillingProfile({ ...editingBillingProfile, billing_end_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Billing Notes</Label>
                  <Textarea
                    placeholder="Internal notes about this tenant's billing..."
                    value={editingBillingProfile.billing_notes}
                    onChange={(e) => 
                      setEditingBillingProfile({ ...editingBillingProfile, billing_notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingBillingProfile(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveBilling}
                disabled={updateBillingMutation.isPending}
              >
                {updateBillingMutation.isPending ? "Saving..." : "Save Billing"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingTenant} onOpenChange={(open) => !open && setDeletingTenant(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Delete Tenant</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Are you sure you want to permanently delete <strong>{deletingTenant?.name}</strong>?
                </p>
                <p className="text-destructive font-medium">
                  This action cannot be undone. All tenant data including users, business profile, 
                  statistics, and authorized emails will be permanently deleted.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTenant}
                disabled={deleteTenantMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteTenantMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Tenant Add-ons Dialog */}
        {addonsDialogTenant && (
          <TenantAddonsDialog
            tenantId={addonsDialogTenant.id}
            tenantName={addonsDialogTenant.name}
            billingPlan={addonsDialogTenant.billing_plan || "starter"}
            open={!!addonsDialogTenant}
            onOpenChange={(open) => !open && setAddonsDialogTenant(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
