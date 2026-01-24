import { useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Settings, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useDemoModeSafe } from "@/contexts/DemoModeContext";
import { getBusinessTypeConfig } from "@/lib/business-type-config";
import { DemoControlPanel } from "./DemoControlPanel";

export function DemoModeIndicator() {
  const demoContext = useDemoModeSafe();
  const [showControlPanel, setShowControlPanel] = useState(false);

  // If context is not available, don't render anything
  if (!demoContext) return null;
  
  const { isDemoMode, demoBusinessType, disableDemoMode, isSeeding } = demoContext;

  if (!isDemoMode) return null;

  const businessConfig = demoBusinessType ? getBusinessTypeConfig(demoBusinessType) : null;

  return (
    <>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
      >
        <Alert className="rounded-none border-x-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-700">
          <FlaskConical className="h-4 w-4 text-white" />
          
          <AlertDescription className="flex items-center justify-between w-full">
            <span className="flex items-center gap-2">
              <strong>DEMO MODE:</strong> 
              Viewing as {businessConfig?.label || 'Unknown Business'}
              {isSeeding && (
                <span className="text-purple-200 text-sm ml-2">
                  (Loading data...)
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 h-7"
                onClick={() => setShowControlPanel(true)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Control Panel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 h-7"
                onClick={() => disableDemoMode()}
                disabled={isSeeding}
              >
                <X className="h-4 w-4 mr-1" />
                Exit
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </motion.div>

      <DemoControlPanel
        open={showControlPanel}
        onOpenChange={setShowControlPanel}
      />
    </>
  );
}
