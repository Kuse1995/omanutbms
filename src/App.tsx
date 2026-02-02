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
import Index from "./pages/Index";
import About from "./pages/About";
import Products from "./pages/Products";
import Technology from "./pages/Technology";
import Impact from "./pages/Impact";
import Contact from "./pages/Contact";
import Agents from "./pages/Agents";
import AgentsDirectory from "./pages/AgentsDirectory";
import Donate from "./pages/Donate";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Sustainability from "./pages/Sustainability";
import Pricing from "./pages/Pricing";
import Pay from "./pages/Pay";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    // Use "sync" mode for snappier navigation - no waiting for exit animations
    <AnimatePresence mode="sync" initial={false}>
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
    </AnimatePresence>
  );
}

const App = () => (
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
);

export default App;
