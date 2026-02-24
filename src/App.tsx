import { lazy, Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/hooks/useTenant";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { UploadProvider } from "@/contexts/UploadContext";
import { ProtectedRoute } from "@/components/dashboard/ProtectedRoute";
import { DemoModeToggle } from "@/components/demo/DemoModeToggle";
import { OmanutAdvisor } from "@/components/dashboard/OmanutAdvisor";
import { Loader2 } from "lucide-react";

// Critical path - eager load
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy-loaded routes
const About = lazy(() => import("./pages/About"));
const Products = lazy(() => import("./pages/Products"));
const Technology = lazy(() => import("./pages/Technology"));
const Impact = lazy(() => import("./pages/Impact"));
const Contact = lazy(() => import("./pages/Contact"));
const Agents = lazy(() => import("./pages/Agents"));
const AgentsDirectory = lazy(() => import("./pages/AgentsDirectory"));
const Donate = lazy(() => import("./pages/Donate"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Sustainability = lazy(() => import("./pages/Sustainability"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Pay = lazy(() => import("./pages/Pay"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="sync" initial={false}>
      <Suspense fallback={<PageFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
          <Route path="/technology" element={<Technology />} />
          <Route path="/sustainability" element={<Sustainability />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/directory" element={<AgentsDirectory />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/pay" element={<ProtectedRoute><Pay /></ProtectedRoute>} />
          <Route path="/bms" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <TenantProvider>
            <DemoModeProvider>
              <BrandingProvider>
                <BrowserRouter>
                  <UploadProvider>
                    <OmanutAdvisor />
                    <Toaster />
                    <Sonner />
                    <AnimatedRoutes />
                    <DemoModeToggle />
                  </UploadProvider>
                </BrowserRouter>
              </BrandingProvider>
            </DemoModeProvider>
          </TenantProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
