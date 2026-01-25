import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useDragControls } from "framer-motion";
import { X, Send, Minimize2, Loader2, HelpCircle, TrendingUp, Package, Users, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTenant } from "@/hooks/useTenant";
import { useAdvisorOnboarding } from "@/hooks/useAdvisorOnboarding";
import { AdvisorOnboardingPanel } from "./AdvisorOnboardingPanel";
import { cn } from "@/lib/utils";
import advisorLogo from "@/assets/advisor-logo-client.png";

const ADVISOR_POSITION_KEY = "omanut-advisor-position-v1";

// Responsive margins for mobile and desktop
const MOBILE_MARGIN = 16;
const DESKTOP_MARGIN = 24;
const MOBILE_BREAKPOINT = 768;

function getMargin() {
  return window.innerWidth < MOBILE_BREAKPOINT ? MOBILE_MARGIN : DESKTOP_MARGIN;
}

function safeParsePosition(raw: string | null): { x: number; y: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "x" in parsed &&
      "y" in parsed &&
      typeof (parsed as any).x === "number" &&
      typeof (parsed as any).y === "number"
    ) {
      return { x: (parsed as any).x, y: (parsed as any).y };
    }
    return null;
  } catch {
    return null;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function getWidgetSize(isOpen: boolean, isHidden: boolean) {
  if (isHidden) return { w: 160, h: 40 };
  if (isOpen) return { w: 360, h: 520 };
  return { w: 56, h: 56 };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/omanut-advisor`;

export function OmanutAdvisor() {
  const { tenantId, businessProfile } = useTenant();
  const prefersReducedMotion = useReducedMotion();
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);
  
  // Track whether user has dragged the widget
  const [hasBeenDragged, setHasBeenDragged] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ADVISOR_POSITION_KEY) !== null;
  });
  
  // Position values for when dragged
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const {
    isNewUser,
    hasSeenWelcome,
    progress,
    markWelcomeSeen,
    startTutorial,
    getSuggestedTutorial,
    activeTutorial,
  } = useAdvisorOnboarding();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("omanut-advisor-hidden") === "true";
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Render into a portal so the widget isn't affected by parent transforms/stacking contexts.
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  // Calculate clamped position without causing re-renders
  const clampPosition = useCallback((nextX: number, nextY: number) => {
    if (typeof window === "undefined") return { x: nextX, y: nextY };

    const { w, h } = getWidgetSize(isOpen, isHidden);
    const margin = getMargin();
    const minX = margin;
    const minY = margin;
    const maxX = Math.max(minX, window.innerWidth - w - margin);
    const maxY = Math.max(minY, window.innerHeight - h - margin);

    return {
      x: clamp(nextX, minX, maxX),
      y: clamp(nextY, minY, maxY),
    };
  }, [isOpen, isHidden]);

  // Initialize position from localStorage if previously dragged
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const stored = safeParsePosition(window.localStorage.getItem(ADVISOR_POSITION_KEY));
    if (stored) {
      const clamped = clampPosition(stored.x, stored.y);
      x.set(clamped.x);
      y.set(clamped.y);
      setHasBeenDragged(true);
    }
  }, []); // Only run once on mount

  // Re-clamp when widget size changes (open/close) - only if already dragged
  useEffect(() => {
    if (!hasBeenDragged || typeof window === "undefined") return;
    
    const clamped = clampPosition(x.get(), y.get());
    x.set(clamped.x);
    y.set(clamped.y);
  }, [isOpen, isHidden, hasBeenDragged]);

  // Handle window resize - only if already dragged
  useEffect(() => {
    if (!hasBeenDragged || typeof window === "undefined") return;

    const handleResize = () => {
      const clamped = clampPosition(x.get(), y.get());
      x.set(clamped.x);
      y.set(clamped.y);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hasBeenDragged, clampPosition]);

  const persistPosition = useCallback(() => {
    if (typeof window === "undefined") return;
    const payload = { x: x.get(), y: y.get() };
    window.localStorage.setItem(ADVISOR_POSITION_KEY, JSON.stringify(payload));
  }, [x, y]);

  const handleDrag = useCallback((_: any, info: { delta: { x: number; y: number } }) => {
    if (!hasBeenDragged) {
      // First drag - calculate initial position from bottom-right
      const { w, h } = getWidgetSize(isOpen, isHidden);
      const margin = getMargin();
      const initialX = window.innerWidth - w - margin;
      const initialY = window.innerHeight - h - margin;
      x.set(initialX);
      y.set(initialY);
      setHasBeenDragged(true);
    }
    
    const clamped = clampPosition(x.get() + info.delta.x, y.get() + info.delta.y);
    x.set(clamped.x);
    y.set(clamped.y);
  }, [hasBeenDragged, isOpen, isHidden, clampPosition, x, y]);

  const handleDragEnd = useCallback(() => {
    persistPosition();
  }, [persistPosition]);

  // Auto-show onboarding panel for new users
  useEffect(() => {
    if (isOpen && isNewUser && !hasSeenWelcome && messages.length === 0) {
      setShowOnboarding(true);
    }
  }, [isOpen, isNewUser, hasSeenWelcome, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current && !showOnboarding) {
      inputRef.current.focus();
    }
  }, [isOpen, showOnboarding]);

  // Trigger bounce animation after initial mount
  useEffect(() => {
    if (!isOpen && !isHidden && !hasAnimated) {
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, 500); // Delay before bounce starts
      return () => clearTimeout(timer);
    }
  }, [isOpen, isHidden, hasAnimated]);

  const toggleHidden = () => {
    const newHidden = !isHidden;
    setIsHidden(newHidden);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("omanut-advisor-hidden", String(newHidden));
    }
    if (newHidden) setIsOpen(false);
  };

  // Generate contextual quick prompts based on business state and onboarding
  const quickPrompts = useMemo(() => {
    const prompts: { text: string; icon?: React.ReactNode }[] = [];

    // For new users, prioritize onboarding
    if (isNewUser && progress < 50) {
      prompts.push({ text: "Show me how to get started", icon: <GraduationCap className="h-3 w-3" /> });
      
      const suggested = getSuggestedTutorial();
      if (suggested) {
        prompts.push({ text: `How do I ${suggested.title.toLowerCase()}?`, icon: <HelpCircle className="h-3 w-3" /> });
      }
    } else {
      prompts.push({ text: "How's business today?", icon: <TrendingUp className="h-3 w-3" /> });
    }

    // Add contextual prompts based on what features might need attention
    if (businessProfile) {
      if (businessProfile.inventory_enabled !== false) {
        prompts.push({ text: "What should I restock?", icon: <Package className="h-3 w-3" /> });
      }

      if (!isNewUser) {
        prompts.push({ text: "Who should I follow up with?", icon: <Users className="h-3 w-3" /> });
      }
    }

    // Always offer help
    if (prompts.length < 4) {
      prompts.push({ text: "What can you help me with?", icon: <HelpCircle className="h-3 w-3" /> });
    }

    return prompts.slice(0, 4);
  }, [businessProfile, isNewUser, progress, getSuggestedTutorial]);

  const sendMessage = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    // Hide onboarding panel when user starts chatting
    if (showOnboarding) {
      setShowOnboarding(false);
      markWelcomeSeen();
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: textToSend,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    const assistantId = crypto.randomUUID();

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === assistantId) {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { id: assistantId, role: "assistant", content: assistantContent }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          tenantId,
          isNewUser,
          onboardingProgress: progress,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to connect");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Advisor error:", error);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "Sorry, I couldn't respond. Try again!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, tenantId, isLoading, showOnboarding, markWelcomeSeen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => sendMessage(prompt), 50);
  };

  const handleStartChat = (message: string) => {
    setShowOnboarding(false);
    markWelcomeSeen();
    handleQuickPrompt(message);
  };

  if (!portalTarget) return null;

  // CSS-based default position (bottom-right)
  const margin = typeof window !== "undefined" ? getMargin() : DESKTOP_MARGIN;
  
  // Default style anchored to bottom-right
  const defaultPositionStyle: React.CSSProperties = {
    position: "fixed",
    bottom: margin,
    right: margin,
    top: "auto",
    left: "auto",
    zIndex: 100,
  };
  
  // Dragged style uses x/y translation from top-left
  const draggedPositionStyle: React.CSSProperties = {
    position: "fixed",
    left: 0,
    top: 0,
    right: "auto",
    bottom: "auto",
    zIndex: 100,
  };

  return createPortal(
    <>
      {/* Drag constraints area (viewport). */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 99 }} />

      {isHidden ? (
        <motion.div
          style={hasBeenDragged ? { ...draggedPositionStyle, x, y, pointerEvents: "none" } : { ...defaultPositionStyle, pointerEvents: "none" }}
          className="pointer-events-none"
          drag
          dragMomentum={false}
          dragElastic={0.12}
          dragConstraints={constraintsRef}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleHidden}
            className="pointer-events-auto opacity-70 hover:opacity-100 text-xs bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50 border border-border"
          >
            <img src={advisorLogo} alt="Advisor" className="h-4 w-4 mr-1 object-contain" />
            Show Advisor
          </Button>
        </motion.div>
      ) : (
        <>
          {/* Floating button with progress indicator for new users */}
          <AnimatePresence>
            {!isOpen && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                onClick={() => setIsOpen(true)}
                className={cn(
                  "pointer-events-auto w-14 h-14 rounded-full",
                  "bg-background border border-border shadow-elevated",
                  "transition-shadow flex items-center justify-center group relative",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                  hasAnimated && "animate-bounce-subtle"
                )}
                style={hasBeenDragged ? { ...draggedPositionStyle, x, y } : defaultPositionStyle}
                drag
                dragMomentum={false}
                dragElastic={0.12}
                dragConstraints={constraintsRef}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
              >
                {/* Glow halo */}
                <motion.span
                  aria-hidden
                  className="absolute -inset-3 rounded-full bg-primary/25 blur-2xl"
                  initial={prefersReducedMotion ? { opacity: 0.35 } : { opacity: 0.35, scale: 0.95 }}
                  animate={
                    prefersReducedMotion
                      ? { opacity: 0.35 }
                      : { opacity: [0.25, 0.55, 0.25], scale: [0.95, 1.08, 0.95] }
                  }
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
                  }
                />

                {/* Progress ring for new users */}
                {isNewUser && progress < 100 && (
                  <svg className="absolute inset-0 w-14 h-14 -rotate-90">
                    <circle
                      cx="28"
                      cy="28"
                      r="26"
                      fill="none"
                      stroke="hsl(var(--border) / 0.9)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="26"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="3"
                      strokeDasharray={`${(progress / 100) * 163} 163`}
                      className="transition-all duration-500"
                    />
                  </svg>
                )}
                <img 
                  src={advisorLogo} 
                  alt="Advisor" 
                  className="h-9 w-9 group-hover:scale-110 transition-transform object-contain relative" 
                />
                
                {/* New user badge */}
                {isNewUser && !hasSeenWelcome && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-soft">
                    <span className="text-[10px] font-bold">!</span>
                  </span>
                )}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Chat window */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="pointer-events-auto bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden w-[360px] h-[520px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)]"
                style={hasBeenDragged ? { ...draggedPositionStyle, x, y } : defaultPositionStyle}
                drag
                dragMomentum={false}
                dragListener={false}
                dragControls={dragControls}
                dragElastic={0.06}
                dragConstraints={constraintsRef}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-transparent cursor-move select-none"
                  onPointerDown={(e) => dragControls.start(e)}
                  title="Drag to move"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center overflow-hidden border border-border/30">
                      <img src={advisorLogo} alt="Advisor" className="h-6 w-6 object-contain" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Omanut Advisor</h3>
                      <p className="text-[10px] text-muted-foreground">
                        {isNewUser && progress < 100 
                          ? `Getting started • ${progress}% complete`
                          : "Your business coach"
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Toggle onboarding panel */}
                    {isNewUser && progress < 100 && messages.length > 0 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setShowOnboarding(!showOnboarding)}
                        title="Show tutorials"
                      >
                        <GraduationCap className={cn(
                          "h-3.5 w-3.5 transition-colors",
                          showOnboarding && "text-primary"
                        )} />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={toggleHidden}
                      title="Hide advisor"
                    >
                      <Minimize2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Onboarding panel (collapsible) */}
                  <AnimatePresence>
                    {showOnboarding && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b overflow-hidden bg-muted/30"
                      >
                        <AdvisorOnboardingPanel
                          onStartChat={handleStartChat}
                          onClose={() => {
                            setShowOnboarding(false);
                            markWelcomeSeen();
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    {messages.length === 0 && !showOnboarding ? (
                      <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm border border-border/30">
                          <img src={advisorLogo} alt="Advisor" className="h-9 w-9 object-contain" />
                        </div>
                        <h4 className="font-medium text-sm mb-1">
                          {isNewUser ? "Welcome! 👋" : "Hey there! 👋"}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          {isNewUser 
                            ? "I'm here to help you get started. Ask me anything!"
                            : "I'm your business coach. Ask me anything!"
                          }
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {quickPrompts.map((prompt) => (
                            <button
                              key={prompt.text}
                              onClick={() => handleQuickPrompt(prompt.text)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-full transition-colors"
                            >
                              {prompt.icon}
                              {prompt.text}
                            </button>
                          ))}
                        </div>
                        
                        {/* Show onboarding button for new users */}
                        {isNewUser && progress < 100 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 gap-2"
                            onClick={() => setShowOnboarding(true)}
                          >
                            <GraduationCap className="h-3.5 w-3.5" />
                            View Tutorials ({progress}% done)
                          </Button>
                        )}
                      </div>
                    ) : messages.length === 0 ? null : (
                      <div className="space-y-3">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex",
                              msg.role === "user" ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[85%] px-3 py-2 rounded-2xl text-sm",
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted rounded-bl-md"
                              )}
                            >
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                        {isLoading && messages[messages.length - 1]?.role === "user" && (
                          <div className="flex justify-start">
                            <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-md">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Input */}
                <div className="p-3 border-t bg-background">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about your business..."
                      className="flex-1 h-9 text-sm rounded-full px-4"
                      disabled={isLoading}
                    />
                    <Button
                      size="icon"
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || isLoading}
                      className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>,
    portalTarget
  );
}
