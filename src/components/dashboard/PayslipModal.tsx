import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { TenantDocumentHeader } from "./TenantDocumentHeader";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PayrollRecord {
  id: string;
  employee_id: string | null;
  pay_period_start: string;
  pay_period_end: string;
  basic_salary: number;
  allowances: number;
  overtime_pay: number;
  bonus: number;
  napsa_deduction: number;
  paye_deduction: number;
  other_deductions: number;
  loan_deduction: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: string;
  paid_date: string | null;
  employee_name?: string;
}

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payroll: PayrollRecord | null;
}

export const PayslipModal = ({ isOpen, onClose, payroll }: PayslipModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!payroll) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!printRef.current) return;
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      pdf.save(`payslip-${format(new Date(payroll.pay_period_start), "yyyy-MM")}.pdf`);
    } catch (error) {
      console.error("PDF generation error:", error);
    }
  };

  const periodLabel = `${format(new Date(payroll.pay_period_start), "MMMM yyyy")}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Payslip</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Button size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="bg-white p-6 space-y-6">
          <TenantDocumentHeader documentType="PAYSLIP" documentNumber={`PAYSLIP-${format(new Date(payroll.pay_period_start), "yyyyMM")}`} />

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">PAYSLIP</h2>
            <p className="text-muted-foreground">Pay Period: {periodLabel}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Employee Name</div>
              <div className="font-medium">{payroll.employee_name || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="font-medium capitalize">{payroll.status}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Period Start</div>
              <div className="font-medium">{format(new Date(payroll.pay_period_start), "dd MMM yyyy")}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Period End</div>
              <div className="font-medium">{format(new Date(payroll.pay_period_end), "dd MMM yyyy")}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Earnings */}
            <div>
              <h3 className="font-semibold mb-3 text-green-700">Earnings</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">Basic Salary</td>
                    <td className="text-right py-2">K{payroll.basic_salary.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Allowances</td>
                    <td className="text-right py-2">K{payroll.allowances.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Overtime Pay</td>
                    <td className="text-right py-2">K{payroll.overtime_pay.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Bonus</td>
                    <td className="text-right py-2">K{payroll.bonus.toLocaleString()}</td>
                  </tr>
                  <tr className="font-bold bg-green-50">
                    <td className="py-2">Gross Pay</td>
                    <td className="text-right py-2">K{payroll.gross_pay.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="font-semibold mb-3 text-red-700">Deductions</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">NAPSA (5%)</td>
                    <td className="text-right py-2">K{payroll.napsa_deduction.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">PAYE (Tax)</td>
                    <td className="text-right py-2">K{payroll.paye_deduction.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Loan Deduction</td>
                    <td className="text-right py-2">K{payroll.loan_deduction.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Other Deductions</td>
                    <td className="text-right py-2">K{payroll.other_deductions.toLocaleString()}</td>
                  </tr>
                  <tr className="font-bold bg-red-50">
                    <td className="py-2">Total Deductions</td>
                    <td className="text-right py-2">K{payroll.total_deductions.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Pay */}
          <div className="bg-primary/10 p-4 rounded-lg text-center">
            <div className="text-sm text-muted-foreground mb-1">Net Pay</div>
            <div className="text-3xl font-bold text-primary">K{payroll.net_pay.toLocaleString()}</div>
          </div>

          {payroll.paid_date && (
            <div className="text-center text-sm text-muted-foreground">
              Paid on: {format(new Date(payroll.paid_date), "dd MMMM yyyy")}
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            This is a computer-generated payslip and does not require a signature.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
