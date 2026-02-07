import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeasurementsForm, type Measurements } from "./MeasurementsForm";
import { StudentAcademicForm, type StudentAcademicData } from "./StudentAcademicForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { User, Ruler, Save, Loader2, GraduationCap } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  measurements: Measurements;
  notes: string | null;
}

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSuccess: () => void;
}

export function CustomerModal({ open, onOpenChange, customer, onSuccess }: CustomerModalProps) {
  const { toast } = useToast();
  const { tenant } = useTenant();
  const { terminology, businessType } = useBusinessConfig();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const isSchool = businessType === 'school';

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const [measurements, setMeasurements] = useState<Measurements>({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        notes: customer.notes || "",
      });
      setMeasurements(customer.measurements || {});
    } else {
      setFormData({ name: "", email: "", phone: "", address: "", notes: "" });
      setMeasurements({});
    }
    setActiveTab("details");
  }, [customer, open]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: `${terminology.customer} name is required`, variant: "destructive" });
      return;
    }

    if (!tenant?.id) {
      toast({ title: "Error", description: "No tenant found", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        measurements,
        tenant_id: tenant.id,
      };

      if (customer) {
        const { error } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", customer.id);

        if (error) throw error;
        toast({ title: "Success", description: `${terminology.customer} updated successfully` });
      } else {
        const { error } = await supabase.from("customers").insert(payload);
        if (error) throw error;
        toast({ title: "Success", description: `${terminology.customer} added successfully` });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving customer:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const secondTabLabel = isSchool ? 'Academic & Guardian' : 'Measurements';
  const SecondTabIcon = isSchool ? GraduationCap : Ruler;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {customer ? `Edit ${terminology.customer}` : `Add New ${terminology.customer}`}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="measurements" className="flex items-center gap-2">
              <SecondTabIcon className="h-4 w-4" />
              {secondTabLabel}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isSchool ? "Student full name" : `${terminology.customer} name`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={isSchool ? "guardian@email.com" : "customer@email.com"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{isSchool ? "Guardian Phone" : "Phone"}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+260 97X XXX XXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address, city"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={isSchool ? "Additional notes about this student..." : "Additional notes about this customer..."}
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="measurements" className="mt-4">
            {isSchool ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Record academic and guardian information for this student.
                </p>
                <StudentAcademicForm
                  data={measurements as unknown as StudentAcademicData}
                  onChange={(data) => setMeasurements(data as unknown as Measurements)}
                />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Record body measurements in centimeters (cm). Leave fields empty if not measured.
                </p>
                <MeasurementsForm measurements={measurements} onChange={setMeasurements} />
              </>
            )}
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
                {customer ? `Update ${terminology.customer}` : `Add ${terminology.customer}`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
