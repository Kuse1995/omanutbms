import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CustomerSignaturePad } from "./CustomerSignaturePad";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { Package, Calendar, FileSignature, CheckCircle } from "lucide-react";

interface CollectionConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  customerName: string;
  onSuccess?: () => void;
}

export function CollectionConfirmationModal({
  open,
  onClose,
  orderId,
  orderNumber,
  customerName,
  onSuccess
}: CollectionConfirmationModalProps) {
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);

  const handleConfirmCollection = async () => {
    if (!signature) {
      toast({
        title: "Signature Required",
        description: "Customer signature is required to confirm collection",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload signature to storage
      let signatureUrl = null;
      if (signature) {
        const base64Data = signature.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        const fileName = `collection-signatures/${orderId}-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('design-assets')
          .upload(fileName, blob, { contentType: 'image/png' });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('design-assets')
            .getPublicUrl(fileName);
          signatureUrl = urlData.publicUrl;
        }
      }

      // Update order with collection confirmation
      const { error } = await supabase
        .from('custom_orders')
        .update({
          status: 'delivered',
          actual_collection_date: collectionDate,
          collection_signature_url: signatureUrl,
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Collection Confirmed",
        description: `Order ${orderNumber} has been marked as collected by ${customerName}`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm collection",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Confirm Collection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <p className="text-sm text-muted-foreground">Order</p>
            <p className="font-medium">{orderNumber}</p>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{customerName}</p>
          </div>

          <div>
            <Label htmlFor="collectionDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Collection Date
            </Label>
            <Input
              id="collectionDate"
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="notes">Collection Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about the collection..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-muted-foreground" />
              Customer Signature (Required)
            </Label>
            <div className="border rounded-lg p-2 bg-background">
              <CustomerSignaturePad
                onSignatureChange={setSignature}
                signature={signature}
              />
            </div>
            {signature && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Signature captured
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirmCollection} disabled={isSubmitting || !signature}>
            {isSubmitting ? "Confirming..." : "Confirm Collection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
