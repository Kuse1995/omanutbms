import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { VideoShowcase } from "@/components/VideoShowcase";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Handle magic link redirect - check for access_token in URL hash
    const hashParams = window.location.hash;
    
    if (hashParams.includes('access_token')) {
      setIsProcessingAuth(true);
      
      // Let Supabase process the token, then redirect to BMS
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // Clear the hash from URL and redirect to BMS
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/bms', { replace: true });
        } else {
          setIsProcessingAuth(false);
        }
      });
    }
  }, [navigate]);

  // Show loading state while processing auth token
  if (isProcessingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#004B8D] animate-spin" />
        <p className="text-white text-lg">Signing you in...</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen">
        <Navbar />
        <HeroSection />
        <VideoShowcase />
        <Footer />
      </main>
    </PageTransition>
  );
};

export default Index;
