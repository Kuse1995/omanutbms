import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, CheckCircle, Clock, AlertTriangle, Trash2, Eye, RefreshCw, Landmark } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { PayableViewModal } from "./PayableViewModal";
import { useTenant } from "@/hooks/useTenant";
import { RecurringExpensesManager } from "./RecurringExpensesManager";
import { StatutoryTaxProvisions } from "./StatutoryTaxProvisions";

interface AccountPayable {
  id: string;
  vendor_name: string;
  description: string | null;
  amount_zmw: number;
  due_date: string | null;
  status: string;
  invoice_reference: string | null;
  paid_date: string | null;
  paid_amount: number | null;
  notes: string | null;
  created_at: string;
}

const AccountsPayable = () => {
  const { user, role } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPayable, setSelectedPayable] = useState<AccountPayable | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("payables");
  const [formData, setFormData] = useState({
    vendor_name: "",
    description: "",
    amount_zmw: "",
    due_date: "",
    invoice_reference: "",
    notes: "",
  });

  const { data: payables = [], isLoading } = useQuery({
    queryKey: ["accounts-payable"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_payable")
        .select("*")
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as AccountPayable[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!tenantId) throw new Error("Organization context missing");
      const { error } = await supabase.from("accounts_payable").insert({
        tenant_id: tenantId,
        vendor_name: data.vendor_name,
        description: data.description || null,
        amount_zmw: parseFloat(data.amount_zmw),
        due_date: data.due_date || null,
        invoice_reference: data.invoice_reference || null,
        notes: data.notes || null,
        recorded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
      toast.success("Account payable added successfully");
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to add account payable");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, paid_amount }: { id: string; status: string; paid_amount?: number }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "paid") {
        updateData.paid_date = new Date().toISOString().split("T")[0];
        if (paid_amount !== undefined) updateData.paid_amount = paid_amount;
        
        // Get the payable details first to record as expense
        const { data: payable, error: fetchError } = await supabase
          .from("accounts_payable")
          .select("*")
          .eq("id", id)
          .single();
        
        if (fetchError) throw fetchError;
        if (!payable) throw new Error("Payable not found");
        
        // Update the payable status
        const { error: updateError } = await supabase.from("accounts_payable").update(updateData).eq("id", id);
        if (updateError) throw updateError;
        
        // Record as expense in accounting
        const expenseAmount = paid_amount || payable.amount_zmw;
        const expenseData = {
          tenant_id: tenantId,
          date_incurred: updateData.paid_date as string,
          category: "Other",
          amount_zmw: expenseAmount,
          vendor_name: payable.vendor_name,
          notes: `Payment for ${payable.description || payable.invoice_reference || 'account payable'}`,
          recorded_by: user?.id,
        };
        
        console.log("Recording expense for accounts payable:", expenseData);
        const { error: expenseError } = await supabase.from("expenses").insert(expenseData);
        
        if (expenseError) {
          console.error("Error recording expense:", expenseError);
          console.error("Expense data that failed:", expenseData);
          throw new Error(`Failed to record expense: ${expenseError.message}`);
        }
        
        console.log("Expense recorded successfully for accounts payable");
        toast.success("Payment recorded and expense logged");
      } else {
        // For non-paid status updates, just update the status
        const { error } = await supabase.from("accounts_payable").update(updateData).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
      toast.success("Status updated successfully");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts_payable").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
      toast.success("Account payable deleted");
    },
    onError: () => {
      toast.error("Failed to delete account payable");
    },
  });

  const resetForm = () => {
    setFormData({
      vendor_name: "",
      description: "",
      amount_zmw: "",
      due_date: "",
      invoice_reference: "",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor_name || !formData.amount_zmw) {
      toast.error("Please fill in required fields");
      return;
    }
    addMutation.mutate(formData);
  };

  const getStatusBadge = (status: string, dueDate: string | null) => {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== "paid";
    
    if (isOverdue) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</Badge>;
    }
    
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
      case "partial":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Partial</Badge>;
      default:
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  const filteredPayables = payables.filter((p) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "overdue") {
      return p.due_date && new Date(p.due_date) < new Date() && p.status !== "paid";
    }
    return p.status === statusFilter;
  });

  const totalPending = payables.filter((p) => p.status !== "paid").reduce((sum, p) => sum + Number(p.amount_zmw), 0);
  const totalOverdue = payables
    .filter((p) => p.due_date && new Date(p.due_date) < new Date() && p.status !== "paid")
    .reduce((sum, p) => sum + Number(p.amount_zmw), 0);

  const canManage = role === "admin" || role === "manager";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Accounts Payable</h2>
          <p className="text-muted-foreground">Track and manage vendor payments and liabilities</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="payables" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Payables
          </TabsTrigger>
          <TabsTrigger value="statutory" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Statutory Taxes
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Recurring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payables" className="mt-6 space-y-6">
          <div className="flex justify-end">
            {canManage && (
              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" /> Add Payable</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Account Payable</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Vendor Name *</Label>
                      <Input
                        value={formData.vendor_name}
                        onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                        placeholder="Enter vendor name"
                      />
                    </div>
                    <div>
                      <Label>Amount (ZMW) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.amount_zmw}
                        onChange={(e) => setFormData({ ...formData, amount_zmw: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Invoice Reference</Label>
                      <Input
                        value={formData.invoice_reference}
                        onChange={(e) => setFormData({ ...formData, invoice_reference: e.target.value })}
                        placeholder="INV-001"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="What is this payment for?"
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                      {addMutation.isPending ? "Adding..." : "Add Payable"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">K{totalPending.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">K{totalOverdue.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{payables.filter((p) => p.status !== "paid").length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Payables List
                </CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-4">Loading...</p>
              ) : filteredPayables.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No accounts payable found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayables.map((payable) => (
                      <TableRow key={payable.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedPayable(payable); setIsViewModalOpen(true); }}>
                        <TableCell className="font-medium">{payable.vendor_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{payable.description || "-"}</TableCell>
                        <TableCell>K{Number(payable.amount_zmw).toLocaleString()}</TableCell>
                        <TableCell>{payable.due_date ? format(new Date(payable.due_date), "dd MMM yyyy") : "-"}</TableCell>
                        <TableCell>{getStatusBadge(payable.status, payable.due_date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); setSelectedPayable(payable); setIsViewModalOpen(true); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canManage && payable.status !== "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({
                                    id: payable.id,
                                    status: "paid",
                                    paid_amount: Number(payable.amount_zmw),
                                  });
                                }}
                              >
                                Mark Paid
                              </Button>
                            )}
                            {role === "admin" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(payable.id); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statutory" className="mt-6">
          <StatutoryTaxProvisions canManage={canManage} />
        </TabsContent>

        <TabsContent value="recurring" className="mt-6">
          <RecurringExpensesManager />
        </TabsContent>
      </Tabs>

      <PayableViewModal
        payable={selectedPayable}
        isOpen={isViewModalOpen}
        onClose={() => { setIsViewModalOpen(false); setSelectedPayable(null); }}
      />
    </div>
  );
};

export default AccountsPayable;
