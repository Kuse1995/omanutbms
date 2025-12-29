import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, margin: "-50px" });
  const { companyName, logoUrl, companyEmail, companyPhone, companyAddress, tagline } = useBusinessConfig();

  const footerLinks = [
    {
      title: "Quick Links",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Products", href: "/products" },
        { label: "Technology", href: "/technology" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Contact",
      links: [
        { label: companyAddress || "Address not configured", href: "#", isText: true },
        { label: companyPhone ? `Tel: ${companyPhone}` : "Phone not configured", href: companyPhone ? `tel:${companyPhone}` : "#", isText: !companyPhone },
        { label: companyEmail || "Email not configured", href: companyEmail ? `mailto:${companyEmail}` : "#", isText: !companyEmail },
      ],
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  return (
    <footer ref={footerRef} className="bg-foreground text-primary-foreground">
      <div className="container-custom py-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-3 gap-6"
        >
          {/* Brand */}
          <motion.div variants={itemVariants}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName || "Company Logo"}
                className="h-16 w-auto mb-3 rounded-lg"
              />
            ) : (
              <div className="h-16 w-16 mb-3 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-2xl">
                  {companyName?.charAt(0) || "B"}
                </span>
              </div>
            )}
            <p className="text-primary-foreground/70 text-sm mb-3 max-w-xs leading-relaxed">
              {tagline || "Your trusted business partner."}
            </p>
            <p className="text-primary-foreground/50 text-xs">
              © {new Date().getFullYear()} {companyName || "Company Name"}
            </p>
          </motion.div>

          {/* Links */}
          {footerLinks.map((group) => (
            <motion.div key={group.title} variants={itemVariants}>
              <h4 className="font-display font-semibold text-sm mb-3">
                {group.title}
              </h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.isText ? (
                      <span className="text-primary-foreground/70 text-sm">
                        {link.label}
                      </span>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="border-t border-primary-foreground/10"
      >
        <div className="container-custom py-4 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-primary-foreground/50 text-xs">
            Powered by Omanut BMS
          </p>
          <p className="text-primary-foreground/40 text-[10px]">
            Developed by Omanut Technologies Limited
          </p>
        </div>
      </motion.div>
    </footer>
  );
}
