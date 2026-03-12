import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportElementToPDF } from "@/lib/pdf-utils";
import * as XLSX from "xlsx";

interface ZraLogEntry {
  id: string;
  invoice_num: string;
  flag: string;
  status: string;
  created_at: string;
  error_message: string | null;
  fiscal_data: any;
  zra_response: any;
  related_table: string | null;
  related_id: string | null;
}

export function ZraTransactionReport() {
  const [logs, setLogs] = useState<ZraLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFlag, setFilterFlag] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { tenant } = useTenant();
  const { toast } = useToast();

  const fetchLogs = async () => {
    if (!tenant?.id) return;
    setLoading(true);

    let query = supabase
      .from("zra_invoice_log")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (filterFlag !== "all") query = query.eq("flag", filterFlag);
    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error loading ZRA logs", description: error.message, variant: "destructive" });
    }
    setLogs((data as ZraLogEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [tenant?.id, filterFlag, filterStatus, dateFrom, dateTo]);

  const filtered = logs.filter(log =>
    !search || log.invoice_num?.toLowerCase().includes(search.toLowerCase())
  );

  const flagLabel = (flag: string) => {
    switch (flag) {
      case 'INVOICE': return 'Sale';
      case 'REFUND': return 'Credit Note';
      case 'DEBIT': return 'Debit Note';
      case 'PURCHASE': return 'Purchase';
      default: return flag;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'success': return 'default';
      case 'failed': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const handleExportExcel = () => {
    const rows = filtered.map(log => ({
      'Invoice Number': log.invoice_num,
      'Type': flagLabel(log.flag),
      'Status': log.status,
      'Date': format(new Date(log.created_at), "yyyy-MM-dd HH:mm"),
      'Fiscal Receipt #': log.fiscal_data?.ysdcrecnum || '',
      'SDC ID': log.fiscal_data?.ysdcid || '',
      'SDC Time': log.fiscal_data?.ysdctime || '',
      'Error': log.error_message || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ZRA Transactions");
    XLSX.writeFile(wb, `ZRA_Transaction_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = filtered.map(log => ({
      'Invoice Number': log.invoice_num,
      'Type': flagLabel(log.flag),
      'Status': log.status,
      'Date': format(new Date(log.created_at), "yyyy-MM-dd HH:mm"),
      'Fiscal Receipt #': log.fiscal_data?.ysdcrecnum || '',
      'SDC ID': log.fiscal_data?.ysdcid || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ZRA_Transaction_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    const el = document.getElementById('zra-report-table');
    if (!el) return;
    await exportElementToPDF({ element: el, filename: `ZRA_Transaction_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf` });
  };

  const successCount = filtered.filter(l => l.status === 'success').length;
  const failedCount = filtered.filter(l => l.status === 'failed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-foreground">ZRA Transaction Report</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileText className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">Total Transactions</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{successCount}</p>
          <p className="text-xs text-muted-foreground">Successful</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{failedCount}</p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{filtered.filter(l => l.status === 'pending').length}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search invoice number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterFlag} onValueChange={setFilterFlag}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="INVOICE">Sales</SelectItem>
                <SelectItem value="REFUND">Credit Notes</SelectItem>
                <SelectItem value="DEBIT">Debit Notes</SelectItem>
                <SelectItem value="PURCHASE">Purchases</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" placeholder="From" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" placeholder="To" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div id="zra-report-table" className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Fiscal Receipt #</TableHead>
                    <TableHead>SDC ID</TableHead>
                    <TableHead>SDC Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No ZRA transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{log.invoice_num}</TableCell>
                        <TableCell>{flagLabel(log.flag)}</TableCell>
                        <TableCell>
                          <Badge variant={statusColor(log.status) as any}>{log.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{format(new Date(log.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                        <TableCell className="font-mono text-sm">{log.fiscal_data?.ysdcrecnum || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{log.fiscal_data?.ysdcid || '-'}</TableCell>
                        <TableCell className="text-sm">{log.fiscal_data?.ysdctime || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
