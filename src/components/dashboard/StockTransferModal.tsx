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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { 
  Loader2, 
  ArrowRight, 
  Warehouse, 
  Store, 
  Factory, 
  AlertTriangle,
  Plus,
  X,
  Package
} from 'lucide-react';
import { Location, LocationType } from './LocationsManager';

interface StockTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefilledData?: {
    sourceId?: string;
    targetId?: string;
    productId?: string;
    productName?: string;
    suggestedQuantity?: number;
  };
}

interface TransferItem {
  id: string;
  inventoryId: string;
  productName: string;
  sku: string;
  availableStock: number;
  quantity: number;
}

interface InventoryItem {
  id: string;
  inventory_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
}

const typeIcons: Record<LocationType, React.ElementType> = {
  Store: Store,
  Warehouse: Warehouse,
  Production: Factory,
};

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  prefilledData,
}) => {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);

  const sourceLocation = locations.find(l => l.id === sourceId);
  const targetLocation = locations.find(l => l.id === targetId);
  const requiresApproval = sourceLocation?.type === 'Warehouse';

  useEffect(() => {
    if (open) {
      fetchLocations();
      if (prefilledData?.sourceId) setSourceId(prefilledData.sourceId);
      if (prefilledData?.targetId) setTargetId(prefilledData.targetId);
    } else {
      // Reset form
      setSourceId('');
      setTargetId('');
      setNotes('');
      setItems([]);
      setSelectedInventoryId('');
      setItemQuantity(1);
    }
  }, [open, prefilledData]);

  useEffect(() => {
    if (sourceId) {
      fetchSourceInventory();
    }
  }, [sourceId]);

  const fetchLocations = async () => {
    if (!tenant?.id) return;
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setLocations((data || []).map((b: any) => ({ ...b, type: b.type || 'Store' })));
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchSourceInventory = async () => {
    if (!tenant?.id || !sourceId) return;
    try {
      // Query branch_inventory to get stock specific to the source branch
      const { data, error } = await supabase
        .from('branch_inventory')
        .select(`
          id,
          inventory_id,
          current_stock,
          inventory:inventory_id(name, sku)
        `)
        .eq('tenant_id', tenant.id)
        .eq('branch_id', sourceId)
        .gt('current_stock', 0);
      
      if (error) throw error;
      
      setAvailableInventory((data || []).map((item: any) => ({
        // IMPORTANT:
        // stock_transfers.inventory_id is FK -> branch_inventory (see StockTransfersManager join)
        // so we must store the branch_inventory row id here.
        id: item.id,
        inventory_id: item.inventory_id,
        product_name: item.inventory?.name || 'Unknown',
        sku: item.inventory?.sku || '',
        current_stock: item.current_stock || 0,
      })));
    } catch (error) {
      console.error('Error fetching branch inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load stock for the selected source location.',
        variant: 'destructive',
      });
    }
  };

  const addItem = () => {
    if (!selectedInventoryId || itemQuantity <= 0) return;

    const inventoryItem = availableInventory.find(i => i.id === selectedInventoryId);
    if (!inventoryItem) return;

    // Check if already added
    if (items.some(i => i.inventoryId === selectedInventoryId)) {
      toast({
        title: 'Item already added',
        description: 'This item is already in the transfer list',
        variant: 'destructive',
      });
      return;
    }

    // Check available stock
    if (itemQuantity > inventoryItem.current_stock) {
      toast({
        title: 'Insufficient stock',
        description: `Only ${inventoryItem.current_stock} available`,
        variant: 'destructive',
      });
      return;
    }

    setItems([...items, {
      id: crypto.randomUUID(),
      // inventoryId here represents branch_inventory.id (FK used by stock_transfers)
      inventoryId: inventoryItem.id,
      productName: inventoryItem.product_name,
      sku: inventoryItem.sku,
      availableStock: inventoryItem.current_stock,
      quantity: itemQuantity,
    }]);

    setSelectedInventoryId('');
    setItemQuantity(1);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !user?.id) return;

    if (!sourceId || !targetId) {
      toast({
        title: 'Validation Error',
        description: 'Please select source and target locations',
        variant: 'destructive',
      });
      return;
    }

    if (sourceId === targetId) {
      toast({
        title: 'Validation Error',
        description: 'Source and target cannot be the same',
        variant: 'destructive',
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one item to transfer',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Create transfer records for each item
      const transfers = items.map(item => ({
        tenant_id: tenant.id,
        from_branch_id: sourceId,
        to_branch_id: targetId,
        // FK -> branch_inventory.id
        inventory_id: item.inventoryId,
        quantity: item.quantity,
        status: requiresApproval ? 'pending' : 'in_transit',
        requires_approval: requiresApproval,
        requested_by: user.id,
        notes,
      }));

      const { error } = await supabase
        .from('stock_transfers')
        .insert(transfers);

      if (error) throw error;

      toast({
        title: requiresApproval ? 'Transfer Submitted for Approval' : 'Transfer Initiated',
        description: requiresApproval 
          ? 'A manager will review this transfer request.' 
          : 'Stock transfer has been initiated.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create transfer',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderLocationOption = (location: Location) => {
    const Icon = typeIcons[location.type] || Store;
    return (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span>{location.name}</span>
        <Badge variant="outline" className="text-xs">{location.type}</Badge>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Move Stock</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source and Target Selection */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
            <div className="space-y-2">
              <Label>Source Location *</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {locations.filter(l => l.id !== targetId).map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {renderLocationOption(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="pb-2">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <Label>Target Location *</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {locations.filter(l => l.id !== sourceId).map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {renderLocationOption(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Approval Warning */}
          {requiresApproval && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                This transfer requires manager approval because the source is a Warehouse.
              </AlertDescription>
            </Alert>
          )}

          {/* Add Items Section */}
          {sourceId && (
            <div className="space-y-4">
              <Label>Add Items</Label>
              <div className="flex gap-2">
                <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInventory.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>{item.product_name}</span>
                          <span className="text-muted-foreground">({item.current_stock} available)</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                  className="w-24"
                  placeholder="Qty"
                />
                <Button type="button" onClick={addItem} disabled={!selectedInventoryId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-muted-foreground">{item.sku}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">x {item.quantity}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this transfer..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || items.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {requiresApproval ? 'Submit for Approval' : 'Create Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
