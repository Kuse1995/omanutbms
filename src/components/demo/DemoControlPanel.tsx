import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FlaskConical, RefreshCcw, LogOut, Presentation, 
  TrendingUp, Calendar, AlertTriangle, Sparkles,
  Clock, Wallet, Shirt, Loader2
} from "lucide-react";
import { useDemoMode, DemoScenario } from "@/contexts/DemoModeContext";
import { getBusinessTypeConfig } from "@/lib/business-type-config";
import { scenarioDescriptions } from "@/lib/demo-scenarios";
import { DemoModeModal } from "./DemoModeModal";

interface DemoControlPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const scenarioIcons: Record<DemoScenario, React.ComponentType<{ className?: string }>> = {
  'busy-sales-day': TrendingUp,
  'month-end-closing': Calendar,
  'low-stock-alert': AlertTriangle,
  'new-business': Sparkles,
  'overdue-invoices': Clock,
  'payroll-day': Wallet,
  'custom-order-rush': Shirt,
};

export function DemoControlPanel({ open, onOpenChange }: DemoControlPanelProps) {
  const { 
    demoBusinessType, 
    activeScenario,
    presentationMode,
    isSeeding,
    disableDemoMode,
    switchBusinessType,
    loadScenario,
    togglePresentationMode,
    cleanupDemoData,
  } = useDemoMode();
  
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  const businessConfig = demoBusinessType ? getBusinessTypeConfig(demoBusinessType) : null;
  
  const scenarios = Object.entries(scenarioDescriptions) as [DemoScenario, typeof scenarioDescriptions[DemoScenario]][];
  
  // Filter out fashion-only scenario for non-fashion businesses
  const availableScenarios = scenarios.filter(([key]) => {
    if (key === 'custom-order-rush' && demoBusinessType !== 'fashion') {
      return false;
    }
    return true;
  });

  const handleExit = async () => {
    await disableDemoMode();
    setShowExitConfirm(false);
    onOpenChange(false);
  };

  const handleRefresh = async () => {
    await cleanupDemoData();
    if (demoBusinessType) {
      await switchBusinessType(demoBusinessType);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-600" />
              Demo Mode Control Panel
            </SheetTitle>
            <SheetDescription>
              Manage your demo session and apply scenarios
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Current Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Business Type</span>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    {businessConfig?.label || 'Unknown'}
                  </Badge>
                </div>
                {activeScenario && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Scenario</span>
                    <Badge variant="outline">
                      {scenarioDescriptions[activeScenario]?.name}
                    </Badge>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setShowSwitchModal(true)}
                  disabled={isSeeding}
                >
                  Switch Business Type
                </Button>
              </CardContent>
            </Card>

            <Separator />

            {/* Scenarios */}
            <div>
              <h3 className="font-medium mb-3">Apply Scenario</h3>
              <div className="grid grid-cols-2 gap-2">
                {availableScenarios.map(([key, scenario]) => {
                  const Icon = scenarioIcons[key];
                  const isActive = activeScenario === key;

                  return (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => loadScenario(key)}
                      disabled={isSeeding}
                      className={`
                        p-3 rounded-lg border text-left transition-all
                        ${isActive 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-border hover:border-purple-300'
                        }
                        ${isSeeding ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-purple-600' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium">{scenario.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {scenario.description}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Presentation Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="presentation-mode" className="flex items-center gap-2">
                  <Presentation className="h-4 w-4" />
                  Presentation Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Larger fonts, hidden admin elements
                </p>
              </div>
              <Switch
                id="presentation-mode"
                checked={presentationMode}
                onCheckedChange={togglePresentationMode}
              />
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleRefresh}
                disabled={isSeeding}
              >
                {isSeeding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4 mr-2" />
                )}
                Refresh Demo Data
              </Button>
              
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={() => setShowExitConfirm(true)}
                disabled={isSeeding}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Exit Demo Mode
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Exit Confirmation */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Demo Mode?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clean up all demo data that was created during this session.
              Your real data will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExit}>
              Exit Demo Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Switch Business Type Modal */}
      <DemoModeModal 
        open={showSwitchModal}
        onOpenChange={setShowSwitchModal}
      />
    </>
  );
}
