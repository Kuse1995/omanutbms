import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { Plus, Calendar, User, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Adjustment {
  id: string;
  adjustment_date: string;
  next_fitting_date: string | null;
  collection_date: string | null;
  attended_by: string | null;
  notes: string | null;
  created_at: string;
  employee?: { full_name: string } | null;
}

interface Employee {
  id: string;
  full_name: string;
}

interface AdjustmentsTrackingPanelProps {
  customOrderId: string;
  readonly?: boolean;
}

export function AdjustmentsTrackingPanel({ customOrderId, readonly = false }: AdjustmentsTrackingPanelProps) {
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New adjustment form state
  const [newAdjustment, setNewAdjustment] = useState({
    adjustmentDate: new Date().toISOString().split('T')[0],
    nextFittingDate: '',
    collectionDate: '',
    attendedBy: '',
    notes: ''
  });

  useEffect(() => {
    fetchAdjustments();
    fetchEmployees();
  }, [customOrderId, tenantId]);

  const fetchAdjustments = async () => {
    if (!customOrderId || !tenantId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_order_adjustments')
        .select(`
          *,
          employee:employees!custom_order_adjustments_attended_by_fkey(full_name)
        `)
        .eq('custom_order_id', customOrderId)
        .eq('tenant_id', tenantId)
        .order('adjustment_date', { ascending: false });

      if (error) throw error;
      setAdjustments(data || []);
    } catch (error) {
      console.error('Error fetching adjustments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!tenantId) return;
    
    try {
      const { data } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('tenant_id', tenantId)
        .eq('employment_status', 'active')
        .order('full_name');
      
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleAddAdjustment = async () => {
    if (!tenantId || !customOrderId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('custom_order_adjustments')
        .insert({
          custom_order_id: customOrderId,
          tenant_id: tenantId,
          adjustment_date: newAdjustment.adjustmentDate,
          next_fitting_date: newAdjustment.nextFittingDate || null,
          collection_date: newAdjustment.collectionDate || null,
          attended_by: newAdjustment.attendedBy || null,
          notes: newAdjustment.notes || null,
        });

      if (error) throw error;

      toast({
        title: "Adjustment Recorded",
        description: "The adjustment has been logged successfully",
      });

      // Reset form and refresh
      setNewAdjustment({
        adjustmentDate: new Date().toISOString().split('T')[0],
        nextFittingDate: '',
        collectionDate: '',
        attendedBy: '',
        notes: ''
      });
      setIsAdding(false);
      fetchAdjustments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record adjustment",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('custom_order_adjustments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Adjustment deleted" });
      fetchAdjustments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Adjustments & Alterations
          </CardTitle>
          {!readonly && !isAdding && (
            <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Entry
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new adjustment form */}
        {isAdding && (
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adjustmentDate" className="text-xs">Adjustment Date</Label>
                <Input
                  id="adjustmentDate"
                  type="date"
                  value={newAdjustment.adjustmentDate}
                  onChange={(e) => setNewAdjustment(prev => ({ ...prev, adjustmentDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="attendedBy" className="text-xs">Attended By</Label>
                <Select
                  value={newAdjustment.attendedBy}
                  onValueChange={(value) => setNewAdjustment(prev => ({ ...prev, attendedBy: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nextFittingDate" className="text-xs">Next Fitting Date</Label>
                <Input
                  id="nextFittingDate"
                  type="date"
                  value={newAdjustment.nextFittingDate}
                  onChange={(e) => setNewAdjustment(prev => ({ ...prev, nextFittingDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newCollectionDate" className="text-xs">New Collection Date</Label>
                <Input
                  id="newCollectionDate"
                  type="date"
                  value={newAdjustment.collectionDate}
                  onChange={(e) => setNewAdjustment(prev => ({ ...prev, collectionDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes" className="text-xs">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Describe the adjustments made..."
                value={newAdjustment.notes}
                onChange={(e) => setNewAdjustment(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddAdjustment} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </div>
        )}

        {/* Adjustments list */}
        {adjustments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No adjustments recorded yet
          </p>
        ) : (
          <div className="space-y-3">
            {adjustments.map((adj) => (
              <div key={adj.id} className="p-3 border rounded-lg text-sm space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(adj.adjustment_date), 'MMM d, yyyy')}
                    </Badge>
                    {adj.employee && (
                      <Badge variant="secondary" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        {adj.employee.full_name}
                      </Badge>
                    )}
                  </div>
                  {!readonly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteAdjustment(adj.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {adj.notes && (
                  <p className="text-muted-foreground">{adj.notes}</p>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {adj.next_fitting_date && (
                    <span>Next Fitting: {format(new Date(adj.next_fitting_date), 'MMM d')}</span>
                  )}
                  {adj.collection_date && (
                    <span>Collection: {format(new Date(adj.collection_date), 'MMM d')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
