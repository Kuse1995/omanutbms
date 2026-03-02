import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';

interface EditTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  transfer: {
    id: string;
    tenant_id: string;
    from_branch_id: string;
    to_branch_id: string;
    inventory_id: string;
    quantity: number;
    notes: string | null;
    status: string;
    product_name?: string;
    from_branch_name?: string;
    to_branch_name?: string;
  } | null;
}

interface Branch {
  id: string;
  name: string;
  type: string | null;
}

export const EditTransferModal: React.FC<EditTransferModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  transfer,
}) => {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [availableStock, setAvailableStock] = useState<number | null>(null);

  useEffect(() => {
    if (open && transfer) {
      setQuantity(transfer.quantity);
      setTargetBranchId(transfer.to_branch_id);
      setNotes(transfer.notes || '');
      setEditReason('');
      fetchBranches();
      fetchAvailableStock();
    }
  }, [open, transfer]);

  const fetchBranches = async () => {
    if (!tenant?.id) return;
    const { data } = await supabase
      .from('branches')
      .select('id, name, type')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('name');
    setBranches(data || []);
  };

  const fetchAvailableStock = async () => {
    if (!transfer || !tenant?.id) return;
    // Check branch_inventory for source branch
    const { data } = await supabase
      .from('branch_inventory')
      .select('current_stock')
      .eq('branch_id', transfer.from_branch_id)
      .eq('inventory_id', transfer.inventory_id)
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    if (data) {
      // Available = current_stock + original transfer quantity (since it's reserved)
      setAvailableStock(data.current_stock + transfer.quantity);
    } else {
      // Fallback to global inventory
      const { data: inv } = await supabase
        .from('inventory')
        .select('current_stock')
        .eq('id', transfer.inventory_id)
        .maybeSingle();
      setAvailableStock(inv ? inv.current_stock + transfer.quantity : null);
    }
  };

  const handleSave = async () => {
    if (!transfer || !editReason.trim()) return;

    if (quantity <= 0) {
      toast({ title: 'Invalid quantity', description: 'Quantity must be greater than 0', variant: 'destructive' });
      return;
    }

    if (availableStock !== null && quantity > availableStock) {
      toast({ title: 'Insufficient stock', description: `Only ${availableStock} units available at source`, variant: 'destructive' });
      return;
    }

    if (targetBranchId === transfer.from_branch_id) {
      toast({ title: 'Invalid target', description: 'Target cannot be the same as source', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const updatedNotes = [
        notes,
        `[EDIT ${new Date().toISOString().slice(0, 16)}] Reason: ${editReason.trim()}`
      ].filter(Boolean).join('\n');

      const { error } = await supabase
        .from('stock_transfers')
        .update({
          quantity,
          to_branch_id: targetBranchId,
          notes: updatedNotes,
        })
        .eq('id', transfer.id);

      if (error) throw error;

      toast({ title: 'Transfer Updated', description: 'Changes saved and logged for audit.' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update transfer', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!transfer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Transfer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Read-only info */}
          <div className="rounded-lg border p-3 bg-muted/50 space-y-1 text-sm">
            <div><span className="font-medium">Product:</span> {transfer.product_name}</div>
            <div><span className="font-medium">Source:</span> {transfer.from_branch_name}</div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity *</Label>
            <Input
              type="number"
              min={1}
              max={availableStock ?? undefined}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            />
            {availableStock !== null && (
              <p className="text-xs text-muted-foreground">
                {availableStock} units available at source
              </p>
            )}
          </div>

          {/* Target Location */}
          <div className="space-y-2">
            <Label>Target Location *</Label>
            <Select value={targetBranchId} onValueChange={setTargetBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                {branches
                  .filter(b => b.id !== transfer.from_branch_id)
                  .map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          {/* Edit Reason (required) */}
          <div className="space-y-2">
            <Label>Edit Reason *</Label>
            <Textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              rows={2}
              placeholder="Why are you making this change? (required for audit)"
              className="border-amber-300 focus-visible:ring-amber-400"
            />
          </div>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-xs">
              All changes are tracked in the audit log for compliance.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !editReason.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
