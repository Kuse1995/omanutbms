import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Phone, User, Package, Calendar, FileText, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { exportElementToPDF } from "@/lib/pdf-utils";
import { TenantDocumentHeader } from "./TenantDocumentHeader";

interface WashForum {
  id: string;
  name: string;
  province: string;
  community_size: number;
  description: string;
  products_needed: string;
  priority: string;
  status: string;
  contact_person: string | null;
  contact_phone: string | null;
  created_at: string;
}

interface ForumViewModalProps {
  forum: WashForum | null;
  isOpen: boolean;
  onClose: () => void;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-amber-500 text-white",
  medium: "bg-primary text-primary-foreground",
};

const statusColors: Record<string, string> = {
  seeking_donation: "bg-blue-500 text-white",
  partially_funded: "bg-amber-500 text-white",
  fulfilled: "bg-green-500 text-white",
};

export function ForumViewModal({ forum, isOpen, onClose }: ForumViewModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!forum) return null;

  const handleDownloadPDF = async () => {
    const printContent = contentRef.current;
    if (!printContent) return;

    setIsDownloading(true);
    try {
      await exportElementToPDF({
        element: printContent,
        filename: `wash-forum-${forum.name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            WASH Forum Details
          </DialogTitle>
        </DialogHeader>

        <div ref={contentRef} className="space-y-6 bg-white p-4 rounded-lg">
          {/* Header */}
          <TenantDocumentHeader 
            documentType="WASH FORUM RECORD" 
            variant="centered"
          />

          {/* Header with name and badges */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold">{forum.name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={priorityColors[forum.priority] || "bg-muted"}>
                {forum.priority.charAt(0).toUpperCase() + forum.priority.slice(1)} Priority
              </Badge>
              <Badge className={statusColors[forum.status] || "bg-muted"}>
                {forum.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Location & Community */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Location & Community</h4>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Province</p>
                  <p className="font-medium">{forum.province}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Community Size</p>
                  <p className="font-medium">{forum.community_size.toLocaleString()} people</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          {(forum.contact_person || forum.contact_phone) && (
            <>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</h4>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  {forum.contact_person && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Contact Person</p>
                        <p className="font-medium">{forum.contact_person}</p>
                      </div>
                    </div>
                  )}
                  {forum.contact_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <a href={`tel:${forum.contact_phone}`} className="font-medium text-primary hover:underline">
                          {forum.contact_phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Products Needed */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products Needed
            </h4>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-blue-800">{forum.products_needed}</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description
            </h4>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm">{forum.description}</p>
            </div>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Added on {format(new Date(forum.created_at), "MMM d, yyyy")}</span>
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
