import { motion } from "framer-motion";
import { Headphones, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

export function SupportContactButton() {
  const { companyEmail, companyPhone } = useBusinessConfig();
  
  const supportEmail = companyEmail || "abkanyanta@gmail.com";
  const supportPhone = companyPhone || "+260972064502";

  return (
    <section className="py-16 bg-background">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-gradient-hero rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-x-1/4 translate-y-1/4" />
            
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center">
                <Headphones className="w-10 h-10 text-primary-foreground" />
              </div>
              
              <h3 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-4">
                Need Direct Support?
              </h3>
              <p className="text-primary-foreground/90 mb-8 max-w-lg mx-auto">
                Our dedicated support team is ready to help with product questions, 
                bulk orders, or technical assistance. Reach out anytime!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="bg-white text-primary hover:bg-white/90 font-semibold"
                >
                  <a href={`mailto:${supportEmail}`}>
                    <Mail className="w-5 h-5 mr-2" />
                    Email Support
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/50 text-primary-foreground hover:bg-white/20 bg-transparent font-semibold"
                >
                  <a href={`tel:${supportPhone.replace(/\s/g, '')}`}>
                    <Phone className="w-5 h-5 mr-2" />
                    {supportPhone}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
