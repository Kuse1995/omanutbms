import React, { useState, memo } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, Download, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUpload, UploadJob, FailedItem } from '@/contexts/UploadContext';
import { cn } from '@/lib/utils';

function downloadFailedItemsCSV(job: UploadJob) {
  if (!job.failedItems?.length) return;
  
  const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
  
  const csv = [
    'Row,SKU,Name,Error',
    ...job.failedItems.map(item => 
      `${item.rowIndex},${escapeCSV(item.sku)},${escapeCSV(item.name)},${escapeCSV(item.error)}`
    )
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `failed-items-${job.fileName.replace(/\.[^/.]+$/, '')}-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download failed items in a ready-to-import format
function downloadRetryCSV(job: UploadJob) {
  if (!job.failedItems?.length) return;
  
  const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
  
  const csv = [
    'sku,name,current_stock,unit_price,cost_price,reorder_level,category,description',
    ...job.failedItems.map(item => 
      `${escapeCSV(item.sku || '')},${escapeCSV(item.name)},0,0,0,10,,`
    )
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `retry-import-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function FailedItemsSection({ failedItems }: { failedItems: FailedItem[] }) {
  const displayItems = failedItems.slice(0, 10);
  const remainingCount = failedItems.length - displayItems.length;

  return (
    <div className="mt-2 border rounded-md bg-muted/30">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="h-8 px-2 w-12">Row</TableHead>
            <TableHead className="h-8 px-2">SKU</TableHead>
            <TableHead className="h-8 px-2">Name</TableHead>
            <TableHead className="h-8 px-2">Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayItems.map((item, idx) => (
            <TableRow key={idx} className="text-xs">
              <TableCell className="py-1.5 px-2 font-mono">{item.rowIndex}</TableCell>
              <TableCell className="py-1.5 px-2 font-mono truncate max-w-[80px]" title={item.sku}>
                {item.sku}
              </TableCell>
              <TableCell className="py-1.5 px-2 truncate max-w-[100px]" title={item.name}>
                {item.name}
              </TableCell>
              <TableCell className="py-1.5 px-2 text-destructive truncate max-w-[120px]" title={item.error}>
                {item.error}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {remainingCount > 0 && (
        <p className="text-xs text-muted-foreground px-2 py-1.5 border-t">
          + {remainingCount} more failed items (download CSV for full list)
        </p>
      )}
    </div>
  );
}

function UploadJobItem({ job, onCancel }: { job: UploadJob; onCancel: (id: string) => void }) {
  const [showDetails, setShowDetails] = useState(false);
  const progress = job.totalItems > 0 
    ? Math.round((job.processedItems / job.totalItems) * 100) 
    : 0;

  const getStatusIcon = () => {
    switch (job.status) {
      case 'processing':
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'pending':
        return 'Waiting...';
      case 'processing':
        return `${job.processedItems}/${job.totalItems} items`;
      case 'completed':
        return job.results 
          ? `${job.results.added} added, ${job.results.updated} updated`
          : 'Complete';
      case 'failed':
        return job.error || 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return '';
    }
  };

  const hasFailedItems = job.status === 'completed' && job.failedItems && job.failedItems.length > 0;

  return (
    <div className="p-3 border-b last:border-b-0">
      <div className="flex items-start gap-2">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate">{job.fileName}</p>
            {(job.status === 'pending' || job.status === 'processing') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => onCancel(job.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{getStatusText()}</p>
          {(job.status === 'processing' || job.status === 'pending') && (
            <Progress value={progress} className="h-1.5 mt-2" />
          )}
          
          {hasFailedItems && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700">
                    <Eye className="h-3 w-3 mr-1" />
                    {job.failedItems!.length} item(s) failed
                    {showDetails ? (
                      <ChevronUp className="h-3 w-3 ml-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => downloadFailedItemsCSV(job)}
                  title="Download error details for failed items"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Errors
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => downloadRetryCSV(job)}
                  title="Download failed items in import-ready format"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry CSV
                </Button>
              </div>
              <CollapsibleContent>
                <FailedItemsSection failedItems={job.failedItems!} />
              </CollapsibleContent>
            </Collapsible>
          )}
          
          {job.status === 'completed' && job.results?.failed > 0 && !hasFailedItems && (
            <p className="text-xs text-amber-600 mt-1">
              {job.results.failed} item(s) failed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export const UploadProgressIndicator = memo(function UploadProgressIndicator() {
  const { activeUploads, hasActiveUploads, cancelUpload, clearCompletedUploads } = useUpload();
  const [isOpen, setIsOpen] = useState(false);

  const processingCount = activeUploads.filter(
    j => j.status === 'pending' || j.status === 'processing'
  ).length;

  const completedCount = activeUploads.filter(
    j => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled'
  ).length;

  if (activeUploads.length === 0) {
    return null;
  }

  // Calculate overall progress for processing jobs
  const processingJobs = activeUploads.filter(j => j.status === 'processing');
  const overallProgress = processingJobs.length > 0
    ? Math.round(
        processingJobs.reduce((sum, j) => sum + (j.processedItems / j.totalItems) * 100, 0) / 
        processingJobs.length
      )
    : 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 relative",
            hasActiveUploads && "border-primary/50 bg-primary/5"
          )}
        >
          {hasActiveUploads ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {hasActiveUploads ? `Uploading ${overallProgress}%` : 'Uploads'}
          </span>
          <Badge 
            variant={hasActiveUploads ? "default" : "secondary"} 
            className="h-5 min-w-[20px] px-1.5"
          >
            {processingCount > 0 ? processingCount : completedCount}
          </Badge>
          {isOpen ? (
            <ChevronUp className="h-3 w-3 opacity-50" />
          ) : (
            <ChevronDown className="h-3 w-3 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
          <h4 className="text-sm font-medium">Upload Progress</h4>
          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={clearCompletedUploads}
            >
              Clear completed
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {activeUploads.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No active uploads
            </p>
          ) : (
            activeUploads.map(job => (
              <UploadJobItem 
                key={job.id} 
                job={job} 
                onCancel={cancelUpload}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
});
