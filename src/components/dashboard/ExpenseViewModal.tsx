import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Receipt, Building2, Calendar, Tag, Image, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { TenantDocumentHeader, DocumentComplianceFooter } from "./TenantDocumentHeader";

interface Expense {
  id: string;
  category: string;
  vendor_name: string;
  amount_zmw: number;
  date_incurred: string;
  notes: string | null;
  receipt_image_url?: string | null;
  created_at?: string;
}

interface ExpenseViewModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  "Cost of Goods Sold - Supplier": "bg-blue-100 text-blue-700 border-blue-200",
  "Salaries": "bg-purple-100 text-purple-700 border-purple-200",
  "Marketing": "bg-pink-100 text-pink-700 border-pink-200",
  "Operations/Rent": "bg-orange-100 text-orange-700 border-orange-200",
  "Other": "bg-gray-100 text-gray-700 border-gray-200",
};

export function ExpenseViewModal({ expense, isOpen, onClose }: ExpenseViewModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!expense) return null;

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
      pdf.save(`expense-${expense.vendor_name}-${format(new Date(expense.date_incurred), "yyyy-MM-dd")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Expense Details
          </DialogTitle>
        </DialogHeader>

        <div ref={contentRef} className="space-y-6 bg-white p-4 rounded-lg">
          {/* Header */}
          <TenantDocumentHeader 
            documentType="EXPENSE RECORD" 
            variant="centered"
          />

          {/* Category & Amount */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className={categoryColors[expense.category] || categoryColors["Other"]}>
                <Tag className="w-3 h-3 mr-1" />
                {expense.category}
              </Badge>
              <span className="font-bold text-xl">K{Number(expense.amount_zmw).toLocaleString()}</span>
            </div>
          </div>

          <Separator />

          {/* Vendor Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Vendor Information</h4>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Vendor Name</p>
                  <p className="font-medium">{expense.vendor_name}</p>
                </div>
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
                  <p className="text-xs text-muted-foreground">Date Incurred</p>
                  <p className="font-medium">{format(new Date(expense.date_incurred), "MMM d, yyyy")}</p>
                </div>
              </div>
              {expense.created_at && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Recorded On</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(expense.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notes</h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm">{expense.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Receipt Image */}
          {expense.receipt_image_url && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Receipt
                </h4>
                <div className="bg-muted/50 rounded-lg p-2">
                  <a 
                    href={expense.receipt_image_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View Receipt Image
                  </a>
                </div>
              </div>
            </>
          )}

          {/* Compliance Footer */}
          <DocumentComplianceFooter />
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
