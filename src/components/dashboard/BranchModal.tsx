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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Branch } from '@/hooks/useBranch';
import { Loader2 } from 'lucide-react';

interface BranchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch | null;
  onSuccess: () => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({
  open,
  onOpenChange,
  branch,
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
    is_headquarters: false,
    is_active: true,
  });

  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name || '',
        code: branch.code || '',
        address: branch.address || '',
        city: branch.city || '',
        phone: branch.phone || '',
        email: branch.email || '',
        is_headquarters: branch.is_headquarters || false,
        is_active: branch.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        is_headquarters: false,
        is_active: true,
      });
    }
  }, [branch, open]);

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
        description: 'Branch name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const branchData = {
        tenant_id: tenant.id,
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        is_headquarters: formData.is_headquarters,
        is_active: formData.is_active,
      };

      if (branch) {
        const { error } = await supabase
          .from('branches')
          .update(branchData)
          .eq('id', branch.id);

        if (error) throw error;

        toast({
          title: 'Branch Updated',
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        const { error } = await supabase
          .from('branches')
          .insert(branchData);

        if (error) throw error;

        toast({
          title: 'Branch Created',
          description: `${formData.name} has been created successfully.`,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving branch:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save branch',
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
            {branch ? 'Edit Branch' : 'Add New Branch'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Branch Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Lusaka Main"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Branch Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g., LUS-01"
                maxLength={10}
              />
            </div>
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
              placeholder="branch@company.com"
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
              {branch ? 'Update Branch' : 'Create Branch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
