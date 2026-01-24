import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useDemoModeSafe } from "@/contexts/DemoModeContext";
import { DemoModeModal } from "./DemoModeModal";
import { DemoControlPanel } from "./DemoControlPanel";
import { getBusinessTypeConfig } from "@/lib/business-type-config";

export function DemoModeToggle() {
  const { isSuperAdmin } = useAuth();
  const demoContext = useDemoModeSafe();
  const [showModal, setShowModal] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState(false);

  // Only render for super admins or if context is not available
  if (!isSuperAdmin || !demoContext) return null;

  const { isDemoMode, demoBusinessType, isSeeding } = demoContext;

  const businessConfig = demoBusinessType ? getBusinessTypeConfig(demoBusinessType) : null;

  const handleClick = () => {
    if (isDemoMode) {
      setShowControlPanel(true);
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              className="fixed bottom-6 right-6 z-50"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            >
              <Button
                onClick={handleClick}
                disabled={isSeeding}
                size="lg"
                className={`
                  rounded-full w-14 h-14 shadow-lg
                  ${isDemoMode 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' 
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                  }
                `}
              >
                <AnimatePresence mode="wait">
                  {isSeeding ? (
                    <motion.div
                      key="loading"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <FlaskConical className="h-6 w-6" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="icon"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <FlaskConical className="h-6 w-6" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>

              {/* Active demo badge */}
              {isDemoMode && businessConfig && (
                <motion.div
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  className="absolute -top-2 -right-2"
                >
                  <Badge 
                    variant="secondary" 
                    className="bg-white text-purple-700 shadow-md text-xs px-2"
                  >
                    {businessConfig.label}
                  </Badge>
                </motion.div>
              )}

              {/* Pulse animation when active */}
              {isDemoMode && !isSeeding && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-purple-500"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isDemoMode 
              ? `Demo Mode Active: ${businessConfig?.label || 'Unknown'}`
              : 'Enable Demo Mode'
            }
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Business Type Selection Modal */}
      <DemoModeModal 
        open={showModal} 
        onOpenChange={setShowModal} 
      />

      {/* Demo Control Panel */}
      <DemoControlPanel
        open={showControlPanel}
        onOpenChange={setShowControlPanel}
      />
    </>
  );
}
