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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Loader2, Store, Warehouse, Factory } from 'lucide-react';
import { Location, LocationType } from './LocationsManager';

interface LocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
  onSuccess: () => void;
}

const locationTypes: { value: LocationType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'Store', label: 'Store', icon: Store, description: 'Retail location for customer sales' },
  { value: 'Warehouse', label: 'Warehouse', icon: Warehouse, description: 'Bulk storage facility' },
  { value: 'Production', label: 'Production', icon: Factory, description: 'Manufacturing or assembly site' },
];

export const LocationModal: React.FC<LocationModalProps> = ({
  open,
  onOpenChange,
  location,
  onSuccess,
}) => {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    type: 'Store' as LocationType,
    is_headquarters: false,
    is_active: true,
  });

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        code: location.code || '',
        address: location.address || '',
        city: location.city || '',
        phone: location.phone || '',
        email: location.email || '',
        type: location.type || 'Store',
        is_headquarters: location.is_headquarters || false,
        is_active: location.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        type: 'Store',
        is_headquarters: false,
        is_active: true,
      });
    }
  }, [location, open]);

  const generateCode = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      code: prev.code || generateCode(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;

    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Location name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const locationData = {
        tenant_id: tenant.id,
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        type: formData.type,
        is_headquarters: formData.is_headquarters,
        is_active: formData.is_active,
      };

      if (location) {
        const { error } = await supabase
          .from('branches')
          .update(locationData)
          .eq('id', location.id);

        if (error) throw error;

        toast({
          title: 'Location Updated',
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        const { error } = await supabase
          .from('branches')
          .insert(locationData);

        if (error) throw error;

        toast({
          title: 'Location Created',
          description: `${formData.name} has been created successfully.`,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving location:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save location',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {location ? 'Edit Location' : 'Add New Location'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Main Warehouse"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Location Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g., WH-01"
                maxLength={10}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Location Type *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: LocationType) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {locationTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {locationTypes.find(t => t.value === formData.type)?.description}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Street address"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., Lusaka"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+260 XXX XXX XXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="warehouse@company.com"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Switch
                id="is_headquarters"
                checked={formData.is_headquarters}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_headquarters: checked }))}
              />
              <Label htmlFor="is_headquarters" className="cursor-pointer">
                Headquarters
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
            </div>
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {location ? 'Update Location' : 'Create Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
