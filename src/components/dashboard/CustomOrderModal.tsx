import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeasurementsForm, type Measurements } from "./MeasurementsForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { Scissors, User, Ruler, FileText, Save, Loader2, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  measurements: Measurements;
}

interface Employee {
  id: string;
  full_name: string;
}

interface CustomOrder {
  id: string;
  order_number: string;
  customer_id: string | null;
  design_type: string | null;
  fabric: string | null;
  color: string | null;
  style_notes: string | null;
  measurements: Measurements;
  estimated_cost: number | null;
  deposit_paid: number | null;
  order_date: string;
  due_date: string | null;
  status: string;
  assigned_to: string | null;
}

interface CustomOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: CustomOrder | null;
  onSuccess: () => void;
}

const DESIGN_TYPES = [
  { value: "dress", label: "Dress" },
  { value: "suit", label: "Suit" },
  { value: "shirt", label: "Shirt" },
  { value: "blouse", label: "Blouse" },
  { value: "trousers", label: "Trousers" },
  { value: "skirt", label: "Skirt" },
  { value: "jacket", label: "Jacket" },
  { value: "coat", label: "Coat" },
  { value: "gown", label: "Gown" },
  { value: "traditional", label: "Traditional Wear" },
  { value: "uniform", label: "Uniform" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cutting", label: "Cutting" },
  { value: "sewing", label: "Sewing" },
  { value: "fitting", label: "Fitting" },
  { value: "finishing", label: "Finishing" },
  { value: "ready", label: "Ready for Pickup" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function CustomOrderModal({ open, onOpenChange, order, onSuccess }: CustomOrderModalProps) {
  const { toast } = useToast();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("customer");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [formData, setFormData] = useState({
    customer_id: "",
    design_type: "",
    fabric: "",
    color: "",
    style_notes: "",
    estimated_cost: "",
    deposit_paid: "",
    order_date: format(new Date(), "yyyy-MM-dd"),
    due_date: "",
    status: "pending",
    assigned_to: "",
  });

  const [measurements, setMeasurements] = useState<Measurements>({});

  useEffect(() => {
    if (tenant?.id) {
      fetchCustomers();
      fetchEmployees();
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (order) {
      setFormData({
        customer_id: order.customer_id || "",
        design_type: order.design_type || "",
        fabric: order.fabric || "",
        color: order.color || "",
        style_notes: order.style_notes || "",
        estimated_cost: order.estimated_cost?.toString() || "",
        deposit_paid: order.deposit_paid?.toString() || "",
        order_date: order.order_date || format(new Date(), "yyyy-MM-dd"),
        due_date: order.due_date || "",
        status: order.status || "pending",
        assigned_to: order.assigned_to || "",
      });
      setMeasurements(order.measurements || {});
    } else {
      resetForm();
    }
    setActiveTab("customer");
  }, [order, open]);

  const resetForm = () => {
    setFormData({
      customer_id: "",
      design_type: "",
      fabric: "",
      color: "",
      style_notes: "",
      estimated_cost: "",
      deposit_paid: "",
      order_date: format(new Date(), "yyyy-MM-dd"),
      due_date: "",
      status: "pending",
      assigned_to: "",
    });
    setMeasurements({});
  };

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name, measurements")
      .eq("tenant_id", tenant!.id)
      .order("name");
    
    setCustomers((data || []).map(c => ({
      ...c,
      measurements: (c.measurements as Measurements) || {},
    })));
  };

  const fetchEmployees = async () => {
    if (!tenant?.id) return;
    const { data } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("tenant_id", tenant.id)
      .eq("status", "active");
    setEmployees(data || []);
  };

  const handleCustomerChange = (customerId: string) => {
    setFormData({ ...formData, customer_id: customerId });
    
    // Auto-populate measurements from customer
    if (customerId && customerId !== "none") {
      const customer = customers.find(c => c.id === customerId);
      if (customer?.measurements) {
        setMeasurements(customer.measurements);
      }
    }
  };

  const handleSubmit = async () => {
    if (!tenant?.id) {
      toast({ title: "Error", description: "No tenant found", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      if (order) {
        const { error } = await (supabase
          .from("custom_orders") as any)
          .update({
            customer_id: formData.customer_id && formData.customer_id !== "none" ? formData.customer_id : null,
            design_type: formData.design_type && formData.design_type !== "none" ? formData.design_type : null,
            fabric: formData.fabric.trim() || null,
            color: formData.color.trim() || null,
            style_notes: formData.style_notes.trim() || null,
            measurements: measurements,
            estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
            deposit_paid: formData.deposit_paid ? parseFloat(formData.deposit_paid) : null,
            order_date: formData.order_date || new Date().toISOString().split("T")[0],
            due_date: formData.due_date || null,
            status: formData.status,
            assigned_to: formData.assigned_to && formData.assigned_to !== "none" ? formData.assigned_to : null,
          })
          .eq("id", order.id);

        if (error) throw error;
        toast({ title: "Success", description: "Custom order updated successfully" });
      } else {
        const { error } = await (supabase.from("custom_orders") as any).insert({
          tenant_id: tenant.id,
          customer_id: formData.customer_id && formData.customer_id !== "none" ? formData.customer_id : null,
          design_type: formData.design_type && formData.design_type !== "none" ? formData.design_type : null,
          fabric: formData.fabric.trim() || null,
          color: formData.color.trim() || null,
          style_notes: formData.style_notes.trim() || null,
          measurements: measurements,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          deposit_paid: formData.deposit_paid ? parseFloat(formData.deposit_paid) : null,
          order_date: formData.order_date || new Date().toISOString().split("T")[0],
          due_date: formData.due_date || null,
          status: formData.status,
          assigned_to: formData.assigned_to && formData.assigned_to !== "none" ? formData.assigned_to : null,
          created_by: user?.id || null,
        });
        if (error) throw error;
        toast({ title: "Success", description: "Custom order created successfully" });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving custom order:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            {order ? `Edit Order ${order.order_number}` : "New Custom Order"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="customer" className="flex items-center gap-1 text-xs">
              <User className="h-3 w-3" />
              Customer
            </TabsTrigger>
            <TabsTrigger value="design" className="flex items-center gap-1 text-xs">
              <Scissors className="h-3 w-3" />
              Design
            </TabsTrigger>
            <TabsTrigger value="measurements" className="flex items-center gap-1 text-xs">
              <Ruler className="h-3 w-3" />
              Measurements
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select Customer</Label>
              <Select value={formData.customer_id || "none"} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Walk-in Customer</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecting a customer will auto-populate their saved measurements.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="design" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Design Type</Label>
              <Select value={formData.design_type || "none"} onValueChange={(v) => setFormData({ ...formData, design_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select design type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {DESIGN_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fabric">Fabric</Label>
                <Input
                  id="fabric"
                  value={formData.fabric}
                  onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                  placeholder="e.g., Cotton, Silk, Ankara"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="e.g., Navy Blue, Red"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style_notes">Style Notes & Design Description</Label>
              <Textarea
                id="style_notes"
                value={formData.style_notes}
                onChange={(e) => setFormData({ ...formData, style_notes: e.target.value })}
                placeholder="Describe the design details, embellishments, style preferences..."
                rows={4}
              />
            </div>
          </TabsContent>

          <TabsContent value="measurements" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Confirm or adjust body measurements for this order (in cm).
            </p>
            <MeasurementsForm measurements={measurements} onChange={setMeasurements} />
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_date">Order Date</Label>
                <Input
                  id="order_date"
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_cost">Estimated Cost</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="estimated_cost"
                    type="number"
                    step="0.01"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit_paid">Deposit Paid</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="deposit_paid"
                    type="number"
                    step="0.01"
                    value={formData.deposit_paid}
                    onChange={(e) => setFormData({ ...formData, deposit_paid: e.target.value })}
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={formData.assigned_to || "none"} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {order ? "Update Order" : "Create Order"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
