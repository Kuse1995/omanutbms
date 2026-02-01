import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Car, User, Wrench, DollarSign, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface JobCardModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  jobCard?: {
    id: string;
    job_number: string;
    customer_id: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    vehicle_year: number | null;
    vehicle_reg: string | null;
    vehicle_vin: string | null;
    odometer_reading: number | null;
    customer_complaint: string | null;
    diagnosis: string | null;
    status: string;
    estimated_labor_hours: number | null;
    labor_rate: number | null;
    parts_total: number | null;
    labor_total: number | null;
    quoted_total: number | null;
    intake_date: string | null;
    promised_date: string | null;
    assigned_technician_id: string | null;
    notes: string | null;
  } | null;
}

const STATUSES = [
  { value: 'received', label: 'Received' },
  { value: 'diagnosing', label: 'Diagnosing' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_parts', label: 'Waiting Parts' },
  { value: 'ready', label: 'Ready' },
  { value: 'collected', label: 'Collected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function JobCardModal({ open, onClose, onSuccess, jobCard }: JobCardModalProps) {
  const { tenantId, businessProfile } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!jobCard;
  const currencySymbol = businessProfile?.currency_symbol || 'K';

  // Form state
  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_reg: '',
    vehicle_vin: '',
    odometer_reading: '',
    customer_complaint: '',
    diagnosis: '',
    status: 'received',
    estimated_labor_hours: '',
    labor_rate: '',
    parts_total: '',
    intake_date: format(new Date(), 'yyyy-MM-dd'),
    promised_date: '',
    assigned_technician_id: '',
    notes: '',
  });

  // Reset form when modal opens/closes or jobCard changes
  useEffect(() => {
    if (open && jobCard) {
      setFormData({
        customer_id: jobCard.customer_id || '',
        vehicle_make: jobCard.vehicle_make || '',
        vehicle_model: jobCard.vehicle_model || '',
        vehicle_year: jobCard.vehicle_year?.toString() || '',
        vehicle_reg: jobCard.vehicle_reg || '',
        vehicle_vin: jobCard.vehicle_vin || '',
        odometer_reading: jobCard.odometer_reading?.toString() || '',
        customer_complaint: jobCard.customer_complaint || '',
        diagnosis: jobCard.diagnosis || '',
        status: jobCard.status || 'received',
        estimated_labor_hours: jobCard.estimated_labor_hours?.toString() || '',
        labor_rate: jobCard.labor_rate?.toString() || '',
        parts_total: jobCard.parts_total?.toString() || '',
        intake_date: jobCard.intake_date || format(new Date(), 'yyyy-MM-dd'),
        promised_date: jobCard.promised_date || '',
        assigned_technician_id: jobCard.assigned_technician_id || '',
        notes: jobCard.notes || '',
      });
    } else if (open && !jobCard) {
      setFormData({
        customer_id: '',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_year: '',
        vehicle_reg: '',
        vehicle_vin: '',
        odometer_reading: '',
        customer_complaint: '',
        diagnosis: '',
        status: 'received',
        estimated_labor_hours: '',
        labor_rate: '',
        parts_total: '',
        intake_date: format(new Date(), 'yyyy-MM-dd'),
        promised_date: '',
        assigned_technician_id: '',
        notes: '',
      });
    }
  }, [open, jobCard]);

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers-select', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && open,
  });

  // Fetch technicians (employees)
  const { data: technicians } = useQuery({
    queryKey: ['technicians-select', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('tenant_id', tenantId)
        .eq('employment_status', 'active')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && open,
  });

  // Calculate totals
  const laborHours = parseFloat(formData.estimated_labor_hours) || 0;
  const laborRate = parseFloat(formData.labor_rate) || 0;
  const partsTotal = parseFloat(formData.parts_total) || 0;
  const laborTotal = laborHours * laborRate;
  const quotedTotal = laborTotal + partsTotal;

  // Mutation for create/update
  const mutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const payload = {
        tenant_id: tenantId,
        job_number: '', // Auto-generated by database trigger
        customer_id: formData.customer_id || null,
        vehicle_make: formData.vehicle_make || null,
        vehicle_model: formData.vehicle_model || null,
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
        vehicle_reg: formData.vehicle_reg || null,
        vehicle_vin: formData.vehicle_vin || null,
        odometer_reading: formData.odometer_reading ? parseInt(formData.odometer_reading) : null,
        customer_complaint: formData.customer_complaint || null,
        diagnosis: formData.diagnosis || null,
        status: formData.status,
        estimated_labor_hours: formData.estimated_labor_hours ? parseFloat(formData.estimated_labor_hours) : null,
        labor_rate: formData.labor_rate ? parseFloat(formData.labor_rate) : null,
        parts_total: partsTotal,
        labor_total: laborTotal,
        quoted_total: quotedTotal,
        intake_date: formData.intake_date || null,
        promised_date: formData.promised_date || null,
        assigned_technician_id: formData.assigned_technician_id || null,
        notes: formData.notes || null,
      };

      if (isEditing && jobCard) {
        const { error } = await supabase
          .from('job_cards')
          .update(payload)
          .eq('id', jobCard.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('job_cards')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Job card updated" : "Job card created",
        description: isEditing ? "The job card has been updated successfully." : "A new job card has been created.",
      });
      onSuccess();
    },
    onError: (error) => {
      console.error('Job card mutation error:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} job card. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            {isEditing ? `Edit Job Card: ${jobCard?.job_number}` : 'New Job Card'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="vehicle" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="vehicle" className="gap-1">
                <Car className="w-4 h-4" />
                Vehicle
              </TabsTrigger>
              <TabsTrigger value="customer" className="gap-1">
                <User className="w-4 h-4" />
                Customer
              </TabsTrigger>
              <TabsTrigger value="work" className="gap-1">
                <Wrench className="w-4 h-4" />
                Work
              </TabsTrigger>
              <TabsTrigger value="pricing" className="gap-1">
                <DollarSign className="w-4 h-4" />
                Pricing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vehicle" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle_make">Make</Label>
                  <Input
                    id="vehicle_make"
                    placeholder="e.g., Toyota"
                    value={formData.vehicle_make}
                    onChange={(e) => updateField('vehicle_make', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_model">Model</Label>
                  <Input
                    id="vehicle_model"
                    placeholder="e.g., Corolla"
                    value={formData.vehicle_model}
                    onChange={(e) => updateField('vehicle_model', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle_year">Year</Label>
                  <Input
                    id="vehicle_year"
                    type="number"
                    placeholder="e.g., 2020"
                    value={formData.vehicle_year}
                    onChange={(e) => updateField('vehicle_year', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_reg">Registration Number</Label>
                  <Input
                    id="vehicle_reg"
                    placeholder="e.g., ABC 1234"
                    value={formData.vehicle_reg}
                    onChange={(e) => updateField('vehicle_reg', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle_vin">VIN (Optional)</Label>
                  <Input
                    id="vehicle_vin"
                    placeholder="Vehicle Identification Number"
                    value={formData.vehicle_vin}
                    onChange={(e) => updateField('vehicle_vin', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odometer_reading">Odometer Reading (km)</Label>
                  <Input
                    id="odometer_reading"
                    type="number"
                    placeholder="e.g., 85000"
                    value={formData.odometer_reading}
                    onChange={(e) => updateField('odometer_reading', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="customer" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(v) => updateField('customer_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer or leave empty for walk-in" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Walk-in Customer</SelectItem>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.phone && `(${c.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_complaint">Customer Complaint / Issue</Label>
                <Textarea
                  id="customer_complaint"
                  placeholder="Describe what the customer reported..."
                  rows={4}
                  value={formData.customer_complaint}
                  onChange={(e) => updateField('customer_complaint', e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="work" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => updateField('status', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_technician_id">Assigned Technician</Label>
                  <Select
                    value={formData.assigned_technician_id}
                    onValueChange={(v) => updateField('assigned_technician_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {technicians?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="intake_date">Intake Date</Label>
                  <Input
                    id="intake_date"
                    type="date"
                    value={formData.intake_date}
                    onChange={(e) => updateField('intake_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promised_date">Promised Date</Label>
                  <Input
                    id="promised_date"
                    type="date"
                    value={formData.promised_date}
                    onChange={(e) => updateField('promised_date', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis / Work Required</Label>
                <Textarea
                  id="diagnosis"
                  placeholder="Technician's diagnosis and work to be done..."
                  rows={4}
                  value={formData.diagnosis}
                  onChange={(e) => updateField('diagnosis', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes..."
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_labor_hours">Labor Hours</Label>
                  <Input
                    id="estimated_labor_hours"
                    type="number"
                    step="0.5"
                    placeholder="e.g., 3.5"
                    value={formData.estimated_labor_hours}
                    onChange={(e) => updateField('estimated_labor_hours', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="labor_rate">Labor Rate ({currencySymbol}/hour)</Label>
                  <Input
                    id="labor_rate"
                    type="number"
                    placeholder="e.g., 150"
                    value={formData.labor_rate}
                    onChange={(e) => updateField('labor_rate', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parts_total">Parts Total ({currencySymbol})</Label>
                <Input
                  id="parts_total"
                  type="number"
                  placeholder="Total cost of parts"
                  value={formData.parts_total}
                  onChange={(e) => updateField('parts_total', e.target.value)}
                />
              </div>

              <Separator className="my-4" />

              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Labor ({laborHours}h × {currencySymbol}{laborRate})</span>
                      <span>{currencySymbol}{laborTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parts</span>
                      <span>{currencySymbol}{partsTotal.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total Quote</span>
                      <span className="text-primary">{currencySymbol}{quotedTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Job Card' : 'Create Job Card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
