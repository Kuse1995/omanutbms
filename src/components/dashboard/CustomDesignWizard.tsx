import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Ruler, 
  Palette, 
  Camera, 
  FileText, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Calculator,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { MeasurementsForm } from "./MeasurementsForm";
import { MaterialSelector, type MaterialItem } from "./MaterialSelector";
import { LaborEstimator, type SkillLevel } from "./LaborEstimator";
import { PricingBreakdown, calculateQuote } from "./PricingBreakdown";

interface CustomDesignWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const WIZARD_STEPS = [
  { id: 'client', label: 'Client Info', icon: User },
  { id: 'design', label: 'Design Details', icon: Palette },
  { id: 'measurements', label: 'Measurements', icon: Ruler },
  { id: 'sketches', label: 'Sketches & Refs', icon: Camera },
  { id: 'pricing', label: 'Smart Pricing', icon: Calculator },
  { id: 'review', label: 'Review & Confirm', icon: FileText },
];

const DESIGN_TYPES = [
  'Suit - 2 Piece',
  'Suit - 3 Piece',
  'Dress - Evening Gown',
  'Dress - Cocktail',
  'Wedding Dress',
  'Shirt/Blouse',
  'Trousers/Pants',
  'Jacket/Blazer',
  'Traditional Attire',
  'Other',
];

const FABRIC_TYPES = [
  'Cotton',
  'Silk',
  'Linen',
  'Wool',
  'Velvet',
  'Chiffon',
  'Satin',
  'Polyester Blend',
  'Customer Provided',
];

export function CustomDesignWizard({ open, onClose, onSuccess }: CustomDesignWizardProps) {
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Client
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    // Design
    designType: '',
    fabric: '',
    color: '',
    styleNotes: '',
    // Measurements
    measurements: {} as Record<string, number>,
    // Sketches
    sketchUrls: [] as string[],
    referenceNotes: '',
    // Pricing
    materials: [] as MaterialItem[],
    laborHours: 0,
    skillLevel: 'Senior' as SkillLevel,
    hourlyRate: 75,
    tailorId: null as string | null,
    marginPercentage: 30,
    priceLocked: false,
    // Order details
    estimatedCost: 0,
    depositAmount: 0,
    dueDate: '',
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      toast({ title: "Error", description: "No tenant context found", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // First create or get customer
      let customerId: string | null = null;
      
      if (formData.customerName && formData.customerPhone) {
        // Check if customer exists
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('phone', formData.customerPhone)
          .maybeSingle();
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
          // Update measurements
          await supabase
            .from('customers')
            .update({ measurements: formData.measurements })
            .eq('id', customerId);
        } else {
          // Create new customer
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              tenant_id: tenantId,
              name: formData.customerName,
              phone: formData.customerPhone,
              email: formData.customerEmail || null,
              measurements: formData.measurements,
            })
            .select('id')
            .single();
          
          if (customerError) throw customerError;
          customerId = newCustomer.id;
        }
      }

      // Calculate pricing
      const materialCost = formData.materials.reduce(
        (sum, m) => sum + m.quantity * m.unitCost, 0
      );
      const laborCost = formData.laborHours * formData.hourlyRate;
      const { quotedPrice } = calculateQuote(materialCost, laborCost, formData.marginPercentage);

      // tenant_id is auto-set by trigger, order_number is auto-generated
      const insertData: Record<string, unknown> = {
        tenant_id: tenantId,
        customer_id: customerId,
        design_type: formData.designType,
        fabric: formData.fabric,
        color: formData.color,
        style_notes: formData.styleNotes,
        measurements: formData.measurements,
        estimated_cost: quotedPrice || formData.estimatedCost || null,
        deposit_paid: formData.depositAmount || null,
        due_date: formData.dueDate || null,
        status: 'pending',
        // Pricing fields
        assigned_tailor_id: formData.tailorId,
        tailor_skill_level: formData.skillLevel,
        estimated_labor_hours: formData.laborHours,
        labor_hourly_rate: formData.hourlyRate,
        estimated_material_cost: materialCost,
        estimated_labor_cost: laborCost,
        margin_percentage: formData.marginPercentage,
        quoted_price: quotedPrice,
        price_locked: formData.priceLocked,
        price_locked_at: formData.priceLocked ? new Date().toISOString() : null,
      };
      
      const { data: orderData, error } = await supabase
        .from('custom_orders')
        .insert(insertData as any)
        .select('id')
        .single();

      if (error) throw error;

      // Save material usage records
      if (orderData && formData.materials.length > 0) {
        const materialRecords = formData.materials.map(m => ({
          custom_order_id: orderData.id,
          inventory_item_id: m.inventoryId,
          quantity_used: m.quantity,
          unit_of_measure: m.unitOfMeasure,
          cost_at_time_of_use: m.unitCost,
          tenant_id: tenantId,
        }));

        await supabase.from('job_material_usage').insert(materialRecords);
      }

      if (error) throw error;

      toast({
        title: "Custom Order Created!",
        description: `Order for ${formData.customerName} has been added to the production queue.`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create custom order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Client Info
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => updateFormData('customerName', e.target.value)}
                placeholder="Enter customer full name"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone Number *</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => updateFormData('customerPhone', e.target.value)}
                placeholder="+260 97X XXX XXX"
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Email (Optional)</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => updateFormData('customerEmail', e.target.value)}
                placeholder="customer@email.com"
              />
            </div>
          </div>
        );

      case 1: // Design Details
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="designType">Design Type *</Label>
              <Select value={formData.designType} onValueChange={(v) => updateFormData('designType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select design type" />
                </SelectTrigger>
                <SelectContent>
                  {DESIGN_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fabric">Fabric</Label>
              <Select value={formData.fabric} onValueChange={(v) => updateFormData('fabric', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fabric type" />
                </SelectTrigger>
                <SelectContent>
                  {FABRIC_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="color">Color / Pattern</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => updateFormData('color', e.target.value)}
                placeholder="e.g., Navy Blue, Burgundy with gold trim"
              />
            </div>
            <div>
              <Label htmlFor="styleNotes">Style Notes</Label>
              <Textarea
                id="styleNotes"
                value={formData.styleNotes}
                onChange={(e) => updateFormData('styleNotes', e.target.value)}
                placeholder="Additional details about the design, buttons, lining, pockets, etc."
                rows={4}
              />
            </div>
          </div>
        );

      case 2: // Measurements
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the client's body measurements in centimeters.
            </p>
            <MeasurementsForm
              measurements={formData.measurements}
              onChange={(m) => updateFormData('measurements', m)}
            />
          </div>
        );

      case 3: // Sketches & References
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop reference images or sketches here
              </p>
              <Button variant="outline" size="sm">
                Upload Images
              </Button>
            </div>
            <div>
              <Label htmlFor="referenceNotes">Reference Notes</Label>
              <Textarea
                id="referenceNotes"
                value={formData.referenceNotes}
                onChange={(e) => updateFormData('referenceNotes', e.target.value)}
                placeholder="Describe any reference images, celebrity looks, or inspiration..."
                rows={4}
              />
            </div>
          </div>
        );

      case 4: // Smart Pricing
        const materialTotal = formData.materials.reduce(
          (sum, m) => sum + m.quantity * m.unitCost, 0
        );
        const laborTotal = formData.laborHours * formData.hourlyRate;
        
        return (
          <div className="space-y-6">
            <LaborEstimator
              hours={formData.laborHours}
              skillLevel={formData.skillLevel}
              hourlyRate={formData.hourlyRate}
              tailorId={formData.tailorId}
              onHoursChange={(h) => updateFormData('laborHours', h)}
              onSkillLevelChange={(s) => updateFormData('skillLevel', s)}
              onHourlyRateChange={(r) => updateFormData('hourlyRate', r)}
              onTailorChange={(t) => updateFormData('tailorId', t)}
              designType={formData.designType}
              styleNotes={formData.styleNotes}
              fabric={formData.fabric}
            />

            <div className="border-t pt-4">
              <MaterialSelector
                materials={formData.materials}
                onChange={(m) => updateFormData('materials', m)}
              />
            </div>

            <div className="border-t pt-4">
              <PricingBreakdown
                materialCost={materialTotal}
                laborCost={laborTotal}
                marginPercentage={formData.marginPercentage}
                onMarginChange={(m) => updateFormData('marginPercentage', m)}
                isLocked={formData.priceLocked}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant={formData.priceLocked ? "secondary" : "outline"}
                size="sm"
                onClick={() => updateFormData('priceLocked', !formData.priceLocked)}
                className={formData.priceLocked ? "bg-amber-100 text-amber-800 border-amber-300" : ""}
              >
                <Lock className="h-4 w-4 mr-1" />
                {formData.priceLocked ? "Price Locked" : "Lock Quote"}
              </Button>
              {formData.priceLocked && (
                <span className="text-xs text-muted-foreground">
                  Price is now frozen and saved to the order.
                </span>
              )}
            </div>
          </div>
        );

      case 5: // Review & Confirm
        const finalMaterialCost = formData.materials.reduce(
          (sum, m) => sum + m.quantity * m.unitCost, 0
        );
        const finalLaborCost = formData.laborHours * formData.hourlyRate;
        const { quotedPrice: finalQuote } = calculateQuote(
          finalMaterialCost, finalLaborCost, formData.marginPercentage
        );

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Customer</p>
                <p className="text-foreground">{formData.customerName}</p>
                <p className="text-muted-foreground">{formData.customerPhone}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Design</p>
                <p className="text-foreground">{formData.designType}</p>
                <p className="text-muted-foreground">{formData.fabric} • {formData.color}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
                <Calculator className="h-4 w-4" />
                Quoted Price
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Materials</p>
                  <p className="font-medium">K {finalMaterialCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Labor ({formData.laborHours}hrs)</p>
                  <p className="font-medium">K {finalLaborCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Final Quote</p>
                  <p className="font-bold text-lg text-primary">K {finalQuote.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="depositAmount">Deposit Amount (K)</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    value={formData.depositAmount || ''}
                    onChange={(e) => updateFormData('depositAmount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Expected Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => updateFormData('dueDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-lg font-semibold text-white">New Custom Order</h2>
                <p className="text-amber-100 text-sm">Enterprise Design Workflow</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
              ✕
            </Button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isComplete = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 ${isActive ? 'text-amber-600' : isComplete ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-amber-100 text-amber-600' : 
                      isComplete ? 'bg-emerald-100 text-emerald-600' : 
                      'bg-muted text-muted-foreground'
                    }`}>
                      {isComplete ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                    </div>
                    <span className="text-xs font-medium hidden sm:inline">{step.label}</span>
                  </div>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${index < currentStep ? 'bg-emerald-500' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button onClick={handleNext} className="bg-amber-500 hover:bg-amber-600">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Order'}
              <Check className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
