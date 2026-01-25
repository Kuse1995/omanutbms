import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action?: string; // Navigation action or tutorial trigger
  completed: boolean;
}

export interface OnboardingTutorial {
  id: string;
  title: string;
  steps: {
    instruction: string;
    tip?: string;
  }[];
  completed: boolean;
}

const ONBOARDING_TUTORIALS: OnboardingTutorial[] = [
  {
    id: "record-sale",
    title: "Recording Your First Sale",
    steps: [
      { instruction: "Go to **Sales → Record Sale** from the sidebar", tip: "This is your main transaction hub" },
      { instruction: "Select a product from your inventory or type a custom item", tip: "You can mix inventory items with custom entries" },
      { instruction: "Enter quantity and apply any discount if needed" },
      { instruction: "Choose the payment method (Cash, Mobile Money, Card, etc.)" },
      { instruction: "Click **Complete Sale** to record the transaction", tip: "A receipt is automatically generated!" },
    ],
    completed: false,
  },
  {
    id: "create-invoice",
    title: "Creating an Invoice",
    steps: [
      { instruction: "Navigate to **Accounts → Invoices**" },
      { instruction: "Click the **New Invoice** button (top right)" },
      { instruction: "Enter customer details: name, email, and phone" },
      { instruction: "Add line items with descriptions, quantities, and prices" },
      { instruction: "Set the due date and add any notes" },
      { instruction: "Click **Save** or **Save & Send** to email it directly", tip: "You can convert quotations to invoices in one click!" },
    ],
    completed: false,
  },
  {
    id: "add-product",
    title: "Adding Products to Inventory",
    steps: [
      { instruction: "Go to **Inventory → Shop** from the sidebar" },
      { instruction: "Click the **+ Add Product** button" },
      { instruction: "Fill in product details: name, SKU, and category" },
      { instruction: "Set the selling price and cost price", tip: "Cost price helps calculate profit margins" },
      { instruction: "Enter current stock quantity and reorder level", tip: "You'll get alerts when stock falls below reorder level" },
      { instruction: "Click **Save** to add the product" },
    ],
    completed: false,
  },
  {
    id: "send-quotation",
    title: "Sending a Quotation",
    steps: [
      { instruction: "Navigate to **Accounts → Quotations**" },
      { instruction: "Click **New Quotation**" },
      { instruction: "Enter customer/client details" },
      { instruction: "Add items with descriptions and pricing" },
      { instruction: "Set validity period (how long the quote is valid)" },
      { instruction: "Save and optionally email to the customer", tip: "When accepted, convert to invoice with one click!" },
    ],
    completed: false,
  },
  {
    id: "run-payroll",
    title: "Running Payroll",
    steps: [
      { instruction: "First, add employees in **HR → Employees**", tip: "Include salary details and bank info" },
      { instruction: "Go to **HR → Payroll**" },
      { instruction: "Click **Run Payroll** for a pay period" },
      { instruction: "Review auto-calculated deductions (PAYE, NAPSA, NHIMA)" },
      { instruction: "Approve and mark as paid when processed", tip: "Paid payroll auto-creates expense records!" },
    ],
    completed: false,
  },
  {
    id: "track-expenses",
    title: "Tracking Expenses",
    steps: [
      { instruction: "Go to **Accounts → Expenses**" },
      { instruction: "Click **+ Add Expense**" },
      { instruction: "Select the expense category (Rent, Utilities, etc.)" },
      { instruction: "Enter vendor name and amount" },
      { instruction: "Add the date incurred and any notes" },
      { instruction: "Save the expense", tip: "Set up recurring expenses for regular bills like rent!" },
    ],
    completed: false,
  },
];

const ONBOARDING_CHECKLIST: OnboardingStep[] = [
  { id: "profile", title: "Set up business profile", description: "Add your company name, logo, and contact details", completed: false },
  { id: "product", title: "Add your first product", description: "Get your inventory started", completed: false },
  { id: "sale", title: "Record your first sale", description: "Try the sales recorder", completed: false },
  { id: "invoice", title: "Create an invoice", description: "Bill a customer", completed: false },
  { id: "explore", title: "Explore the dashboard", description: "Check out your business metrics", completed: false },
];

interface OnboardingState {
  hasSeenWelcome: boolean;
  completedTutorials: string[];
  completedChecklist: string[];
  dismissedUntil?: string; // ISO date string
  lastInteraction?: string;
}

const STORAGE_KEY = "omanut-advisor-onboarding";

export function useAdvisorOnboarding() {
  const { user } = useAuth();
  const { businessProfile } = useTenant();
  const [state, setState] = useState<OnboardingState>({
    hasSeenWelcome: false,
    completedTutorials: [],
    completedChecklist: [],
  });
  const [isNewUser, setIsNewUser] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState<OnboardingTutorial | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Load state from localStorage
  useEffect(() => {
    if (!user?.id) return;
    
    const storageKey = `${STORAGE_KEY}-${user.id}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(parsed);
        
        // Check if dismissed temporarily
        if (parsed.dismissedUntil) {
          const dismissedDate = new Date(parsed.dismissedUntil);
          if (dismissedDate > new Date()) {
            setIsNewUser(false);
            return;
          }
        }
        
        // Check if onboarding is complete
        const allComplete = parsed.completedChecklist?.length >= 4;
        setIsNewUser(!allComplete && !parsed.hasSeenWelcome);
      } catch {
        setIsNewUser(true);
      }
    } else {
      setIsNewUser(true);
    }
  }, [user?.id]);

  // Save state to localStorage
  const saveState = useCallback((newState: OnboardingState) => {
    if (!user?.id) return;
    const storageKey = `${STORAGE_KEY}-${user.id}`;
    localStorage.setItem(storageKey, JSON.stringify(newState));
    setState(newState);
  }, [user?.id]);

  // Mark welcome as seen
  const markWelcomeSeen = useCallback(() => {
    saveState({ ...state, hasSeenWelcome: true, lastInteraction: new Date().toISOString() });
  }, [state, saveState]);

  // Complete a tutorial
  const completeTutorial = useCallback((tutorialId: string) => {
    const newCompletedTutorials = [...new Set([...state.completedTutorials, tutorialId])];
    saveState({ 
      ...state, 
      completedTutorials: newCompletedTutorials,
      lastInteraction: new Date().toISOString()
    });
    setActiveTutorial(null);
    setTutorialStep(0);
  }, [state, saveState]);

  // Complete a checklist item
  const completeChecklistItem = useCallback((itemId: string) => {
    const newCompletedChecklist = [...new Set([...state.completedChecklist, itemId])];
    saveState({ 
      ...state, 
      completedChecklist: newCompletedChecklist,
      lastInteraction: new Date().toISOString()
    });
  }, [state, saveState]);

  // Dismiss onboarding temporarily (24 hours)
  const dismissTemporarily = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    saveState({ 
      ...state, 
      dismissedUntil: tomorrow.toISOString(),
      lastInteraction: new Date().toISOString()
    });
    setIsNewUser(false);
  }, [state, saveState]);

  // Start a specific tutorial
  const startTutorial = useCallback((tutorialId: string) => {
    const tutorial = ONBOARDING_TUTORIALS.find(t => t.id === tutorialId);
    if (tutorial) {
      setActiveTutorial({
        ...tutorial,
        completed: state.completedTutorials.includes(tutorial.id),
      });
      setTutorialStep(0);
    }
  }, [state.completedTutorials]);

  // Navigate tutorial steps
  const nextTutorialStep = useCallback(() => {
    if (!activeTutorial) return;
    if (tutorialStep < activeTutorial.steps.length - 1) {
      setTutorialStep(prev => prev + 1);
    } else {
      completeTutorial(activeTutorial.id);
    }
  }, [activeTutorial, tutorialStep, completeTutorial]);

  const prevTutorialStep = useCallback(() => {
    if (tutorialStep > 0) {
      setTutorialStep(prev => prev - 1);
    }
  }, [tutorialStep]);

  const skipTutorial = useCallback(() => {
    setActiveTutorial(null);
    setTutorialStep(0);
  }, []);

  // Get tutorials with completion status
  const getTutorials = useCallback((): OnboardingTutorial[] => {
    return ONBOARDING_TUTORIALS.map(t => ({
      ...t,
      completed: state.completedTutorials.includes(t.id),
    }));
  }, [state.completedTutorials]);

  // Get checklist with completion status
  const getChecklist = useCallback((): OnboardingStep[] => {
    return ONBOARDING_CHECKLIST.map(item => ({
      ...item,
      completed: state.completedChecklist.includes(item.id),
    }));
  }, [state.completedChecklist]);

  // Get suggested next tutorial based on business state
  const getSuggestedTutorial = useCallback((): OnboardingTutorial | null => {
    const incomplete = getTutorials().filter(t => !t.completed);
    
    // Prioritize based on what's most useful
    if (!state.completedTutorials.includes("add-product")) {
      return incomplete.find(t => t.id === "add-product") || null;
    }
    if (!state.completedTutorials.includes("record-sale")) {
      return incomplete.find(t => t.id === "record-sale") || null;
    }
    if (!state.completedTutorials.includes("create-invoice")) {
      return incomplete.find(t => t.id === "create-invoice") || null;
    }
    
    return incomplete[0] || null;
  }, [getTutorials, state.completedTutorials]);

  // Calculate onboarding progress
  const getProgress = useCallback(() => {
    const totalItems = ONBOARDING_CHECKLIST.length + ONBOARDING_TUTORIALS.length;
    const completedItems = state.completedChecklist.length + state.completedTutorials.length;
    return Math.round((completedItems / totalItems) * 100);
  }, [state]);

  // Reset onboarding (for testing)
  const resetOnboarding = useCallback(() => {
    if (!user?.id) return;
    const storageKey = `${STORAGE_KEY}-${user.id}`;
    localStorage.removeItem(storageKey);
    setState({
      hasSeenWelcome: false,
      completedTutorials: [],
      completedChecklist: [],
    });
    setIsNewUser(true);
  }, [user?.id]);

  return {
    isNewUser,
    hasSeenWelcome: state.hasSeenWelcome,
    activeTutorial,
    tutorialStep,
    progress: getProgress(),
    
    // Actions
    markWelcomeSeen,
    completeTutorial,
    completeChecklistItem,
    dismissTemporarily,
    startTutorial,
    nextTutorialStep,
    prevTutorialStep,
    skipTutorial,
    resetOnboarding,
    
    // Data getters
    getTutorials,
    getChecklist,
    getSuggestedTutorial,
  };
}
