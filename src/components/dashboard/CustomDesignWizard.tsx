import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Lock,
  AlertCircle,
  Briefcase,
  Clock,
  Calendar,
  Save,
  ArrowRightLeft,
  RotateCcw,
  Scissors,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { GarmentMeasurementsForm, type GarmentMeasurements, isGarmentCategoryComplete, getMissingMeasurements, getDefaultTab, serializeMeasurementsForStorage } from "./GarmentMeasurementsForm";
import { MaterialSelector, type MaterialItem } from "./MaterialSelector";
import { LaborEstimator, type SkillLevel } from "./LaborEstimator";
import { PricingBreakdown, calculateQuote } from "./PricingBreakdown";
import { AdditionalCostsSection, type AdditionalCostItem } from "./AdditionalCostsSection";
import { SketchUploader } from "./SketchUploader";
import { CustomerSignaturePad } from "./CustomerSignaturePad";
import { HandoffConfigPanel, type HandoffConfig } from "./HandoffConfigPanel";
import { AlterationDetailsStep } from "./AlterationDetailsStep";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { type AlterationItem } from "@/lib/alteration-types";

// Scroll lock hook - prevents background scrolling when modal is open
function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (lock) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      
      // Get scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [lock]);
}

interface CustomDesignWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editOrderId?: string | null; // For continuing an order
  isOperationsContinuation?: boolean; // If Ops is picking up a handoff
}

// Steps for custom (new design) orders
const CUSTOM_WIZARD_STEPS = [
  { id: 'client', label: 'Client Info', icon: User },
  { id: 'work', label: 'Work Details', icon: Briefcase },
  { id: 'design', label: 'Design Details', icon: Palette },
  { id: 'measurements', label: 'Measurements', icon: Ruler },
  { id: 'sketches', label: 'Sketches & Refs', icon: Camera },
  { id: 'pricing', label: 'Smart Pricing', icon: Calculator },
  { id: 'review', label: 'Review & Sign', icon: FileText },
];

// Steps for alteration orders (simplified flow)
const ALTERATION_WIZARD_STEPS = [
  { id: 'client', label: 'Client Info', icon: User },
  { id: 'alteration', label: 'Alteration Details', icon: Scissors },
  { id: 'measurements', label: 'Measurements', icon: Ruler },
  { id: 'photos', label: 'Photos & Notes', icon: Camera },
  { id: 'review', label: 'Review & Sign', icon: FileText },
];

// Legacy reference for backwards compatibility
const WIZARD_STEPS = CUSTOM_WIZARD_STEPS;

const DESIGN_TYPES = [
  'Suit - 2 Piece',
  'Suit - 3 Piece',
  'Dress - Evening Gown',
  'Dress - Cocktail',
  'Wedding Dress',
  'Shirt/Blouse',
  'Trousers/Pants',
  'Jacket/Blazer',
  'Skirt',
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

export function CustomDesignWizard({ open, onClose, onSuccess, editOrderId, isOperationsContinuation }: CustomDesignWizardProps) {
  const { toast } = useToast();
  const { tenantId, tenantUser } = useTenant();
  const { user, isAdmin, role } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [existingOrderData, setExistingOrderData] = useState<any>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  
  // Order type: 'custom' for new designs, 'alteration' for modifying existing garments
  const [orderType, setOrderType] = useState<'custom' | 'alteration' | null>(null);
  
  // Get the correct wizard steps based on order type
  const ACTIVE_WIZARD_STEPS = orderType === 'alteration' ? ALTERATION_WIZARD_STEPS : CUSTOM_WIZARD_STEPS;

  // Handoff configuration
  const [handoffConfig, setHandoffConfig] = useState<HandoffConfig>({
    enabled: false,
    handoffStep: 2, // Default: after Design Details
    assignedUserId: null,
    notes: '',
  });

  // Check if current user can configure handoff (admin/manager only)
  const effectiveRole = tenantUser?.role || role;
  const canConfigureHandoff = effectiveRole === 'admin' || effectiveRole === 'manager';
  // Check operations role from both tenantUser and useAuth role for reliability
  const isOperationsRole = effectiveRole === 'operations_manager';
  
  // Form state - Updated with Dodo Wear form fields
  const [formData, setFormData] = useState({
    // Client Info (Step 1)
    customerName: '',
    customerPhone: '',
    customerWhatsApp: '',
    customerEmail: '',
    residentialAddress: '',
    
    // Work Details (Step 2 - NEW)
    productionType: 'normal' as 'normal' | 'express',
    fittingDate: '',
    collectionDate: '',
    collectionTime: '',
    tagMaterial: '', // For garment label
    
    // Design Details (Step 3)
    designType: '',
    fabric: '',
    color: '',
    styleNotes: '', // "General Description of Work"
    
    // Measurements (Step 4)
    measurements: {} as GarmentMeasurements,
    
    // Sketches (Step 5)
    sketchUrls: [] as string[],
    referenceNotes: '',
    generatedImages: [] as { view: string; imageUrl: string }[],
    
    // Pricing (Step 6)
    materials: [] as MaterialItem[],
    additionalCosts: [] as AdditionalCostItem[],
    laborHours: 0,
    skillLevel: 'Senior' as SkillLevel,
    hourlyRate: 75,
    tailorId: null as string | null,
    marginPercentage: 30,
    priceLocked: false,
    
    // Review & Sign (Step 7)
    estimatedCost: 0,
    depositAmount: 0,
    dueDate: '',
    customerSignature: null as string | null,
    
    // Alteration-specific fields
    garmentSource: 'external' as 'shop_made' | 'external',
    originalOrderId: null as string | null,
    alterationItems: [] as AlterationItem[],
    garmentCondition: 'good' as string,
    bringInDate: new Date().toISOString().split('T')[0],
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]);
  };

  // Load existing order data when continuing/editing
  useEffect(() => {
    const loadExistingOrder = async () => {
      if (!editOrderId || !tenantId || !open) return;

      setIsLoadingOrder(true);
      try {
        const { data: order, error } = await supabase
          .from('custom_orders')
          .select(`
            *,
            customers(id, name, phone, email, whatsapp_number, residential_address)
          `)
          .eq('id', editOrderId)
          .eq('tenant_id', tenantId)
          .single();

        if (error) throw error;
        if (!order) return;

        setExistingOrderData(order);

        // Populate form data from existing order
        const measurements = (order.measurements as GarmentMeasurements) || {};
        const materials = (order.estimated_material_cost && order.quoted_price) 
          ? [] // Materials aren't stored in DB, would need separate table
          : [];

        setFormData({
          customerName: order.customers?.name || '',
          customerPhone: order.customers?.phone || '',
          customerWhatsApp: order.whatsapp_number || order.customers?.whatsapp_number || '',
          customerEmail: order.customers?.email || '',
          residentialAddress: order.residential_address || order.customers?.residential_address || '',
          productionType: (order.production_type as 'normal' | 'express') || 'normal',
          fittingDate: order.fitting_date || '',
          collectionDate: order.collection_date || '',
          collectionTime: order.collection_time || '',
          tagMaterial: order.tag_material || '',
          designType: order.design_type || '',
          fabric: order.fabric || '',
          color: order.color || '',
          styleNotes: order.style_notes || '',
          measurements,
          sketchUrls: order.reference_images || [],
          referenceNotes: '',
          generatedImages: (order.generated_images as any[]) || [],
          materials,
          additionalCosts: [], // Additional costs are loaded from custom_order_items if needed
          laborHours: order.estimated_labor_hours || 0,
          skillLevel: (order.tailor_skill_level as SkillLevel) || 'Senior',
          hourlyRate: order.labor_hourly_rate || 75,
          tailorId: order.assigned_tailor_id || null,
          marginPercentage: order.margin_percentage || 30,
          priceLocked: order.price_locked || false,
          estimatedCost: order.estimated_cost || 0,
          depositAmount: order.deposit_paid || 0,
          dueDate: order.due_date || '',
          customerSignature: order.collection_signature_url || null,
          // Alteration-specific fields
          garmentSource: (order.garment_source as 'shop_made' | 'external') || 'external',
          originalOrderId: order.original_order_id || null,
          alterationItems: (Array.isArray(order.alteration_items) ? order.alteration_items as unknown as AlterationItem[] : []),
          garmentCondition: order.garment_condition || 'good',
          bringInDate: order.bring_in_date || new Date().toISOString().split('T')[0],
        });
        
        // Set order type based on existing order
        if (order.order_type) {
          setOrderType(order.order_type as 'custom' | 'alteration');
        }

        // If this is an operations continuation, set handoff config from order
        if (isOperationsContinuation && order.handoff_step !== null) {
          setHandoffConfig({
            enabled: true,
            handoffStep: order.handoff_step,
            assignedUserId: order.assigned_operations_user_id,
            notes: order.handoff_notes || '',
          });

          // Jump to the step after the handoff step (where ops manager should start)
          const startStep = Math.min((order.handoff_step || 0) + 1, WIZARD_STEPS.length - 1);
          setCurrentStep(startStep);
        }
      } catch (error: any) {
        console.error('Error loading order:', error);
        toast({
          title: 'Error loading order',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setIsLoadingOrder(false);
      }
    };

    loadExistingOrder();
  }, [editOrderId, tenantId, open, isOperationsContinuation]);

  const validateStep = (stepIndex: number): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    switch (stepIndex) {
      case 0: // Client Info
        if (!formData.customerName.trim()) errors.push("Customer name is required");
        if (!formData.customerPhone.trim()) errors.push("Phone number is required");
        break;
      
      case 1: // Work Details
        // Optional but recommended
        break;
      
      case 2: // Design Details
        if (!formData.designType) errors.push("Please select a design type");
        if (!formData.fabric) errors.push("Please select a fabric type");
        if (!formData.color.trim()) errors.push("Please specify the color/pattern");
        break;
      
      case 3: // Measurements
        // Determine the active garment category based on design type
        const garmentCategory = getDefaultTab(formData.designType);
        const hasSomeMeasurements = Object.entries(formData.measurements).some(
          ([key, v]) => key !== '_unit' && typeof v === 'number' && v > 0
        );
        if (!hasSomeMeasurements) {
          errors.push("Please enter measurements for your garment");
        } else if (!isGarmentCategoryComplete(formData.measurements, garmentCategory)) {
          const missing = getMissingMeasurements(formData.measurements, garmentCategory);
          errors.push(`Please complete all ${garmentCategory} measurements. Missing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`);
        }
        break;
      
      case 4: // Sketches - optional
        break;
      
      case 5: // Pricing
        if (formData.laborHours <= 0) errors.push("Please estimate labor hours");
        const hasStockIssues = formData.materials.some(m => 
          m.stockWarning?.includes('Insufficient')
        );
        if (hasStockIssues) errors.push("Some materials have insufficient stock");
        break;
      
      case 6: // Review & Sign
        if (!formData.customerSignature) errors.push("Customer signature is required to approve the design");
        break;
    }

    return { valid: errors.length === 0, errors };
  };

  // Calculate step completion percentage
  const stepCompletionStatus = useMemo(() => {
    return WIZARD_STEPS.map((_, index) => {
      const { valid } = validateStep(index);
      return valid;
    });
  }, [formData]);

  const overallProgress = useMemo(() => {
    const completedSteps = stepCompletionStatus.filter(Boolean).length;
    return Math.round((completedSteps / WIZARD_STEPS.length) * 100);
  }, [stepCompletionStatus]);

  // Determine if a step should be read-only (for handoff continuation)
  const isStepReadOnly = (stepIndex: number): boolean => {
    if (!existingOrderData?.handoff_step) return false;
    
    // If user is Operations and viewing an order with handoff
    if (isOperationsContinuation && isOperationsRole) {
      // Ops can't edit steps before their handoff point
      return stepIndex <= existingOrderData.handoff_step;
    }
    
    // If Admin viewing an order that's with Ops
    if (existingOrderData.handoff_status === 'in_progress' && canConfigureHandoff) {
      // Admin can't edit steps at/after handoff while Ops is working
      return stepIndex > existingOrderData.handoff_step;
    }
    
    return false;
  };

  const handleNext = () => {
    const { valid, errors } = validateStep(currentStep);
    
    if (!valid) {
      setValidationErrors(errors);
      toast({
        title: "Please complete this step",
        description: errors[0],
        variant: "destructive",
      });
      return;
    }

    setValidationErrors([]);
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setValidationErrors([]);
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Calculate balance due
  const calculateBalance = () => {
    const materialCost = formData.materials.reduce(
      (sum, m) => sum + m.quantity * m.unitCost, 0
    );
    const laborCost = formData.laborHours * formData.hourlyRate;
    const additionalCost = formData.additionalCosts.reduce(
      (sum, c) => sum + c.quantity * c.unitPrice, 0
    );
    const { quotedPrice } = calculateQuote(materialCost, laborCost, formData.marginPercentage, additionalCost);
    return quotedPrice - (formData.depositAmount || 0);
  };

  // Save as draft - minimal validation, saves whatever data is filled
  const handleSaveDraft = async () => {
    if (!tenantId) {
      toast({ title: "Error", description: "No tenant context found", variant: "destructive" });
      return;
    }

    // Only require customer name for drafts
    if (!formData.customerName.trim()) {
      toast({
        title: "Customer name required",
        description: "Please enter at least a customer name to save as draft",
        variant: "destructive",
      });
      return;
    }

    setIsSavingDraft(true);
    try {
      // Create or get customer if we have name and phone
      let customerId: string | null = existingOrderData?.customer_id || null;
      
      if (formData.customerName && formData.customerPhone) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('phone', formData.customerPhone)
          .maybeSingle();
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
          // Update customer with latest info
          await supabase
            .from('customers')
            .update({
              name: formData.customerName,
              email: formData.customerEmail || null,
              measurements: serializeMeasurementsForStorage(formData.measurements) as unknown as import("@/integrations/supabase/types").Json,
              whatsapp_number: formData.customerWhatsApp || null,
              residential_address: formData.residentialAddress || null,
            })
            .eq('id', customerId);
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              tenant_id: tenantId,
              name: formData.customerName,
              phone: formData.customerPhone,
              email: formData.customerEmail || null,
              measurements: serializeMeasurementsForStorage(formData.measurements) as unknown as import("@/integrations/supabase/types").Json,
              whatsapp_number: formData.customerWhatsApp || null,
              residential_address: formData.residentialAddress || null,
            })
            .select('id')
            .single();
          
          if (customerError) throw customerError;
          customerId = newCustomer.id;
        }
      }

      // Calculate pricing if materials exist
      const materialCost = formData.materials.reduce(
        (sum, m) => sum + m.quantity * m.unitCost, 0
      );
      const laborCost = formData.laborHours * formData.hourlyRate;
      const { quotedPrice } = calculateQuote(materialCost, laborCost, formData.marginPercentage);

      const orderData: Record<string, unknown> = {
        customer_id: customerId,
        design_type: formData.designType || null,
        fabric: formData.fabric || null,
        color: formData.color || null,
        style_notes: formData.styleNotes || null,
        measurements: Object.keys(formData.measurements).length > 0 ? formData.measurements : null,
        estimated_cost: quotedPrice || formData.estimatedCost || null,
        deposit_paid: formData.depositAmount || null,
        due_date: formData.dueDate || null,
        reference_images: formData.sketchUrls.length > 0 ? formData.sketchUrls : null,
        generated_images: formData.generatedImages.length > 0 ? formData.generatedImages : [],
        assigned_tailor_id: formData.tailorId,
        tailor_skill_level: formData.skillLevel,
        estimated_labor_hours: formData.laborHours || null,
        labor_hourly_rate: formData.hourlyRate || null,
        estimated_material_cost: materialCost || null,
        estimated_labor_cost: laborCost || null,
        margin_percentage: formData.marginPercentage || null,
        quoted_price: quotedPrice || null,
        price_locked: formData.priceLocked,
        collection_signature_url: formData.customerSignature || null,
        // Dodo Wear form fields
        whatsapp_number: formData.customerWhatsApp || null,
        residential_address: formData.residentialAddress || null,
        production_type: formData.productionType,
        fitting_date: formData.fittingDate || null,
        collection_date: formData.collectionDate || null,
        collection_time: formData.collectionTime || null,
        tag_material: formData.tagMaterial || null,
      };

      // Determine if this is an UPDATE or INSERT
      const isUpdate = !!editOrderId;
      let savedOrder: { id: string; order_number: string } | null = null;

      if (isUpdate) {
        // UPDATE existing order
        const { data, error } = await supabase
          .from('custom_orders')
          .update(orderData)
          .eq('id', editOrderId)
          .eq('tenant_id', tenantId)
          .select('id, order_number')
          .single();

        if (error) throw error;
        savedOrder = data;

        // If operations manager is handing back
        if (isOperationsContinuation && existingOrderData?.handoff_status === 'in_progress') {
          // Update handoff status to handed_back
          await supabase
            .from('custom_orders')
            .update({
              handoff_status: 'handed_back',
              handed_back_at: new Date().toISOString(),
            })
            .eq('id', editOrderId);

          // Notify the original admin
          if (existingOrderData?.created_by) {
            const { data: opsProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', user?.id)
              .maybeSingle();

            await supabase.from('admin_alerts').insert({
              tenant_id: tenantId,
              target_user_id: existingOrderData.created_by,
              alert_type: 'order_handed_back',
              message: `Order ${savedOrder?.order_number} has been handed back by ${opsProfile?.full_name || 'Operations'}`,
              related_table: 'custom_orders',
              related_id: editOrderId,
              is_read: false,
            });
          }

          toast({
            title: "Order Handed Back",
            description: `Order ${savedOrder?.order_number} has been updated and handed back to admin for review.`,
          });
        } else {
          toast({
            title: "Order Updated",
            description: `Order ${savedOrder?.order_number} has been updated successfully.`,
          });
        }
      } else {
        // INSERT new order
        const insertData = {
          ...orderData,
          tenant_id: tenantId,
          status: 'draft',
          created_by: user?.id,
          // Handoff fields (only for new orders)
          ...(handoffConfig.enabled && handoffConfig.assignedUserId ? {
            handoff_step: handoffConfig.handoffStep,
            handoff_status: 'pending_handoff',
            assigned_operations_user_id: handoffConfig.assignedUserId,
            handed_off_at: new Date().toISOString(),
            handoff_notes: handoffConfig.notes || null,
          } : {}),
        };
        
        const { data, error } = await supabase
          .from('custom_orders')
          .insert(insertData as any)
          .select('id, order_number')
          .single();

        if (error) throw error;
        savedOrder = data;

        // Create a linked quotation record for drafts with quoted price
        const materialCostForQuote = formData.materials.reduce(
          (sum, m) => sum + m.quantity * m.unitCost, 0
        );
        const laborCostForQuote = formData.laborHours * formData.hourlyRate;
        const { quotedPrice: draftQuotePrice } = calculateQuote(materialCostForQuote, laborCostForQuote, formData.marginPercentage);

        if (savedOrder && draftQuotePrice > 0 && !existingOrderData?.quotation_id) {
          const validUntil = formData.collectionDate 
            ? formData.collectionDate 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          const { data: quotation, error: quotationError } = await (supabase
            .from('quotations') as any)
            .insert({
              tenant_id: tenantId,
              client_name: formData.customerName,
              client_email: formData.customerEmail || null,
              client_phone: formData.customerPhone || null,
              quotation_date: new Date().toISOString().split('T')[0],
              valid_until: validUntil,
              status: 'draft',
              subtotal: draftQuotePrice,
              tax_rate: 0,
              tax_amount: 0,
              total_amount: draftQuotePrice,
              notes: `Draft Custom Order: ${savedOrder.order_number} - ${formData.designType || 'Custom Design'}${formData.fabric ? ` (${formData.fabric})` : ''}`,
              created_by: user?.id || null,
            })
            .select('id')
            .single();

          if (!quotationError && quotation) {
            await (supabase
              .from('custom_orders') as any)
              .update({ quotation_id: quotation.id })
              .eq('id', savedOrder.id);

            await (supabase
              .from('quotation_items') as any)
              .insert({
                quotation_id: quotation.id,
                tenant_id: tenantId,
                description: `${formData.designType || 'Custom Design'} - ${savedOrder.order_number}${formData.fabric ? ` (${formData.fabric})` : ''}`,
                quantity: 1,
                unit_price: draftQuotePrice,
                amount: draftQuotePrice,
              });
          }
        }

        // If handoff is enabled, create notification for the assigned ops manager
        if (handoffConfig.enabled && handoffConfig.assignedUserId && savedOrder) {
          const { data: officerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', handoffConfig.assignedUserId)
            .maybeSingle();

          const officerName = officerProfile?.full_name || 'Operations Manager';

          await supabase.from('admin_alerts').insert({
            tenant_id: tenantId,
            target_user_id: handoffConfig.assignedUserId,
            alert_type: 'order_handoff',
            message: `New order assigned to you: ${savedOrder.order_number} for ${formData.customerName}`,
            related_table: 'custom_orders',
            related_id: savedOrder.id,
            is_read: false,
          });

          toast({
            title: "Order Handed Off",
            description: `Order ${savedOrder.order_number} assigned to ${officerName}. They'll receive a notification.`,
          });
        } else {
          toast({
            title: "Draft Saved",
            description: `Draft order for ${formData.customerName} has been saved. You can continue editing it later.`,
          });
        }
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    const { valid, errors } = validateStep(6);
    if (!valid) {
      setValidationErrors(errors);
      toast({
        title: "Cannot create order",
        description: errors[0],
        variant: "destructive",
      });
      return;
    }

    if (!tenantId) {
      toast({ title: "Error", description: "No tenant context found", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // First create or get customer
      let customerId: string | null = null;
      
      if (formData.customerName && formData.customerPhone) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('phone', formData.customerPhone)
          .maybeSingle();
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
          await supabase
            .from('customers')
            .update({ 
              measurements: serializeMeasurementsForStorage(formData.measurements) as unknown as import("@/integrations/supabase/types").Json,
              whatsapp_number: formData.customerWhatsApp || null,
              residential_address: formData.residentialAddress || null,
            })
            .eq('id', customerId);
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              tenant_id: tenantId,
              name: formData.customerName,
              phone: formData.customerPhone,
              email: formData.customerEmail || null,
              measurements: serializeMeasurementsForStorage(formData.measurements) as unknown as import("@/integrations/supabase/types").Json,
              whatsapp_number: formData.customerWhatsApp || null,
              residential_address: formData.residentialAddress || null,
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
        status: 'confirmed',
        reference_images: formData.sketchUrls.length > 0 ? formData.sketchUrls : null,
        generated_images: formData.generatedImages.length > 0 ? formData.generatedImages : [],
        assigned_tailor_id: formData.tailorId,
        tailor_skill_level: formData.skillLevel,
        estimated_labor_hours: formData.laborHours,
        labor_hourly_rate: formData.hourlyRate,
        estimated_material_cost: materialCost,
        estimated_labor_cost: laborCost,
        margin_percentage: formData.marginPercentage,
        quoted_price: quotedPrice,
        price_locked: true,
        price_locked_at: new Date().toISOString(),
        // New Dodo Wear form fields
        whatsapp_number: formData.customerWhatsApp || null,
        residential_address: formData.residentialAddress || null,
        production_type: formData.productionType,
        fitting_date: formData.fittingDate || null,
        collection_date: formData.collectionDate || null,
        collection_time: formData.collectionTime || null,
        tag_material: formData.tagMaterial || null,
        created_by: user?.id,
      };
      
      const { data: orderData, error } = await supabase
        .from('custom_orders')
        .insert(insertData as any)
        .select('id, order_number')
        .single();

      if (error) throw error;

      // Create a linked quotation record so it appears in Quotations section
      if (orderData && quotedPrice > 0) {
        // Calculate valid_until as 30 days from now or collection date
        const validUntil = formData.collectionDate 
          ? formData.collectionDate 
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const { data: quotation, error: quotationError } = await (supabase
          .from('quotations') as any)
          .insert({
            tenant_id: tenantId,
            client_name: formData.customerName,
            client_email: formData.customerEmail || null,
            client_phone: formData.customerPhone || null,
            quotation_date: new Date().toISOString().split('T')[0],
            valid_until: validUntil,
            status: 'sent',
            subtotal: quotedPrice,
            tax_rate: 0,
            tax_amount: 0,
            total_amount: quotedPrice,
            notes: `Custom Order: ${orderData.order_number} - ${formData.designType}${formData.fabric ? ` (${formData.fabric})` : ''}`,
            created_by: user?.id || null,
          })
          .select('id')
          .single();

        if (!quotationError && quotation) {
          // Link quotation to custom order
          await (supabase
            .from('custom_orders') as any)
            .update({ quotation_id: quotation.id })
            .eq('id', orderData.id);

          // Create quotation item
          await (supabase
            .from('quotation_items') as any)
            .insert({
              quotation_id: quotation.id,
              tenant_id: tenantId,
              description: `${formData.designType} - ${orderData.order_number}${formData.fabric ? ` (${formData.fabric})` : ''}`,
              quantity: 1,
              unit_price: quotedPrice,
              amount: quotedPrice,
            });
        }
      }

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

      // Upload signature if available
      if (formData.customerSignature && orderData) {
        const base64Data = formData.customerSignature.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        
        const fileName = `${tenantId}/signatures/${orderData.id}.png`;
        await supabase.storage
          .from('design-assets')
          .upload(fileName, blob, { upsert: true });
      }

      toast({
        title: "Custom Order Created!",
        description: `Order for ${formData.customerName} has been confirmed and added to the production queue.`,
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

  // Apply scroll lock when modal is open (must be called before any early returns)
  useScrollLock(open);

  if (!open) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Client Info
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => updateFormData('customerName', e.target.value)}
                  placeholder="Enter customer full name"
                  className={validationErrors.some(e => e.includes('name')) ? 'border-destructive' : ''}
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone Number *</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => updateFormData('customerPhone', e.target.value)}
                  placeholder="+260 97X XXX XXX"
                  className={validationErrors.some(e => e.includes('Phone')) ? 'border-destructive' : ''}
                />
              </div>
              <div>
                <Label htmlFor="customerWhatsApp">WhatsApp Number</Label>
                <Input
                  id="customerWhatsApp"
                  value={formData.customerWhatsApp}
                  onChange={(e) => updateFormData('customerWhatsApp', e.target.value)}
                  placeholder="+260 97X XXX XXX"
                />
              </div>
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
            <div>
              <Label htmlFor="residentialAddress">Residential Address</Label>
              <Textarea
                id="residentialAddress"
                value={formData.residentialAddress}
                onChange={(e) => updateFormData('residentialAddress', e.target.value)}
                placeholder="Enter customer's residential address"
                rows={2}
              />
            </div>
          </div>
        );

      case 1: // Work Details (NEW STEP)
        return (
          <div className="space-y-6">
            {/* Production Type Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Production Time</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.productionType === 'normal' 
                    ? 'Standard production (12 working days)' 
                    : 'Express rush order (additional charges apply)'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${formData.productionType === 'normal' ? 'font-medium' : 'text-muted-foreground'}`}>
                  Normal
                </span>
                <Switch
                  checked={formData.productionType === 'express'}
                  onCheckedChange={(checked) => updateFormData('productionType', checked ? 'express' : 'normal')}
                />
                <span className={`text-sm ${formData.productionType === 'express' ? 'font-medium text-amber-600' : 'text-muted-foreground'}`}>
                  Express
                </span>
                {formData.productionType === 'express' && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Rush
                  </Badge>
                )}
              </div>
            </div>

            {/* Scheduling */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fittingDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Date for Fitting
                </Label>
                <Input
                  id="fittingDate"
                  type="date"
                  value={formData.fittingDate}
                  onChange={(e) => updateFormData('fittingDate', e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="collectionDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Collection Date
                </Label>
                <Input
                  id="collectionDate"
                  type="date"
                  value={formData.collectionDate}
                  onChange={(e) => updateFormData('collectionDate', e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="collectionTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Collection Time
                </Label>
                <Input
                  id="collectionTime"
                  type="time"
                  value={formData.collectionTime}
                  onChange={(e) => updateFormData('collectionTime', e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Tag Material */}
            <div>
              <Label htmlFor="tagMaterial" className="flex items-center gap-2">
                Tag Material (for garment label)
              </Label>
              <Input
                id="tagMaterial"
                placeholder="e.g., Satin, Woven, Printed"
                value={formData.tagMaterial}
                onChange={(e) => updateFormData('tagMaterial', e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Specify the material for the garment care label/tag
              </p>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
              <p className="font-medium mb-1">Scheduling Tips</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                <li>Fitting date should be at least 7 days before collection</li>
                <li>Allow 2-3 days after fitting for final adjustments</li>
                <li>Express orders may have limited scheduling flexibility</li>
              </ul>
            </div>

            {/* Handoff Configuration - Only for Admin/Manager */}
            {canConfigureHandoff && !isOperationsContinuation && (
              <HandoffConfigPanel
                config={handoffConfig}
                onChange={setHandoffConfig}
                disabled={false}
              />
            )}
          </div>
        );

      case 2: // Design Details
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="designType">Design Type *</Label>
              <Select value={formData.designType} onValueChange={(v) => updateFormData('designType', v)}>
                <SelectTrigger className={validationErrors.some(e => e.includes('design type')) ? 'border-destructive' : ''}>
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
              <Label htmlFor="fabric">Fabric *</Label>
              <Select value={formData.fabric} onValueChange={(v) => updateFormData('fabric', v)}>
                <SelectTrigger className={validationErrors.some(e => e.includes('fabric')) ? 'border-destructive' : ''}>
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
              <Label htmlFor="color">Color / Pattern *</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => updateFormData('color', e.target.value)}
                placeholder="e.g., Navy Blue, Burgundy with gold trim"
                className={validationErrors.some(e => e.includes('color')) ? 'border-destructive' : ''}
              />
            </div>
            <div>
              <Label htmlFor="styleNotes">General Description of Work</Label>
              <Textarea
                id="styleNotes"
                value={formData.styleNotes}
                onChange={(e) => updateFormData('styleNotes', e.target.value)}
                placeholder="Describe the work in detail: style preferences, specific features (buttons, lining, pockets), special requests, alterations needed, etc."
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Include all details about the garment construction, finishing, and any special instructions
              </p>
            </div>
          </div>
        );

      case 3: // Measurements - Now uses categorized garment tabs
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter measurements using the unit toggle (cm or inches). Select the garment type tab and complete <strong>all</strong> fields for your design.
              <span className="text-destructive"> *</span>
            </p>
            <GarmentMeasurementsForm
              measurements={formData.measurements}
              onChange={(m) => updateFormData('measurements', m)}
              designType={formData.designType}
              showValidation={validationErrors.some(e => e.toLowerCase().includes('measurement'))}
            />
          </div>
        );

      case 4: // Sketches & References
        return (
          <SketchUploader
            sketchUrls={formData.sketchUrls}
            referenceNotes={formData.referenceNotes}
            generatedImages={formData.generatedImages}
            designType={formData.designType}
            fabric={formData.fabric}
            color={formData.color}
            styleNotes={formData.styleNotes}
            onSketchUrlsChange={(urls) => updateFormData('sketchUrls', urls)}
            onReferenceNotesChange={(notes) => updateFormData('referenceNotes', notes)}
            onGeneratedImagesChange={(images) => updateFormData('generatedImages', images)}
          />
        );

      case 5: // Smart Pricing
        const materialTotal = formData.materials.reduce(
          (sum, m) => sum + m.quantity * m.unitCost, 0
        );
        const laborTotal = formData.laborHours * formData.hourlyRate;
        const additionalTotal = formData.additionalCosts.reduce(
          (sum, c) => sum + c.quantity * c.unitPrice, 0
        );
        
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
            {validationErrors.some(e => e.includes('labor')) && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Please estimate labor hours
              </p>
            )}

            <div className="border-t pt-4">
              <MaterialSelector
                materials={formData.materials}
                onChange={(m) => updateFormData('materials', m)}
                designType={formData.designType}
                fabric={formData.fabric}
                color={formData.color}
                styleNotes={formData.styleNotes}
              />
              {validationErrors.some(e => e.includes('stock')) && (
                <p className="text-sm text-destructive flex items-center gap-1 mt-2">
                  <AlertCircle className="h-4 w-4" />
                  Some materials have insufficient stock - please adjust quantities
                </p>
              )}
            </div>

            <div className="border-t pt-4">
              <AdditionalCostsSection
                items={formData.additionalCosts}
                onChange={(items) => updateFormData('additionalCosts', items)}
              />
            </div>

            <div className="border-t pt-4">
              <PricingBreakdown
                materialCost={materialTotal}
                laborCost={laborTotal}
                additionalCost={additionalTotal}
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

      case 6: // Review & Sign
        const finalMaterialCost = formData.materials.reduce(
          (sum, m) => sum + m.quantity * m.unitCost, 0
        );
        const finalLaborCost = formData.laborHours * formData.hourlyRate;
        const { quotedPrice: finalQuote } = calculateQuote(
          finalMaterialCost, finalLaborCost, formData.marginPercentage
        );
        const balanceDue = finalQuote - (formData.depositAmount || 0);

        return (
          <div className="space-y-6">
            {/* Customer & Work Summary */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Customer</p>
                <p className="text-foreground">{formData.customerName}</p>
                <p className="text-muted-foreground">{formData.customerPhone}</p>
                {formData.customerWhatsApp && (
                  <p className="text-muted-foreground text-xs">WhatsApp: {formData.customerWhatsApp}</p>
                )}
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Design</p>
                <p className="text-foreground">{formData.designType}</p>
                <p className="text-muted-foreground">{formData.fabric} • {formData.color}</p>
                {formData.productionType === 'express' && (
                  <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-200 text-xs">
                    Express Order
                  </Badge>
                )}
              </div>
            </div>

            {/* Scheduling Summary */}
            {(formData.fittingDate || formData.collectionDate) && (
              <div className="flex gap-4 text-sm">
                {formData.fittingDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fitting:</span>
                    <span>{new Date(formData.fittingDate).toLocaleDateString()}</span>
                  </div>
                )}
                {formData.collectionDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Collection:</span>
                    <span>
                      {new Date(formData.collectionDate).toLocaleDateString()}
                      {formData.collectionTime && ` at ${formData.collectionTime}`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* QC Note */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-50 text-blue-700">
              <Check className="h-4 w-4" />
              Quality control will be performed during production before fitting
            </div>

            {/* Generated Images */}
            {formData.generatedImages.length > 0 && (
              <div>
                <p className="font-medium text-muted-foreground mb-2">AI Generated Preview</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {formData.generatedImages.map((img, index) => (
                    <div key={index} className="aspect-[3/4] rounded overflow-hidden border">
                      <img 
                        src={img.imageUrl} 
                        alt={img.view}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Summary with Balance */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800 font-medium mb-3">
                <Calculator className="h-4 w-4" />
                Payment Summary
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Materials</p>
                  <p className="font-medium">K {finalMaterialCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Labor ({formData.laborHours}hrs)</p>
                  <p className="font-medium">K {finalLaborCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Charge</p>
                  <p className="font-bold text-lg text-primary">K {finalQuote.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Balance Due</p>
                  <p className={`font-bold text-lg ${balanceDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    K {balanceDue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Deposit & Due Date */}
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Customer Signature */}
            <div className="border-t pt-4">
              <Label className="mb-2 block">Customer Approval Signature *</Label>
              <CustomerSignaturePad
                signature={formData.customerSignature}
                onSignatureChange={(sig) => updateFormData('customerSignature', sig)}
              />
              {validationErrors.some(e => e.includes('signature')) && (
                <p className="text-sm text-destructive flex items-center gap-1 mt-2">
                  <AlertCircle className="h-4 w-4" />
                  Customer signature is required to confirm the order
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Order type selection screen
  const renderOrderTypeSelection = () => (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">What type of order is this?</h2>
        <p className="text-muted-foreground">Choose the workflow that best fits your client's needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* New Custom Design Option */}
        <button
          onClick={() => setOrderType('custom')}
          className="group relative p-6 rounded-xl border-2 border-border hover:border-amber-400 bg-card hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all text-left"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Scissors className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-foreground mb-1">New Custom Design</h3>
              <p className="text-sm text-muted-foreground">
                Create a garment from scratch with custom measurements, fabric selection, and full design specifications.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">Full Measurements</Badge>
                <Badge variant="secondary" className="text-xs">Material Selection</Badge>
                <Badge variant="secondary" className="text-xs">Design Sketches</Badge>
              </div>
            </div>
          </div>
        </button>

        {/* Alteration Only Option */}
        <button
          onClick={() => setOrderType('alteration')}
          className="group relative p-6 rounded-xl border-2 border-border hover:border-purple-400 bg-card hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all text-left"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Wrench className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-foreground mb-1">Alteration Only</h3>
              <p className="text-sm text-muted-foreground">
                Modify an existing garment – sizing adjustments, repairs, hemming, and other alterations.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">Quick Intake</Badge>
                <Badge variant="secondary" className="text-xs">Preset Alterations</Badge>
                <Badge variant="secondary" className="text-xs">Auto Pricing</Badge>
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="flex justify-center pt-4">
        <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden"
      style={{ overscrollBehavior: 'contain', touchAction: 'none' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-background backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col border border-border/50 overflow-hidden"
      >
        {/* Header with gradient */}
        <div className={`relative ${orderType === 'alteration' ? 'bg-gradient-to-r from-purple-500 via-purple-600 to-violet-500' : 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500'} px-4 sm:px-6 py-4 flex-shrink-0`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                {orderType === 'alteration' ? (
                  <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                ) : (
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {!orderType ? 'New Order' : orderType === 'alteration' ? 'Alteration Order' : 'Dodo Wear Custom Order'}
                </h2>
                <p className="text-white/80 text-xs sm:text-sm hidden sm:block">
                  {!orderType ? 'Select order type to continue' : orderType === 'alteration' ? 'Modify existing garments' : 'Create bespoke orders with precision'}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
          
          {/* Progress indicator - only show when order type is selected */}
          {orderType && (
            <div className="relative mt-5">
              <div className="flex items-center justify-between text-xs text-white/80 mb-2">
                <span className="font-medium">Step {currentStep + 1} of {ACTIVE_WIZARD_STEPS.length}</span>
                <span className="font-semibold">{overallProgress}% Complete</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur">
                <motion.div 
                  className="h-full bg-gradient-to-r from-white via-amber-100 to-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Step Navigation - only show when order type is selected */}
        {orderType && (
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-b from-muted/50 to-background flex-shrink-0">
            <div className="flex items-center justify-between gap-0.5 overflow-x-auto">
              {ACTIVE_WIZARD_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = index === currentStep;
                const isComplete = stepCompletionStatus[index] && index < currentStep;
                const isAccessible = index <= currentStep || stepCompletionStatus.slice(0, index).every(Boolean);
                
                return (
                  <div key={step.id} className="flex items-center flex-1 last:flex-none">
                    <button
                      onClick={() => {
                        if (isAccessible && index < currentStep) {
                          setCurrentStep(index);
                          setValidationErrors([]);
                        }
                      }}
                      disabled={!isAccessible || index > currentStep}
                      className={`group flex flex-col items-center gap-1 transition-all ${
                        !isAccessible ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <motion.div 
                        className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                          isActive 
                            ? orderType === 'alteration'
                              ? 'bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-purple-500/30 shadow-lg'
                              : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/30 shadow-lg' 
                            : isComplete 
                              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/20' 
                              : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                        }`}
                        animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        {isComplete ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", damping: 10 }}
                          >
                            <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                          </motion.div>
                        ) : (
                          <StepIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                        {isActive && (
                          <div className={`absolute inset-0 rounded-xl ring-2 ${orderType === 'alteration' ? 'ring-purple-400/50' : 'ring-amber-400/50'} animate-pulse`} />
                        )}
                      </motion.div>
                      <span className={`text-[9px] sm:text-[10px] font-medium text-center leading-tight hidden sm:block ${
                        isActive 
                          ? orderType === 'alteration' ? 'text-purple-600' : 'text-amber-600' 
                          : isComplete ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}>
                        {step.label}
                      </span>
                    </button>
                    {index < ACTIVE_WIZARD_STEPS.length - 1 && (
                      <div className="flex-1 h-0.5 mx-0.5 sm:mx-1 rounded-full overflow-hidden bg-muted">
                        <motion.div 
                          className={`h-full rounded-full ${
                            stepCompletionStatus[index] && index < currentStep 
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                              : 'bg-transparent'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: stepCompletionStatus[index] && index < currentStep ? '100%' : '0%' }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div 
          className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 bg-gradient-to-b from-background to-muted/20"
          style={{ overscrollBehavior: 'contain' }}
        >
          {!orderType && !editOrderId ? (
            // Show order type selection if not editing and type not selected
            renderOrderTypeSelection()
          ) : isLoadingOrder ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-8 w-8 text-amber-500" />
              </motion.div>
              <p className="text-muted-foreground">Loading order data...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                    currentStep === ACTIVE_WIZARD_STEPS.length - 1 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : orderType === 'alteration'
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-amber-100 text-amber-600'
                  }`}>
                    {React.createElement(ACTIVE_WIZARD_STEPS[currentStep].icon, { className: "h-4 w-4 sm:h-5 sm:w-5" })}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg text-foreground">
                      {ACTIVE_WIZARD_STEPS[currentStep].label}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                      {orderType === 'alteration' ? (
                        <>
                          {currentStep === 0 && "Enter customer contact details"}
                          {currentStep === 1 && "Select alterations needed for the garment"}
                          {currentStep === 2 && "Record measurements for alterations"}
                          {currentStep === 3 && "Upload photos of the garment"}
                          {currentStep === 4 && "Review and get customer signature"}
                        </>
                      ) : (
                        <>
                          {currentStep === 0 && "Enter customer contact details"}
                          {currentStep === 1 && "Set production timeline and scheduling"}
                          {currentStep === 2 && "Specify design and fabric requirements"}
                          {currentStep === 3 && "Record body measurements by garment type"}
                          {currentStep === 4 && "Upload references and generate previews"}
                          {currentStep === 5 && "Calculate materials and labor costs"}
                          {currentStep === 6 && "Review order and get customer signature"}
                        </>
                      )}
                    </p>
                  </div>
                  {/* Show read-only badge if step is locked */}
                  {isStepReadOnly(currentStep) && (
                    <Badge variant="secondary" className="ml-auto flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Read Only
                    </Badge>
                  )}
                </div>
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer - only show when order type is selected */}
        {orderType && (
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-t bg-muted/30 backdrop-blur flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (currentStep === 0 && !editOrderId) {
                    // Go back to order type selection
                    setOrderType(null);
                  } else {
                    handleBack();
                  }
                }}
                className="gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              {/* Save as Draft button - always visible */}
              <Button
                variant="ghost"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isSubmitting}
                className="gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm"
              >
                {isSavingDraft ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Save className="h-4 w-4" />
                    </motion.div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline">Save Draft</span>
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {validationErrors.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {validationErrors.length} issue{validationErrors.length > 1 ? 's' : ''} to fix
                </div>
              )}
              
              {currentStep < ACTIVE_WIZARD_STEPS.length - 1 ? (
                <Button 
                  onClick={handleNext} 
                  className={`gap-2 shadow-lg ${
                    orderType === 'alteration'
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-purple-500/25'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/25'
                  }`}
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !formData.customerSignature}
                  className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Order
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
