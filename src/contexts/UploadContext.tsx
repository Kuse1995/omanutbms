import React, { createContext, useContext, useState, useCallback, useRef, useMemo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadJob {
  id: string;
  type: 'inventory' | 'employees' | 'customers';
  fileName: string;
  totalItems: number;
  processedItems: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  results?: { added: number; updated: number; failed: number };
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

interface InventoryRow {
  sku: string;
  name: string;
  current_stock: number;
  unit_price: number;
  cost_price: number;
  reorder_level: number;
  liters_per_unit: number;
  description: string;
  category: string;
}

interface UploadOptions {
  tenantId: string;
  targetBranchId?: string;
  onSuccess?: () => void;
}

interface UploadContextType {
  activeUploads: UploadJob[];
  hasActiveUploads: boolean;
  startInventoryUpload: (
    fileName: string,
    rows: InventoryRow[],
    options: UploadOptions
  ) => Promise<string>;
  cancelUpload: (jobId: string) => void;
  clearCompletedUploads: () => void;
  getUploadProgress: (jobId: string) => number;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

const BATCH_SIZE = 50;

function generateAutoSku(): string {
  return `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

interface UploadProviderProps {
  children: ReactNode;
}

export function UploadProvider({ children }: UploadProviderProps) {
  const [uploads, setUploads] = useState<UploadJob[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const updateUpload = useCallback((jobId: string, updates: Partial<UploadJob>) => {
    setUploads(prev => prev.map(job => 
      job.id === jobId ? { ...job, ...updates } : job
    ));
  }, []);

  const startInventoryUpload = useCallback(async (
    fileName: string,
    rows: InventoryRow[],
    options: UploadOptions
  ): Promise<string> => {
    const jobId = crypto.randomUUID();
    const abortController = new AbortController();
    abortControllersRef.current.set(jobId, abortController);

    const job: UploadJob = {
      id: jobId,
      type: 'inventory',
      fileName,
      totalItems: rows.length,
      processedItems: 0,
      status: 'pending',
      startedAt: new Date(),
    };

    setUploads(prev => [...prev, job]);

    // Run the upload in the background
    (async () => {
      try {
        updateUpload(jobId, { status: 'processing' });

        const { tenantId, targetBranchId, onSuccess } = options;
        let added = 0;
        let updated = 0;
        let failed = 0;

        // Phase 1: Get all existing SKUs in one query
        const skuList = rows.filter(r => r.sku).map(r => r.sku);
        let existingSkuMap = new Map<string, string>();

        if (skuList.length > 0) {
          const { data: existingItems } = await supabase
            .from('inventory')
            .select('id, sku')
            .in('sku', skuList)
            .eq('tenant_id', tenantId)
            .eq('is_archived', false);

          if (existingItems) {
            existingSkuMap = new Map(existingItems.map(i => [i.sku, i.id]));
          }
        }

        if (abortController.signal.aborted) {
          updateUpload(jobId, { status: 'cancelled' });
          return;
        }

        // Phase 2: Categorize rows
        const toInsert = rows.filter(r => !r.sku || !existingSkuMap.has(r.sku));
        const toUpdate = rows.filter(r => r.sku && existingSkuMap.has(r.sku));

        let processedCount = 0;

        // Phase 3: Batch insert new items
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
          if (abortController.signal.aborted) {
            updateUpload(jobId, { status: 'cancelled' });
            return;
          }

          const batch = toInsert.slice(i, i + BATCH_SIZE);
          const insertData = batch.map(row => ({
            tenant_id: tenantId,
            sku: row.sku || generateAutoSku(),
            name: row.name,
            current_stock: row.current_stock || 0,
            unit_price: row.unit_price || 0,
            cost_price: row.cost_price || 0,
            reorder_level: row.reorder_level || 10,
            liters_per_unit: row.liters_per_unit || 0,
            description: row.description || null,
            category: row.category || null,
            default_location_id: (targetBranchId && targetBranchId !== 'none' && targetBranchId !== 'central') 
              ? targetBranchId 
              : null,
          }));

          try {
            const { error } = await supabase.from('inventory').insert(insertData);
            if (error) throw error;
            added += batch.length;
          } catch (batchError) {
            // Fallback: try items individually
            for (const item of insertData) {
              try {
                const { error } = await supabase.from('inventory').insert(item);
                if (error) throw error;
                added++;
              } catch {
                failed++;
              }
            }
          }

          processedCount += batch.length;
          updateUpload(jobId, { processedItems: processedCount });
        }

        // Phase 4: Batch update existing items
        for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
          if (abortController.signal.aborted) {
            updateUpload(jobId, { status: 'cancelled' });
            return;
          }

          const batch = toUpdate.slice(i, i + BATCH_SIZE);
          
          // For updates, we need to do them individually since upsert requires the id
          for (const row of batch) {
            try {
              const existingId = existingSkuMap.get(row.sku);
              if (!existingId) {
                failed++;
                continue;
              }

              const updateData: Record<string, any> = {
                name: row.name,
                current_stock: row.current_stock || 0,
                unit_price: row.unit_price || 0,
                cost_price: row.cost_price || 0,
                reorder_level: row.reorder_level || 10,
                liters_per_unit: row.liters_per_unit || 0,
                description: row.description || null,
                category: row.category || null,
              };

              if (targetBranchId && targetBranchId !== 'none') {
                updateData.default_location_id = targetBranchId === 'central' ? null : targetBranchId;
              }

              const { error } = await supabase
                .from('inventory')
                .update(updateData)
                .eq('id', existingId);

              if (error) throw error;
              updated++;
            } catch {
              failed++;
            }
          }

          processedCount += batch.length;
          updateUpload(jobId, { processedItems: processedCount });
        }

        // Complete
        updateUpload(jobId, {
          status: 'completed',
          completedAt: new Date(),
          results: { added, updated, failed },
        });

        // Show completion toast
        if (failed === rows.length) {
          toast.error('Import failed', {
            description: 'All items failed to import. Check permissions.',
          });
        } else if (failed > 0) {
          toast.warning('Import partially complete', {
            description: `${added} added, ${updated} updated, ${failed} failed`,
          });
        } else {
          toast.success('Import complete', {
            description: `${added} added, ${updated} updated`,
          });
        }

        if ((added > 0 || updated > 0) && onSuccess) {
          onSuccess();
        }

      } catch (error: any) {
        console.error('Upload error:', error);
        updateUpload(jobId, {
          status: 'failed',
          error: error?.message || 'Unknown error',
          completedAt: new Date(),
        });
        toast.error('Import failed', {
          description: error?.message || 'An unexpected error occurred',
        });
      } finally {
        abortControllersRef.current.delete(jobId);
      }
    })();

    return jobId;
  }, [updateUpload]);

  const cancelUpload = useCallback((jobId: string) => {
    const controller = abortControllersRef.current.get(jobId);
    if (controller) {
      controller.abort();
      updateUpload(jobId, { status: 'cancelled' });
    }
  }, [updateUpload]);

  const clearCompletedUploads = useCallback(() => {
    setUploads(prev => prev.filter(job => 
      job.status === 'pending' || job.status === 'processing'
    ));
  }, []);

  const getUploadProgress = useCallback((jobId: string): number => {
    const job = uploads.find(u => u.id === jobId);
    if (!job || job.totalItems === 0) return 0;
    return Math.round((job.processedItems / job.totalItems) * 100);
  }, [uploads]);

  const hasActiveUploads = uploads.some(
    job => job.status === 'pending' || job.status === 'processing'
  );

  const contextValue = useMemo(() => ({
    activeUploads: uploads,
    hasActiveUploads,
    startInventoryUpload,
    cancelUpload,
    clearCompletedUploads,
    getUploadProgress,
  }), [uploads, hasActiveUploads, startInventoryUpload, cancelUpload, clearCompletedUploads, getUploadProgress]);

  return (
    <UploadContext.Provider value={contextValue}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload(): UploadContextType {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
