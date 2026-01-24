import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shirt, Scissors, Heart, Store, Tractor, Hotel, 
  Truck, GraduationCap, HandHeart, Briefcase, Car, Layers,
  AlertTriangle, Loader2
} from "lucide-react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { BusinessType, BUSINESS_TYPE_CONFIG } from "@/lib/business-type-config";

interface DemoModeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const businessTypeIcons: Record<BusinessType, React.ComponentType<{ className?: string }>> = {
  fashion: Shirt,
  salon: Scissors,
  healthcare: Heart,
  retail: Store,
  agriculture: Tractor,
  hospitality: Hotel,
  distribution: Truck,
  school: GraduationCap,
  ngo: HandHeart,
  services: Briefcase,
  autoshop: Car,
  hybrid: Layers,
};

const businessTypeDescriptions: Record<BusinessType, string> = {
  fashion: "Custom orders, measurements, production floor",
  salon: "Appointments, services, staff scheduling",
  healthcare: "Patients, consultations, prescriptions",
  retail: "Products, variants, POS, stock alerts",
  agriculture: "Crops, livestock, harvest tracking",
  hospitality: "Rooms, bookings, guest management",
  distribution: "Bulk orders, agents, territories",
  school: "Students, fees, academic records",
  ngo: "Donors, impact metrics, communities",
  services: "Projects, time tracking, invoicing",
  autoshop: "Work orders, parts, labor estimates",
  hybrid: "Products + services, mixed inventory",
};

export function DemoModeModal({ open, onOpenChange }: DemoModeModalProps) {
  const { enableDemoMode, isSeeding, seedingProgress } = useDemoMode();
  const [selectedType, setSelectedType] = useState<BusinessType | null>(null);

  const handleEnable = async () => {
    if (!selectedType) return;
    
    try {
      await enableDemoMode(selectedType);
      onOpenChange(false);
      setSelectedType(null);
    } catch (error) {
      console.error('Failed to enable demo mode:', error);
    }
  };

  const businessTypes = Object.keys(BUSINESS_TYPE_CONFIG) as BusinessType[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Enable Demo Mode</DialogTitle>
          <DialogDescription>
            Select a business type to simulate with pre-filled demo data
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            This will seed demo data to your account for testing purposes. 
            All demo data can be cleaned up when you exit demo mode.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
          {businessTypes.map((type) => {
            const Icon = businessTypeIcons[type];
            const config = BUSINESS_TYPE_CONFIG[type];
            const isSelected = selectedType === type;

            return (
              <motion.button
                key={type}
                onClick={() => setSelectedType(type)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative p-4 rounded-lg border-2 text-left transition-all
                  ${isSelected 
                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                    : 'border-border hover:border-purple-300 hover:bg-muted/50'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    p-2 rounded-lg
                    ${isSelected ? 'bg-purple-100 text-purple-700' : 'bg-muted text-muted-foreground'}
                  `}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-sm ${isSelected ? 'text-purple-900' : ''}`}>
                      {config.label}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {businessTypeDescriptions[type]}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Seeding Progress */}
        {isSeeding && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Seeding demo data... {seedingProgress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${seedingProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSeeding}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleEnable}
            disabled={!selectedType || isSeeding}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {isSeeding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enabling...
              </>
            ) : (
              'Enable Demo Mode'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
