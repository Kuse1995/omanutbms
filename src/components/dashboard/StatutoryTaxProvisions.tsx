import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Landmark, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

const ZAMBIAN_TAX_TYPES = [
  { 
    key: "paye", 
    label: "PAYE (Pay As You Earn)", 
    description: "Employee income tax deducted at source",
    authority: "Zambia Revenue Authority (ZRA)",
    defaultDueDay: 10,
  },
  { 
    key: "napsa", 
    label: "NAPSA Contributions", 
    description: "National Pension Scheme (5% employer + 5% employee)",
    authority: "NAPSA",
    defaultDueDay: 10,
  },
  { 
    key: "nhima", 
    label: "NHIMA Contributions", 
    description: "National Health Insurance (1% employer + 1% employee)",
    authority: "NHIMA",
    defaultDueDay: 10,
  },
  { 
    key: "vat", 
    label: "VAT (Value Added Tax)", 
    description: "16% standard rate on taxable supplies",
    authority: "Zambia Revenue Authority (ZRA)",
    defaultDueDay: 18,
  },
  { 
    key: "wht", 
    label: "Withholding Tax (WHT)", 
    description: "Tax withheld on payments to suppliers/contractors",
    authority: "Zambia Revenue Authority (ZRA)",
    defaultDueDay: 14,
  },
  { 
    key: "turnover_tax", 
    label: "Turnover Tax", 
    description: "4% on annual turnover up to K800,000 (simplified regime)",
    authority: "Zambia Revenue Authority (ZRA)",
    defaultDueDay: 14,
  },
  { 
    key: "property_transfer_tax", 
    label: "Property Transfer Tax", 
    description: "5% on transfer of property, shares, or mining rights",
    authority: "Zambia Revenue Authority (ZRA)",
    defaultDueDay: 14,
  },
  { 
    key: "skills_dev_levy", 
    label: "Skills Development Levy", 
    description: "0.5% of gross emoluments for employee training",
    authority: "TEVETA",
    defaultDueDay: 10,
  },
];

interface StatutoryTaxProvisionsProps {
  canManage: boolean;
}

export function StatutoryTaxProvisions({ canManage }: StatutoryTaxProvisionsProps) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { currencySymbol } = useBusinessConfig();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTaxType, setSelectedTaxType] = useState<string>("");
  const [formData, setFormData] = useState({
    amount: "",
    period: format(new Date(), "yyyy-MM"),
    due_date: "",
    notes: "",
  });

  // Fetch tax-related payables
  const { data: taxPayables = [], isLoading } = useQuery({
    queryKey: ["statutory-tax-payables", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("accounts_payable")
        .select("*")
        .eq("tenant_id", tenantId)
        .like("description", "Statutory:%")
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !selectedTaxType || !formData.amount) {
        throw new Error("Missing required fields");
      }

      const taxInfo = ZAMBIAN_TAX_TYPES.find(t => t.key === selectedTaxType);
      if (!taxInfo) throw new Error("Invalid tax type");

      const { error } = await supabase.from("accounts_payable").insert({
        tenant_id: tenantId,
        vendor_name: taxInfo.authority,
        description: `Statutory: ${taxInfo.label} - ${formData.period}`,
        amount_zmw: parseFloat(formData.amount),
        due_date: formData.due_date || null,
        invoice_reference: `${selectedTaxType.toUpperCase()}-${formData.period}`,
        notes: formData.notes || `${taxInfo.description}`,
        status: "pending",
        recorded_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statutory-tax-payables"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
      toast.success("Tax provision recorded");
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to record tax provision");
    },
  });

  const resetForm = () => {
    setSelectedTaxType("");
    setFormData({
      amount: "",
      period: format(new Date(), "yyyy-MM"),
      due_date: "",
      notes: "",
    });
  };

  const handleTaxTypeChange = (value: string) => {
    setSelectedTaxType(value);
    const taxInfo = ZAMBIAN_TAX_TYPES.find(t => t.key === value);
    if (taxInfo) {
      // Auto-set due date based on period and default due day
      const [year, month] = formData.period.split("-").map(Number);
      // Due next month on the default day
      const nextMonth = month === 12 ? 1 : month + 1;
      const dueYear = month === 12 ? year + 1 : year;
      const dueDate = `${dueYear}-${String(nextMonth).padStart(2, "0")}-${String(taxInfo.defaultDueDay).padStart(2, "0")}`;
      setFormData(prev => ({ ...prev, due_date: dueDate }));
    }
  };

  const getStatusBadge = (status: string, dueDate: string | null) => {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== "paid";
    if (isOverdue) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</Badge>;
    }
    if (status === "paid") {
      return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
    }
    return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
  };

  const totalPending = taxPayables
    .filter(p => p.status !== "paid")
    .reduce((sum, p) => sum + Number(p.amount_zmw), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Zambian Statutory Tax Provisions
          </h3>
          <p className="text-sm text-muted-foreground">Track PAYE, NAPSA, NHIMA, VAT, WHT and other statutory obligations</p>
        </div>
        {canManage && (
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Tax Provision</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Statutory Tax Provision</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tax Type *</Label>
                  <Select value={selectedTaxType} onValueChange={handleTaxTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ZAMBIAN_TAX_TYPES.map(tax => (
                        <SelectItem key={tax.key} value={tax.key}>
                          <div className="flex flex-col">
                            <span>{tax.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTaxType && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {ZAMBIAN_TAX_TYPES.find(t => t.key === selectedTaxType)?.description}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Amount ({currencySymbol}) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label>Tax Period</Label>
                  <Input
                    type="month"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Payment Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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

                <Button
                  className="w-full"
                  onClick={() => addMutation.mutate()}
                  disabled={!selectedTaxType || !formData.amount || addMutation.isPending}
                >
                  {addMutation.isPending ? "Recording..." : "Record Tax Provision"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Quick summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Statutory Taxes Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{currencySymbol}{totalPending.toLocaleString()}</p>
        </CardContent>
      </Card>

      {/* Tax reference guide */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick Reference: Zambian Tax Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-muted rounded">
              <strong>PAYE:</strong> Progressive (0%-37%)
            </div>
            <div className="p-2 bg-muted rounded">
              <strong>NAPSA:</strong> 5% employer + 5% employee
            </div>
            <div className="p-2 bg-muted rounded">
              <strong>NHIMA:</strong> 1% employer + 1% employee
            </div>
            <div className="p-2 bg-muted rounded">
              <strong>VAT:</strong> 16% standard rate
            </div>
            <div className="p-2 bg-muted rounded">
              <strong>WHT:</strong> 15-20% depending on type
            </div>
            <div className="p-2 bg-muted rounded">
              <strong>Turnover Tax:</strong> 4% (if turnover ≤K800,000/yr)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax payables list */}
      {isLoading ? (
        <p className="text-center py-4 text-muted-foreground">Loading...</p>
      ) : taxPayables.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Landmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No statutory tax provisions recorded yet</p>
            <p className="text-xs mt-1">Use "Add Tax Provision" to record PAYE, NAPSA, NHIMA, VAT and more</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax Type</TableHead>
                  <TableHead>Authority</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxPayables.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {(item.description || "").replace("Statutory: ", "")}
                    </TableCell>
                    <TableCell>{item.vendor_name}</TableCell>
                    <TableCell>{currencySymbol}{Number(item.amount_zmw).toLocaleString()}</TableCell>
                    <TableCell>
                      {item.due_date ? format(new Date(item.due_date), "dd MMM yyyy") : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status, item.due_date)}</TableCell>
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
