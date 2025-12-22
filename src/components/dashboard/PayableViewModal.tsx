import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Building2, FileText, Calendar, DollarSign, AlertTriangle, CheckCircle, Clock, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface AccountPayable {
  id: string;
  vendor_name: string;
  description: string | null;
  amount_zmw: number;
  due_date: string | null;
  status: string;
  invoice_reference: string | null;
  paid_date: string | null;
  paid_amount: number | null;
  notes: string | null;
  created_at: string;
}

interface PayableViewModalProps {
  payable: AccountPayable | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PayableViewModal({ payable, isOpen, onClose }: PayableViewModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!payable) return null;

  const isOverdue = payable.due_date && new Date(payable.due_date) < new Date() && payable.status !== "paid";

  const handleDownloadPDF = async () => {
    const printContent = contentRef.current;
    if (!printContent) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`payable-${payable.vendor_name}-${format(new Date(payable.created_at), "yyyy-MM-dd")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusBadge = () => {
    if (isOverdue) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</Badge>;
    }
    switch (payable.status) {
      case "paid":
        return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
      case "partial":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Partial</Badge>;
      default:
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Payable Details
          </DialogTitle>
        </DialogHeader>

        <div ref={contentRef} className="space-y-6 bg-white p-4 rounded-lg">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-bold text-[#004B8D]">Finch Investments Ltd</h2>
            <p className="text-sm text-muted-foreground">Accounts Payable Record</p>
          </div>

          {/* Vendor Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Vendor Information</h4>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Vendor Name</p>
                  <p className="font-medium">{payable.vendor_name}</p>
                </div>
              </div>
              {payable.invoice_reference && (
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Invoice Reference</p>
                    <p className="font-medium">{payable.invoice_reference}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Amount & Status */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Payment Details</h4>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Amount Due
                </span>
                <span className="font-bold text-xl">K{Number(payable.amount_zmw).toLocaleString()}</span>
              </div>
              {payable.paid_amount && payable.paid_amount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-medium text-green-600">K{Number(payable.paid_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                {getStatusBadge()}
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dates</h4>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created On</p>
                  <p className="font-medium">{format(new Date(payable.created_at), "MMM d, yyyy")}</p>
                </div>
              </div>
              {payable.due_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className={`font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                      {format(new Date(payable.due_date), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              )}
              {payable.paid_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Paid On</p>
                    <p className="font-medium text-green-600">{format(new Date(payable.paid_date), "MMM d, yyyy")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {payable.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description</h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm">{payable.description}</p>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {payable.notes && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-xs text-amber-600 font-medium mb-1">Notes</p>
              <p className="text-amber-800 text-sm">{payable.notes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isDownloading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
