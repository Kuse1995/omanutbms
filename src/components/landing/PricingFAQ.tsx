import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const faqs = [
  {
    question: "How does the free trial work?",
    answer: "Start with a 14-day free trial (30 days for Enterprise). You get full access to all features in your selected plan. No credit card required to start. At the end of your trial, you can upgrade to continue using the service.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes! You can upgrade your plan at any time. Plan changes are processed by our team to ensure a smooth transition. Contact admin@omanut.co to request a plan change.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We currently process payments manually via bank transfer or mobile money. We're working on adding automated payment options. Contact us for payment details.",
  },
  {
    question: "What happens when my trial expires?",
    answer: "When your trial ends, you'll be prompted to upgrade to continue using the platform. Your data remains safe - you just won't be able to access it until you subscribe.",
  },
  {
    question: "Is there a setup fee?",
    answer: "No setup fees for Starter and Growth plans. Enterprise plans may include customization and onboarding services - contact us for details.",
  },
  {
    question: "Can I get a refund?",
    answer: "We offer a 14-day money-back guarantee for annual subscriptions. If you're not satisfied, contact us within the first 14 days of your paid subscription for a full refund.",
  },
  {
    question: "Do you offer discounts for NGOs or educational institutions?",
    answer: "Yes! We offer special pricing for non-profits, NGOs, and educational institutions. Contact us at admin@omanut.co with details about your organization.",
  },
  {
    question: "What's included in Enterprise support?",
    answer: "Enterprise customers get a dedicated account manager, priority support with guaranteed response times, custom onboarding, and SLA guarantees. White-label options are also available.",
  },
];

export function PricingFAQ() {
  return (
    <section id="faq" className="py-24 bg-muted/30">
      <div className="container-custom max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4">FAQ</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about our pricing and plans
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border rounded-lg px-6 data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <span className="font-medium">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            Still have questions?{" "}
            <a 
              href="mailto:admin@omanut.co" 
              className="text-primary hover:underline font-medium"
            >
              Get in touch
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
