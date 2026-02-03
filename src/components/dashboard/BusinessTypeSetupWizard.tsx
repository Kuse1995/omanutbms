import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, Briefcase, Truck, GraduationCap, Heart, Stethoscope,
  Scissors, UtensilsCrossed, Wheat, Car, Shirt, Layers, Sparkles,
  Building2, ArrowRight, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import type { BusinessType } from "@/lib/business-type-config";

interface BusinessTypeOption {
  type: BusinessType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const businessTypes: BusinessTypeOption[] = [
  { type: 'retail', label: 'Retail Store', description: 'Sell products directly to customers', icon: Store, color: 'bg-blue-500' },
  { type: 'services', label: 'Professional Services', description: 'Offer services to clients', icon: Briefcase, color: 'bg-indigo-500' },
  { type: 'distribution', label: 'Distribution', description: 'Distribute products through networks', icon: Truck, color: 'bg-teal-500' },
  { type: 'school', label: 'School / Institution', description: 'Manage student fees and resources', icon: GraduationCap, color: 'bg-purple-500' },
  { type: 'ngo', label: 'NGO / Foundation', description: 'Manage donations and beneficiaries', icon: Heart, color: 'bg-rose-500' },
  { type: 'healthcare', label: 'Healthcare / Clinic', description: 'Patient consultations & services', icon: Stethoscope, color: 'bg-emerald-500' },
  { type: 'salon', label: 'Salon / Spa', description: 'Beauty and wellness services', icon: Scissors, color: 'bg-pink-500' },
  { type: 'hospitality', label: 'Hospitality', description: 'Restaurant, lodge, or catering', icon: UtensilsCrossed, color: 'bg-orange-500' },
  { type: 'agriculture', label: 'Agriculture', description: 'Farm operations and produce sales', icon: Wheat, color: 'bg-lime-600' },
  { type: 'autoshop', label: 'Auto Parts & Service', description: 'Vehicle parts and repair services', icon: Car, color: 'bg-slate-600' },
  { type: 'fashion', label: 'Fashion / Tailoring', description: 'Custom clothing and tailoring', icon: Shirt, color: 'bg-violet-500' },
  { type: 'hybrid', label: 'Hybrid Business', description: 'Products and services combined', icon: Layers, color: 'bg-cyan-500' },
];

// Pattern to detect fallback/auto-generated company names
const FALLBACK_NAME_PATTERNS = [
  /'s Business$/i,
  /'s Organization$/i,
  /^\d+.*Organization$/i,
  /^\d+.*Business$/i,
];

function isValidCompanyName(name: string | null | undefined): boolean {
  if (!name || name.trim().length < 2) return false;
  return !FALLBACK_NAME_PATTERNS.some(pattern => pattern.test(name.trim()));
}

interface BusinessTypeSetupWizardProps {
  onComplete: () => void;
}

export function BusinessTypeSetupWizard({ onComplete }: BusinessTypeSetupWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [companyName, setCompanyName] = useState("");
  const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tenantId, businessProfile, refetchTenant } = useTenant();
  const { toast } = useToast();

  // Pre-fill company name if it's a valid (non-fallback) name
  useEffect(() => {
    if (businessProfile?.company_name && isValidCompanyName(businessProfile.company_name)) {
      setCompanyName(businessProfile.company_name);
    }
  }, [businessProfile?.company_name]);

  // Pre-select business type if already set
  useEffect(() => {
    if (businessProfile?.business_type) {
      setSelectedType(businessProfile.business_type as BusinessType);
    }
  }, [businessProfile?.business_type]);

  const handleNext = () => {
    if (companyName.trim().length < 2) {
      toast({
        title: "Company name required",
        description: "Please enter at least 2 characters for your company name.",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleComplete = async () => {
    if (!selectedType || !tenantId) return;
    if (companyName.trim().length < 2) {
      toast({
        title: "Company name required",
        description: "Please go back and enter your company name.",
        variant: "destructive",
      });
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      // Update both company_name and business_type, and mark onboarding complete
      const { error } = await supabase
        .from('business_profiles')
        .update({
          company_name: companyName.trim(),
          business_type: selectedType,
          onboarding_completed: true,
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Also update the tenant name to match
      await supabase
        .from('tenants')
        .update({ name: companyName.trim() })
        .eq('id', tenantId);

      toast({
        title: "Setup complete!",
        description: "Your dashboard is now customized for your business.",
      });

      await refetchTenant();
      onComplete();
    } catch (error) {
      console.error('Error completing setup:', error);
      toast({
        title: "Error",
        description: "Failed to save your settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto"
        >
          {/* Step 1: Company Name */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-xl mx-auto"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Welcome! Let's get started
                </h1>
                <p className="text-muted-foreground text-lg">
                  First, tell us about your company.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    1
                  </span>
                  <span className="text-sm text-muted-foreground">of 2</span>
                </div>
              </div>

              <Card className="p-6 sm:p-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="company-name" className="text-base font-medium">
                      What's your company called?
                    </Label>
                    <Input
                      id="company-name"
                      type="text"
                      placeholder="e.g. Acme Trading Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-12 text-lg"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && companyName.trim().length >= 2) {
                          handleNext();
                        }
                      }}
                    />
                    <p className="text-sm text-muted-foreground">
                      This name will appear on invoices, quotes, and receipts.
                    </p>
                  </div>

                  <Button
                    size="lg"
                    onClick={handleNext}
                    disabled={companyName.trim().length < 2}
                    className="w-full"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Business Type Selection */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Now, tell us about your business
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Select your business type to unlock industry-specific features, terminology, and workflows tailored just for you.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    2
                  </span>
                  <span className="text-sm text-muted-foreground">of 2</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {businessTypes.map((option) => {
                  const isSelected = selectedType === option.type;
                  const Icon = option.icon;
                  
                  return (
                    <motion.div
                      key={option.type}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        onClick={() => setSelectedType(option.type)}
                        className={`relative cursor-pointer p-4 transition-all duration-200 border-2 hover:shadow-lg ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                          >
                            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        )}
                        
                        <div className={`w-12 h-12 rounded-xl ${option.color} flex items-center justify-center mb-3`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        
                        <h3 className="font-semibold text-foreground mb-1">{option.label}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{option.description}</p>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleBack}
                  className="min-w-[120px]"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={handleComplete}
                  disabled={!selectedType || isSubmitting}
                  className="min-w-[200px]"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Saving...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-4">
                You can change your business type later in Tenant Settings
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
