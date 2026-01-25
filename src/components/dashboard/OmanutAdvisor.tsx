import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Minimize2, Loader2, HelpCircle, TrendingUp, Package, Users, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTenant } from "@/hooks/useTenant";
import { useAdvisorOnboarding } from "@/hooks/useAdvisorOnboarding";
import { AdvisorOnboardingPanel } from "./AdvisorOnboardingPanel";
import { cn } from "@/lib/utils";
import advisorLogo from "@/assets/advisor-logo.png";
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/omanut-advisor`;

export function OmanutAdvisor() {
  const { tenantId, businessProfile } = useTenant();
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
    return localStorage.getItem("omanut-advisor-hidden") === "true";
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const toggleHidden = () => {
    const newHidden = !isHidden;
    setIsHidden(newHidden);
    localStorage.setItem("omanut-advisor-hidden", String(newHidden));
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

  if (isHidden) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={toggleHidden}
        className="fixed bottom-4 right-4 z-50 opacity-50 hover:opacity-100 text-xs"
      >
        <img src={advisorLogo} alt="Advisor" className="h-4 w-4 mr-1" />
        Show Advisor
      </Button>
    );
  }

  return (
    <>
      {/* Floating button with progress indicator for new users */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center group relative border border-border/50"
          >
            {/* Progress ring for new users */}
            {isNewUser && progress < 100 && (
              <svg className="absolute inset-0 w-14 h-14 -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="26"
                  fill="none"
                  stroke="rgba(0,0,0,0.1)"
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
              className="h-9 w-9 group-hover:scale-110 transition-transform object-contain" 
            />
            
            {/* New user badge */}
            {isNewUser && !hasSeenWelcome && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold text-amber-900">!</span>
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
            className="fixed bottom-6 right-6 z-50 w-[360px] h-[520px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-[var(--brand-primary,#004B8D)]/5 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden border border-border/30">
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
                              ? "bg-[var(--brand-primary,#004B8D)] text-white rounded-br-md"
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
                  className="h-9 w-9 rounded-full bg-[var(--brand-primary,#004B8D)] hover:bg-[var(--brand-primary,#004B8D)]/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
