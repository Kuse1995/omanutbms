import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How long does the LifeStraw filter last?",
    answer: "The lifespan depends on the product: LifeStraw Personal filters up to 4,000 liters (enough for 1 person for 5 years). LifeStraw Go filters 4,000 liters. LifeStraw Family and Community products can filter up to 18,000 liters. LifeStraw Max filters an impressive 180,000 liters. Filter life may vary based on water turbidity.",
  },
  {
    question: "How do I clean my LifeStraw?",
    answer: "For personal straws, simply blow air back through the filter to clear any debris after each use. For gravity-fed systems like the Family or Community, backflush using the included syringe or clean water reservoir. Always store your LifeStraw with caps off in a dry location. Detailed cleaning instructions are included with each product's user manual.",
  },
  {
    question: "What contaminants does LifeStraw remove?",
    answer: "LifeStraw products remove 99.999999% of bacteria (including E.coli, Salmonella), 99.999% of parasites (including Giardia, Cryptosporidium), and 99.999% of microplastics. Advanced models like the LifeStraw Max also remove viruses, chemicals, heavy metals, and improve taste through activated carbon filters.",
  },
  {
    question: "Can I use LifeStraw with any water source?",
    answer: "LifeStraw is designed to filter freshwater from streams, rivers, lakes, and other natural sources. Do not use it with saltwater, chemically contaminated water (industrial runoff, pesticides), or hot/boiling water. When in doubt about chemical contamination, seek an alternative water source.",
  },
  {
    question: "How do I know when to replace my filter?",
    answer: "When you can no longer draw water through the filter despite proper cleaning, it's time for a replacement. Some products like LifeStraw Max have filter life indicators. For Community dispensers, track usage against the rated capacity (18,000-25,000 liters depending on model).",
  },
  {
    question: "Is LifeStraw safe for children to use?",
    answer: "Yes! LifeStraw products are BPA-free and safe for all ages. The LifeStraw Go bottles are particularly popular with children for school use. Our Community dispensers are specifically designed for schools and group settings with child-friendly dispensing.",
  },
  {
    question: "Do you deliver nationwide in Zambia?",
    answer: "Yes, Finch Investments delivers LifeStraw products throughout Zambia. Delivery times vary by location: Lusaka (1-2 business days), Copperbelt & major cities (3-5 days), rural areas (5-10 days). Contact us for bulk orders or community installations.",
  },
  {
    question: "What is the Give Back program?",
    answer: "For every LifeStraw product purchased, we donate safe water to a child in need for one full year through our partnership with WASH Forums across Zambia. This 1-for-1 model has helped provide clean water to over 100 communities and counting.",
  },
];

export function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

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
            Find answers to common questions about LifeStraw products, maintenance, and our services.
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
