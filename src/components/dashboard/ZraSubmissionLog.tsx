import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, CheckCircle, XCircle, Clock, ShieldCheck, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { format } from "date-fns";

export function ZraSubmissionLog() {
  const { tenantId, businessProfile } = useTenant();
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchLogs = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('zra_invoice_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching ZRA logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [tenantId]);

  const handleRetry = async (logId: string) => {
    setRetrying(logId);
    try {
      const { data, error } = await supabase.functions.invoke('zra-smart-invoice', {
        body: { action: 'retry', tenant_id: tenantId, log_id: logId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Retry Successful", description: "The invoice was successfully submitted to ZRA." });
      } else {
        toast({ title: "Retry Failed", description: data?.error || "Could not resubmit to ZRA.", variant: "destructive" });
      }
      fetchLogs();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setRetrying(null);
    }
  };

  const zraEnabled = (businessProfile as any)?.zra_vsdc_enabled;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  if (!zraEnabled) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">ZRA Smart Invoice Not Enabled</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Enable ZRA VSDC integration in Settings → ZRA Smart Invoice to start seeing submission logs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              ZRA Submission Log
            </CardTitle>
            <CardDescription>Track all invoice submissions to the Zambia Revenue Authority</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No ZRA submissions yet. Submissions will appear here once you record sales.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fiscal Receipt #</TableHead>
                    <TableHead>SDC ID</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.invoice_num}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{log.flag}</Badge>
                      </TableCell>
                      <TableCell>{statusBadge(log.status)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.fiscal_data?.ysdcrecnum || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.fiscal_data?.ysdcid || '—'}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {log.related_table || '—'}
                      </TableCell>
                      <TableCell>
                        {log.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(log.id)}
                            disabled={retrying === log.id}
                          >
                            {retrying === log.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            <span className="ml-1">Retry</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {logs.some(l => l.status === 'failed') && (
            <p className="text-xs text-muted-foreground mt-4">
              💡 Failed submissions can be retried. Check your VSDC connection in Settings if retries keep failing.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
