import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { SaaSNavbar } from "@/components/landing/SaaSNavbar";
import { SaaSHero } from "@/components/landing/SaaSHero";
import { WhoItsFor } from "@/components/landing/WhoItsFor";
import { CoreCapabilities } from "@/components/landing/CoreCapabilities";
import { ModularDesign } from "@/components/landing/ModularDesign";
import { WhiteLabelReady } from "@/components/landing/WhiteLabelReady";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { SaaSFooter } from "@/components/landing/SaaSFooter";

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
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-white text-lg">Signing you in...</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen">
        <SaaSNavbar />
        <SaaSHero />
        <div id="features">
          <WhoItsFor />
        </div>
        <CoreCapabilities />
        <div id="modules">
          <ModularDesign />
        </div>
        <WhiteLabelReady />
        <FinalCTA />
        <SaaSFooter />
      </main>
    </PageTransition>
  );
};

export default Index;
