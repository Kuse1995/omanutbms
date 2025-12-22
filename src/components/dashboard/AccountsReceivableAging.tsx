import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileSpreadsheet, Download, AlertTriangle, Clock, CheckCircle, Mail, Send } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  status: string;
}

interface AgingBucket {
  label: string;
  min: number;
  max: number;
  invoices: Invoice[];
  total: number;
  color: string;
  bgColor: string;
}

const AccountsReceivableAging = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [sendingBulk, setSendingBulk] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, client_name, client_email, invoice_date, due_date, total_amount, status")
        .neq("status", "paid")
        .order("due_date", { ascending: true });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysOverdue = (invoice: Invoice): number => {
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : new Date(invoice.invoice_date);
    return differenceInDays(new Date(), dueDate);
  };

  const agingBuckets: AgingBucket[] = [
    { label: "Current", min: -Infinity, max: 0, invoices: [], total: 0, color: "text-green-700", bgColor: "bg-green-50 border-green-200" },
    { label: "1-30 Days", min: 1, max: 30, invoices: [], total: 0, color: "text-yellow-700", bgColor: "bg-yellow-50 border-yellow-200" },
    { label: "31-60 Days", min: 31, max: 60, invoices: [], total: 0, color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200" },
    { label: "61-90 Days", min: 61, max: 90, invoices: [], total: 0, color: "text-red-600", bgColor: "bg-red-50 border-red-200" },
    { label: "90+ Days", min: 91, max: Infinity, invoices: [], total: 0, color: "text-red-800", bgColor: "bg-red-100 border-red-300" },
  ];

  // Categorize invoices into buckets
  invoices.forEach((invoice) => {
    const daysOverdue = getDaysOverdue(invoice);
    for (const bucket of agingBuckets) {
      if (daysOverdue >= bucket.min && daysOverdue <= bucket.max) {
        bucket.invoices.push(invoice);
        bucket.total += Number(invoice.total_amount);
        break;
      }
    }
  });

  const totalReceivables = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalOverdue = agingBuckets
    .filter((b) => b.min > 0)
    .reduce((sum, b) => sum + b.total, 0);

  const handleDownloadPDF = async () => {
    const element = document.getElementById("ar-aging-content");
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`ar-aging-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const sendReminder = async (invoice: Invoice) => {
    if (!invoice.client_email) {
      toast.error("No email address for this client");
      return;
    }

    const daysOverdue = getDaysOverdue(invoice);
    if (daysOverdue <= 0) {
      toast.error("Invoice is not yet overdue");
      return;
    }

    setSendingReminder(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-invoice-reminder", {
        body: {
          invoiceNumber: invoice.invoice_number,
          clientName: invoice.client_name,
          clientEmail: invoice.client_email,
          amount: Number(invoice.total_amount),
          dueDate: invoice.due_date ? format(new Date(invoice.due_date), "dd MMM yyyy") : "N/A",
          daysOverdue,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(`Reminder sent to ${invoice.client_email}`);
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      toast.error(error.message || "Failed to send reminder");
    } finally {
      setSendingReminder(null);
    }
  };

  const sendBulkReminders = async () => {
    const overdueWithEmail = invoices.filter(
      (inv) => inv.client_email && getDaysOverdue(inv) > 0
    );

    if (overdueWithEmail.length === 0) {
      toast.error("No overdue invoices with email addresses");
      return;
    }

    setSendingBulk(true);
    let successCount = 0;
    let failCount = 0;

    for (const invoice of overdueWithEmail) {
      try {
        const daysOverdue = getDaysOverdue(invoice);
        const { data, error } = await supabase.functions.invoke("send-invoice-reminder", {
          body: {
            invoiceNumber: invoice.invoice_number,
            clientName: invoice.client_name,
            clientEmail: invoice.client_email,
            amount: Number(invoice.total_amount),
            dueDate: invoice.due_date ? format(new Date(invoice.due_date), "dd MMM yyyy") : "N/A",
            daysOverdue,
          },
        });

        if (error || !data.success) {
          failCount++;
        } else {
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    setSendingBulk(false);
    toast.success(`Sent ${successCount} reminders${failCount > 0 ? `, ${failCount} failed` : ""}`);
  };

  const overdueCount = invoices.filter((inv) => getDaysOverdue(inv) > 0 && inv.client_email).length;

  const getAgingBadge = (daysOverdue: number) => {
    if (daysOverdue <= 0) {
      return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Current</Badge>;
    } else if (daysOverdue <= 30) {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />{daysOverdue}d</Badge>;
    } else if (daysOverdue <= 60) {
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200"><Clock className="h-3 w-3 mr-1" />{daysOverdue}d</Badge>;
    } else {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{daysOverdue}d</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#004B8D]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <FileSpreadsheet className="h-6 w-6 text-[#004B8D]" />
          <div>
            <h3 className="text-lg font-semibold text-[#003366]">Accounts Receivable Aging</h3>
            <p className="text-sm text-muted-foreground">Track overdue invoices and improve cash flow</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <Button
              onClick={sendBulkReminders}
              disabled={sendingBulk}
              className="bg-amber-600 hover:bg-amber-700"
              size="sm"
            >
              {sendingBulk ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send All Reminders ({overdueCount})
            </Button>
          )}
          <Button onClick={handleDownloadPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div id="ar-aging-content" className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {agingBuckets.map((bucket) => (
            <Card key={bucket.label} className={`${bucket.bgColor} border`}>
              <CardContent className="py-4">
                <p className={`text-xs font-medium ${bucket.color}`}>{bucket.label}</p>
                <p className={`text-xl font-bold ${bucket.color}`}>
                  K{bucket.total.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{bucket.invoices.length} invoices</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Receivables</p>
                  <p className="text-2xl font-bold text-blue-800">K{totalReceivables.toLocaleString()}</p>
                </div>
                <FileSpreadsheet className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className={`bg-gradient-to-br ${totalOverdue > 0 ? 'from-red-50 to-orange-50 border-red-200' : 'from-green-50 to-emerald-50 border-green-200'}`}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${totalOverdue > 0 ? 'text-red-700' : 'text-green-700'}`}>Total Overdue</p>
                  <p className={`text-2xl font-bold ${totalOverdue > 0 ? 'text-red-800' : 'text-green-800'}`}>K{totalOverdue.toLocaleString()}</p>
                </div>
                {totalOverdue > 0 ? (
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-400" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Invoice List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Outstanding Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No outstanding invoices. All caught up!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const daysOverdue = getDaysOverdue(invoice);
                    return (
                      <TableRow key={invoice.id} className={daysOverdue > 60 ? "bg-red-50/50" : ""}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.client_name}</p>
                            {invoice.client_email && (
                              <p className="text-xs text-muted-foreground">{invoice.client_email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(invoice.invoice_date), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          {invoice.due_date ? format(new Date(invoice.due_date), "dd MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell className="font-medium">K{Number(invoice.total_amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{invoice.status}</Badge>
                        </TableCell>
                        <TableCell>{getAgingBadge(daysOverdue)}</TableCell>
                        <TableCell>
                          {daysOverdue > 0 && invoice.client_email ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendReminder(invoice)}
                              disabled={sendingReminder === invoice.id}
                              className="text-amber-600 border-amber-300 hover:bg-amber-50"
                            >
                              {sendingReminder === invoice.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Mail className="h-3 w-3 mr-1" />
                              )}
                              Remind
                            </Button>
                          ) : daysOverdue > 0 ? (
                            <span className="text-xs text-muted-foreground">No email</span>
                          ) : (
                            <span className="text-xs text-green-600">Not due</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountsReceivableAging;
