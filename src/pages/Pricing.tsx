import { PageTransition } from "@/components/PageTransition";
import { SaaSNavbar } from "@/components/landing/SaaSNavbar";
import { PricingSection } from "@/components/landing/PricingSection";
import { PricingFAQ } from "@/components/landing/PricingFAQ";
import { SaaSFooter } from "@/components/landing/SaaSFooter";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, Users } from "lucide-react";

const Pricing = () => {
  return (
    <PageTransition>
      <main className="min-h-screen">
        <SaaSNavbar />
        
        {/* Hero Section */}
        <section className="pt-32 pb-16 bg-gradient-to-b from-slate-900 to-background">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge variant="secondary" className="mb-6">
                Simple Pricing
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Choose your plan
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Simple plans that grow with your business. All plans include our core 
                business management features with no hidden fees.
              </p>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap justify-center gap-8 mt-12 text-slate-400"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>Cancel anytime</span>
              </div>
            </motion.div>
          </div>
        </section>

        <PricingSection />
        <PricingFAQ />
        <SaaSFooter />
      </main>
    </PageTransition>
  );
};

export default Pricing;
