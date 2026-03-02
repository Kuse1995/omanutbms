import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Printer, Mail, CheckCircle } from "lucide-react";
import { exportElementToPDF } from "@/lib/pdf-utils";
import { format } from "date-fns";
import { TenantDocumentHeader, DocumentComplianceFooter } from "./TenantDocumentHeader";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price_zmw: number;
  total_amount_zmw: number;
  item_type: string;
  selected_color?: string | null;
  selected_size?: string | null;
}

interface SalesReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  items: SaleItem[];
  subtotal?: number;
  discountAmount?: number;
  totalAmount: number;
  amountPaid?: number;
  changeAmount?: number;
  paymentMethod: string;
  paymentDate: string;
  litersImpact: number;
}

export function SalesReceiptModal({
  isOpen,
  onClose,
  receiptNumber,
  customerName,
  customerEmail,
  customerPhone,
  items,
  subtotal,
  discountAmount = 0,
  totalAmount,
  amountPaid,
  changeAmount = 0,
  paymentMethod,
  paymentDate,
  litersImpact,
}: SalesReceiptModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { companyName, tagline, isImpactEnabled, impact } = useBusinessConfig();
  const { tenantId } = useTenant();
  const { toast } = useToast();

  const handleSendEmail = async () => {
    if (!customerEmail) return;
    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sales-receipt', {
        body: {
          email: customerEmail,
          receiptNumber,
          customerName: customerName || 'Valued Customer',
          items: items.map(i => ({
            product_name: i.product_name,
            quantity: i.quantity,
            unit_price_zmw: i.unit_price_zmw,
            total_amount_zmw: i.total_amount_zmw,
          })),
          totalAmount,
          paymentMethod,
          paymentDate,
          companyName: companyName || 'Our Store',
          tenantId,
        },
      });
      if (error) throw error;
      toast({ title: "Email Sent", description: `Receipt emailed to ${customerEmail}` });
    } catch (error: any) {
      console.error('Email send error:', error);
      toast({ title: "Email Failed", description: error.message || "Could not send email", variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const formatPaymentMethod = (method: string) => {
    return method.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("sales-receipt-content");
    if (!element) return;

    const isCredit = paymentMethod === "credit_invoice";

    setIsDownloading(true);
    try {
      await exportElementToPDF({
        element,
        filename: `${isCredit ? "invoice" : "receipt"}-${receiptNumber}.pdf`,
      });
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const element = document.getElementById("sales-receipt-content");
    if (!element) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${receiptNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; }
              .header img { height: 60px; margin-bottom: 10px; }
              .header h2 { color: #004B8D; margin: 10px 0 5px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background: #f5f5f5; }
              .total { font-size: 1.2em; font-weight: bold; }
              .impact { background: #e6f7f0; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            ${element.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Check if this is a credit invoice vs a paid receipt
  const isCreditInvoice = paymentMethod === "credit_invoice";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg bg-white text-gray-900 max-h-[90vh] flex flex-col p-3 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-gray-900 text-base sm:text-lg">
            {isCreditInvoice ? "Credit Invoice" : "Sales Receipt"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden -mx-3 px-3 sm:-mx-6 sm:px-6">
          <div id="sales-receipt-content" className="bg-white p-3 sm:p-6 space-y-3 sm:space-y-4 min-w-0">
            <TenantDocumentHeader
              documentType={isCreditInvoice ? "INVOICE" : "RECEIPT"}
              documentNumber={receiptNumber}
              variant="centered"
            />

            <div className={`text-center py-3 sm:py-4 rounded-lg ${isCreditInvoice ? "bg-amber-50" : "bg-green-50"}`}>
              <p className="text-xs sm:text-sm text-gray-600">
                {isCreditInvoice ? "Total Due" : "Amount Paid"}
              </p>
              <p className={`text-2xl sm:text-3xl font-bold ${isCreditInvoice ? "text-amber-600" : "text-green-600"}`}>
                K {totalAmount.toLocaleString()}
              </p>
              {isCreditInvoice && (
                <p className="text-xs text-amber-600 mt-1">Credit Sale - Payment Pending</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">{isCreditInvoice ? "Invoice Number:" : "Receipt Number:"}</span>
                <span className="font-medium">{receiptNumber}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{customerName || "Walk-in Customer"}</span>
              </div>
              {customerEmail && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Email:</span>
                  <span>{customerEmail}</span>
                </div>
              )}
              {customerPhone && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Phone:</span>
                  <span>{customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Payment Date:</span>
                <span>{format(new Date(paymentDate), "dd MMM yyyy")}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Payment Method:</span>
                <span className="capitalize">{formatPaymentMethod(paymentMethod)}</span>
              </div>
            </div>

            {/* Items */}
            <div className="mt-3 sm:mt-4">
              <h4 className="font-semibold text-gray-700 mb-2 text-sm sm:text-base">Items Purchased</h4>
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <table className="w-full text-xs sm:text-sm min-w-[280px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-2">Description</th>
                      <th className="text-center py-2 px-1 whitespace-nowrap">Qty</th>
                      <th className="text-right py-2 px-1 whitespace-nowrap">Price</th>
                      <th className="text-right py-2 pl-1 whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 pr-2 break-words max-w-[120px] sm:max-w-none">
                          <span className="block truncate sm:whitespace-normal">{item.product_name}</span>
                          {(item.selected_color || item.selected_size) && (
                            <span className="text-xs text-gray-500 block">
                              {item.selected_color && item.selected_color}
                              {item.selected_size && ` (${item.selected_size})`}
                            </span>
                          )}
                          {item.item_type === "service" && (
                            <span className="text-xs text-amber-600">[Service]</span>
                          )}
                        </td>
                        <td className="text-center py-2 px-1">{item.quantity}</td>
                        <td className="text-right py-2 px-1 whitespace-nowrap">K {item.unit_price_zmw.toLocaleString()}</td>
                        <td className="text-right py-2 pl-1 whitespace-nowrap">K {item.total_amount_zmw.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {subtotal && discountAmount > 0 && (
                      <>
                        <tr>
                          <td colSpan={3} className="text-right py-1 pr-1 text-gray-600">Subtotal:</td>
                          <td className="text-right py-1 pl-1 whitespace-nowrap">K {subtotal.toLocaleString()}</td>
                        </tr>
                        <tr className="text-green-600">
                          <td colSpan={3} className="text-right py-1 pr-1">Discount:</td>
                          <td className="text-right py-1 pl-1 whitespace-nowrap">-K {discountAmount.toLocaleString()}</td>
                        </tr>
                      </>
                    )}
                    <tr className="font-bold">
                      <td colSpan={3} className="text-right py-2 pr-1">Total:</td>
                      <td className="text-right py-2 pl-1 text-green-600 whitespace-nowrap">K {totalAmount.toLocaleString()}</td>
                    </tr>
                    {amountPaid && amountPaid > 0 && paymentMethod !== "credit_invoice" && (
                      <>
                        <tr>
                          <td colSpan={3} className="text-right py-1 pr-1 text-gray-600">Amount Paid:</td>
                          <td className="text-right py-1 pl-1 whitespace-nowrap">K {amountPaid.toLocaleString()}</td>
                        </tr>
                        {changeAmount > 0 && (
                          <tr className="text-blue-600 font-medium">
                            <td colSpan={3} className="text-right py-1 pr-1">Change:</td>
                            <td className="text-right py-1 pl-1 whitespace-nowrap">K {changeAmount.toLocaleString()}</td>
                          </tr>
                        )}
                      </>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>

            {isImpactEnabled && litersImpact > 0 && (
              <div className="bg-teal-50 text-center py-3 sm:py-4 rounded-lg border border-teal-200">
                <p className="text-xs sm:text-sm text-teal-600">{impact.unitLabel || 'Impact'} Generated</p>
                <p className="text-xl sm:text-2xl font-bold text-teal-700">
                  {litersImpact.toLocaleString()} {impact.unitLabel || 'Units'}
                </p>
                <p className="text-xs text-teal-600 mt-1">
                  Thank you for your contribution!
                </p>
              </div>
            )}

            {/* Compliance Footer */}
            <DocumentComplianceFooter />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="order-last sm:order-first">
            Close
          </Button>
          <div className="flex gap-2 flex-1 sm:flex-none justify-end">
            <Button onClick={handlePrint} variant="outline" className="flex-1 sm:flex-none">
              <Printer className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button
              variant="outline"
              disabled
              className="flex-1 sm:flex-none opacity-60 cursor-not-allowed relative"
            >
              <Mail className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Email</span>
              <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Coming Soon</span>
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="bg-[#004B8D] hover:bg-[#003a6d] flex-1 sm:flex-none"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
