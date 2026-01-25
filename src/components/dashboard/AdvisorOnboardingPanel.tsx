import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  ChevronLeft,
  X,
  Lightbulb,
  GraduationCap,
  Rocket,
  PartyPopper
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAdvisorOnboarding, OnboardingTutorial } from "@/hooks/useAdvisorOnboarding";

interface AdvisorOnboardingPanelProps {
  onStartChat: (message: string) => void;
  onClose: () => void;
}

export function AdvisorOnboardingPanel({ onStartChat, onClose }: AdvisorOnboardingPanelProps) {
  const {
    activeTutorial,
    tutorialStep,
    progress,
    getTutorials,
    getChecklist,
    startTutorial,
    nextTutorialStep,
    prevTutorialStep,
    skipTutorial,
    completeTutorial,
  } = useAdvisorOnboarding();

  const tutorials = getTutorials();
  const checklist = getChecklist();
  const incompleteTutorials = tutorials.filter(t => !t.completed);
  const isAllComplete = progress >= 100;

  // If a tutorial is active, show the tutorial view
  if (activeTutorial) {
    return (
      <TutorialView
        tutorial={activeTutorial}
        currentStep={tutorialStep}
        onNext={nextTutorialStep}
        onPrev={prevTutorialStep}
        onSkip={skipTutorial}
        onComplete={() => completeTutorial(activeTutorial.id)}
      />
    );
  }

  // Show completion celebration
  if (isAllComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
          <PartyPopper className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="font-semibold text-lg mb-2">You're a Pro! 🎉</h3>
        <p className="text-sm text-muted-foreground mb-4">
          You've completed all the tutorials. You're ready to run your business like a boss!
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onStartChat("What else can you help me with?")}
          className="w-full"
        >
          Continue Exploring
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Getting Started</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Your progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Suggested tutorials */}
      {incompleteTutorials.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Learn the essentials:</p>
          <div className="space-y-1.5">
            {incompleteTutorials.slice(0, 3).map((tutorial) => (
              <TutorialCard
                key={tutorial.id}
                tutorial={tutorial}
                onStart={() => startTutorial(tutorial.id)}
              />
            ))}
          </div>
          {incompleteTutorials.length > 3 && (
            <button 
              className="text-xs text-primary hover:underline"
              onClick={() => onStartChat("Show me all available tutorials")}
            >
              +{incompleteTutorials.length - 3} more tutorials
            </button>
          )}
        </div>
      )}

      {/* Quick checklist */}
      <div className="space-y-2 pt-2 border-t">
        <p className="text-xs text-muted-foreground font-medium">Quick checklist:</p>
        <div className="space-y-1">
          {checklist.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2 text-xs py-1",
                item.completed && "text-muted-foreground line-through"
              )}
            >
              {item.completed ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
              <span>{item.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ask for help */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs justify-start gap-2"
        onClick={() => onStartChat("I need help getting started")}
      >
        <Lightbulb className="h-3 w-3" />
        Ask me anything about getting started
      </Button>
    </div>
  );
}

interface TutorialCardProps {
  tutorial: OnboardingTutorial;
  onStart: () => void;
}

function TutorialCard({ tutorial, onStart }: TutorialCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onStart}
      className={cn(
        "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors",
        "bg-muted/50 hover:bg-muted",
        tutorial.completed && "opacity-60"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        tutorial.completed 
          ? "bg-green-500/20 text-green-500"
          : "bg-primary/10 text-primary"
      )}>
        {tutorial.completed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Rocket className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tutorial.title}</p>
        <p className="text-xs text-muted-foreground">
          {tutorial.steps.length} steps
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </motion.button>
  );
}

interface TutorialViewProps {
  tutorial: OnboardingTutorial;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

function TutorialView({ 
  tutorial, 
  currentStep, 
  onNext, 
  onPrev, 
  onSkip,
  onComplete 
}: TutorialViewProps) {
  const step = tutorial.steps[currentStep];
  const isLastStep = currentStep === tutorial.steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{tutorial.title}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onSkip}>
          Skip
        </Button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5">
        {tutorial.steps.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              index === currentStep
                ? "bg-primary"
                : index < currentStep
                ? "bg-primary/50"
                : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                {currentStep + 1}
              </div>
              <div className="space-y-2">
                <p className="text-sm leading-relaxed">
                  {formatInstruction(step.instruction)}
                </p>
                {step.tip && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-background/50 rounded p-2">
                    <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />
                    <span>{step.tip}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={isFirstStep}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        
        <span className="text-xs text-muted-foreground">
          Step {currentStep + 1} of {tutorial.steps.length}
        </span>
        
        <Button
          size="sm"
          onClick={isLastStep ? onComplete : onNext}
          className="gap-1"
        >
          {isLastStep ? "Done" : "Next"}
          {!isLastStep && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// Helper to format markdown-like bold text
function formatInstruction(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, index) => 
    index % 2 === 1 ? (
      <strong key={index} className="text-primary font-semibold">{part}</strong>
    ) : (
      part
    )
  );
}
