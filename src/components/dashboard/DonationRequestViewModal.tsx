import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Heart, User, Mail, Phone, MapPin, Calendar, MessageSquare, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { exportElementToPDF } from "@/lib/pdf-utils";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface DonationRequest {
  id: string;
  wash_forum_id: string;
  donor_name: string;
  donor_email: string;
  donor_phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
  wash_forums?: {
    name: string;
  };
}

interface DonationRequestViewModalProps {
  request: DonationRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  contacted: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
};

export function DonationRequestViewModal({ request, isOpen, onClose }: DonationRequestViewModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { companyName } = useBusinessConfig();

  if (!request) return null;

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
      pdf.save(`donation-request-${request.donor_name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(request.created_at), "yyyy-MM-dd")}.pdf`);
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
            <Heart className="w-5 h-5 text-pink-500" />
            Donation Request Details
          </DialogTitle>
        </DialogHeader>

        <div ref={contentRef} className="space-y-6 bg-white p-4 rounded-lg">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-bold text-[#004B8D]">{companyName || 'Your Company'}</h2>
            <p className="text-sm text-muted-foreground">Donation Request Record</p>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge className={statusColors[request.status] || statusColors.pending}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
          </div>

          <Separator />

          {/* Donor Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Donor Information</h4>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{request.donor_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a href={`mailto:${request.donor_email}`} className="font-medium text-primary hover:underline">
                    {request.donor_email}
                  </a>
                </div>
              </div>
              {request.donor_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <a href={`tel:${request.donor_phone}`} className="font-medium text-primary hover:underline">
                      {request.donor_phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Target Community */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Target Community</h4>
            <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-pink-600" />
                <span className="font-medium text-pink-800">{request.wash_forums?.name || "Unknown Forum"}</span>
              </div>
            </div>
          </div>

          {/* Message */}
          {request.message && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm">{request.message}</p>
                </div>
              </div>
            </>
          )}

          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Submitted on {format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
          </div>
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
