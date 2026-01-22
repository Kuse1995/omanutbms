import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, User, Scissors, Palette, X, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QualityControlChecklist, initializeQCChecks, type QCCheckItem } from "./QualityControlChecklist";

interface CustomOrder {
  id: string;
  order_number: string;
  design_type: string | null;
  fabric: string | null;
  color: string | null;
  customer?: {
    name: string | null;
    phone: string | null;
  } | null;
}

interface ProductionQCModalProps {
  open: boolean;
  order: CustomOrder | null;
  onClose: () => void;
  onApproved: (orderId: string, qcData: { qcChecks: QCCheckItem[]; qcNotes: string }) => void;
}

export function ProductionQCModal({ open, order, onClose, onApproved }: ProductionQCModalProps) {
  const { toast } = useToast();
  const [qcChecks, setQcChecks] = useState<QCCheckItem[]>(initializeQCChecks());
  const [qcNotes, setQcNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiredChecks = qcChecks.filter((c) => c.required);
  const allRequiredComplete = requiredChecks.every((c) => c.checked);
  const completedCount = requiredChecks.filter((c) => c.checked).length;

  const handleApprove = async () => {
    if (!order) return;

    if (!allRequiredComplete) {
      toast({
        title: "QC Incomplete",
        description: "Please complete all required quality checks before moving to fitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Update order with QC data and move to fitting
      const { error } = await supabase
        .from('custom_orders')
        .update({
          status: 'fitting',
          qc_checks: JSON.parse(JSON.stringify(qcChecks)),
          qc_notes: qcNotes,
          qc_completed_at: new Date().toISOString(),
          qc_completed_by: user?.id || null,
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: "QC Approved ✓",
        description: `Order ${order.order_number} passed quality control and moved to fitting.`,
      });

      onApproved(order.id, { qcChecks, qcNotes });
      
      // Reset state for next use
      setQcChecks(initializeQCChecks());
      setQcNotes("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save quality control data",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setQcChecks(initializeQCChecks());
    setQcNotes("");
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Quality Control Gate</DialogTitle>
              <DialogDescription>
                Complete all required checks before moving to fitting
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Order Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted/50 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="font-mono">{order.order_number}</Badge>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
              Sewing → Fitting
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{order.customer?.name || 'Walk-in Customer'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              <span>{order.design_type || 'Custom Design'}</span>
            </div>
            {order.fabric && (
              <div className="flex items-center gap-2 col-span-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span>{order.fabric} • {order.color || 'N/A'}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* QC Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <QualityControlChecklist
            checks={qcChecks}
            onChecksChange={setQcChecks}
            qcNotes={qcNotes}
            onNotesChange={setQcNotes}
          />
        </motion.div>

        {/* Warning if incomplete */}
        {!allRequiredComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              Complete {requiredChecks.length - completedCount} more required check{requiredChecks.length - completedCount !== 1 ? 's' : ''} to proceed
            </span>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" />
            Cancel (Keep in Sewing)
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={!allRequiredComplete || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Approve & Move to Fitting'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
