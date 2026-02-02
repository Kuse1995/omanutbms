import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";

// Platform branding - always show Omanut on public pages
const PLATFORM_NAME = "Omanut";
const PLATFORM_LOGO = "/omanut-logo.png";
const PLATFORM_TAGLINE = "Authorized distributor of quality water filtration products.";

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, margin: "-50px" });

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
        { label: "Lusaka, Zambia", href: "#", isText: true },
        { label: "WhatsApp Us", href: "https://wa.me/260972064502", isExternal: true },
        { label: "+260 972 064 502", href: "tel:+260972064502" },
        { label: "abkanyanta@gmail.com", href: "mailto:abkanyanta@gmail.com" },
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
            <img
              src={PLATFORM_LOGO}
              alt={PLATFORM_NAME}
              className="h-16 w-auto mb-3 rounded-lg"
            />
            <p className="text-primary-foreground/70 text-sm mb-3 max-w-xs leading-relaxed">
              {PLATFORM_TAGLINE}
            </p>
            <p className="text-primary-foreground/50 text-xs">
              © {new Date().getFullYear()} {PLATFORM_NAME}
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
                    ) : link.isExternal ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm"
                      >
                        {link.label}
                      </a>
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
