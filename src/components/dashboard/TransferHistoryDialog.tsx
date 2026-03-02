import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, History, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface TransferHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferId: string | null;
  productName?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_by: string | null;
  changed_at: string;
  changer_name?: string;
}

// Fields we care about showing diffs for
const TRACKED_FIELDS: Record<string, string> = {
  quantity: 'Quantity',
  to_branch_id: 'Target Location',
  notes: 'Notes',
  status: 'Status',
  approved_by: 'Approved By',
  rejection_reason: 'Rejection Reason',
};

export const TransferHistoryDialog: React.FC<TransferHistoryDialogProps> = ({
  open,
  onOpenChange,
  transferId,
  productName,
}) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [branchMap, setBranchMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && transferId) {
      fetchHistory();
    }
  }, [open, transferId]);

  const fetchHistory = async () => {
    if (!transferId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('table_name', 'stock_transfers')
        .eq('record_id', transferId)
        .order('changed_at', { ascending: true });

      if (error) throw error;

      // Fetch changer names
      const changerIds = [...new Set((data || []).map(e => e.changed_by).filter(Boolean))];
      let nameMap: Record<string, string> = {};
      if (changerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', changerIds);
        nameMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.full_name || 'Unknown';
          return acc;
        }, {} as Record<string, string>);
      }

      // Fetch branch names for ID resolution
      const branchIds = new Set<string>();
      (data || []).forEach(e => {
        const old_d = e.old_data as Record<string, any> | null;
        const new_d = e.new_data as Record<string, any> | null;
        if (old_d?.to_branch_id) branchIds.add(old_d.to_branch_id);
        if (new_d?.to_branch_id) branchIds.add(new_d.to_branch_id);
        if (old_d?.from_branch_id) branchIds.add(old_d.from_branch_id);
        if (new_d?.from_branch_id) branchIds.add(new_d.from_branch_id);
      });

      if (branchIds.size > 0) {
        const { data: branches } = await supabase
          .from('branches')
          .select('id, name')
          .in('id', Array.from(branchIds));
        const bMap = (branches || []).reduce((acc, b) => {
          acc[b.id] = b.name;
          return acc;
        }, {} as Record<string, string>);
        setBranchMap(bMap);
      }

      setEntries((data || []).map(e => ({
        ...e,
        old_data: e.old_data as Record<string, any> | null,
        new_data: e.new_data as Record<string, any> | null,
        changer_name: e.changed_by ? nameMap[e.changed_by] || 'System' : 'System',
      })));
    } catch (error) {
      console.error('Error fetching audit history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (field: string, value: any): string => {
    if (value === null || value === undefined) return '—';
    if (field === 'to_branch_id' || field === 'from_branch_id') {
      return branchMap[value] || value;
    }
    if (typeof value === 'string' && value.length > 80) {
      return value.slice(0, 80) + '…';
    }
    return String(value);
  };

  const getChangedFields = (entry: AuditEntry) => {
    if (entry.action === 'INSERT') return [];
    if (!entry.old_data || !entry.new_data) return [];

    const changes: { field: string; label: string; oldVal: string; newVal: string }[] = [];
    for (const [key, label] of Object.entries(TRACKED_FIELDS)) {
      const oldVal = entry.old_data[key];
      const newVal = entry.new_data[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: key,
          label,
          oldVal: formatValue(key, oldVal),
          newVal: formatValue(key, newVal),
        });
      }
    }
    return changes;
  };

  const actionLabel = (action: string) => {
    switch (action) {
      case 'INSERT': return 'Created';
      case 'UPDATE': return 'Edited';
      case 'DELETE': return 'Deleted';
      default: return action;
    }
  };

  const actionVariant = (action: string) => {
    switch (action) {
      case 'INSERT': return 'default' as const;
      case 'UPDATE': return 'outline' as const;
      case 'DELETE': return 'destructive' as const;
      default: return 'secondary' as const;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transfer History {productName && `— ${productName}`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No audit history found.</p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {entries.map((entry) => {
                const changes = getChangedFields(entry);
                return (
                  <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={actionVariant(entry.action)}>{actionLabel(entry.action)}</Badge>
                        <span className="text-sm font-medium">{entry.changer_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.changed_at), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>

                    {entry.action === 'INSERT' && (
                      <p className="text-sm text-muted-foreground">Transfer created</p>
                    )}

                    {changes.length > 0 && (
                      <div className="space-y-1.5">
                        {changes.map((c) => (
                          <div key={c.field} className="text-sm flex items-start gap-1.5">
                            <span className="font-medium text-foreground shrink-0">{c.label}:</span>
                            <span className="text-muted-foreground line-through">{c.oldVal}</span>
                            <ArrowRight className="h-3 w-3 mt-1 shrink-0 text-muted-foreground" />
                            <span className="text-foreground">{c.newVal}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {entry.action === 'UPDATE' && changes.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No tracked fields changed</p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
