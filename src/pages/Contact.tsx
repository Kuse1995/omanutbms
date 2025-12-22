import { Navbar } from "@/components/Navbar";
import { FAQSection } from "@/components/FAQSection";
import { ProductResourcesSection } from "@/components/ProductResourcesSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import { HelpCircle, Download, MessageSquare } from "lucide-react";

const Contact = () => {
  return (
    <PageTransition>
      <main className="min-h-screen">
        <Navbar />
        <div className="pt-20">
          {/* Hero Section */}
          <section className="section-padding bg-gradient-hero text-primary-foreground">
            <div className="container-custom">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center max-w-3xl mx-auto"
              >
                <span className="text-water font-semibold tracking-wider uppercase text-sm">
                  Support Center
                </span>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mt-4 mb-6">
                  How Can We Help You?
                </h1>
                <p className="text-lg text-primary-foreground/80">
                  Find answers to common questions, download product documentation, 
                  or get in touch with our support team.
                </p>
                
                {/* Quick Navigation */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
                  <a
                    href="#faq"
                    className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-xl transition-colors"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span className="font-medium">FAQs</span>
                  </a>
                  <a
                    href="#resources"
                    className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-xl transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    <span className="font-medium">Downloads</span>
                  </a>
                  <a
                    href="#contact"
                    className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-xl transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-medium">Contact Us</span>
                  </a>
                </div>
              </motion.div>
            </div>
          </section>

          {/* FAQ Section */}
          <div id="faq">
            <FAQSection />
          </div>

          {/* Product Resources Section */}
          <div id="resources">
            <ProductResourcesSection />
          </div>

          {/* Contact Form Section */}
          <ContactSection />
        </div>
        <Footer />
      </main>
    </PageTransition>
  );
};

export default Contact;
