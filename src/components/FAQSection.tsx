import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

export function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { companyName } = useBusinessConfig();

  // Generic FAQs that work for any business
  const faqs = [
    {
      question: "How do I place an order?",
      answer: `You can place an order by contacting us directly via phone, email, or through our contact form. Our team at ${companyName || "our company"} will assist you with your purchase and provide all necessary information.`,
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept various payment methods including bank transfers, mobile money, and cash payments. For large orders, we can also arrange flexible payment terms.",
    },
    {
      question: "Do you offer delivery services?",
      answer: `Yes, ${companyName || "we"} offers delivery services. Delivery times vary by location and order size. Contact us for specific delivery information for your area.`,
    },
    {
      question: "What is your return policy?",
      answer: "We stand behind the quality of our products. If you receive a defective item, please contact us within 7 days of delivery for a replacement or refund. Terms and conditions apply.",
    },
    {
      question: "How can I become a reseller or agent?",
      answer: "We welcome business partnerships! Visit our Agents page or contact us directly to learn about our agent program and partnership opportunities.",
    },
    {
      question: "Do you offer bulk pricing for large orders?",
      answer: "Yes, we offer competitive pricing for bulk and wholesale orders. Contact our sales team to discuss your requirements and receive a custom quote.",
    },
  ];

  return (
    <section className="py-16 bg-secondary/30">
      <div className="container-custom">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-accent font-semibold tracking-wider uppercase text-sm">
            Resource Hub
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-4 mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Find answers to common questions about our products, services, and policies.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-xl border border-border/50 px-6 shadow-soft overflow-hidden"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline py-5 font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
