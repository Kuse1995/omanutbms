import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Download, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import lifeStrawPersonal from "@/assets/lifestraw-personal.png";
import lifeStrawGo from "@/assets/lifestraw-go-bottle.png";
import lifeStrawMax from "@/assets/lifestraw-max.png";
import lifeStrawCommunity from "@/assets/lifestraw-community.png";

const productResources = [
  {
    name: "LifeStraw Personal",
    image: lifeStrawPersonal,
    manual: "/resources/lifestraw-personal-manual.pdf",
    datasheet: "/resources/lifestraw-personal-datasheet.pdf",
    description: "Compact personal water filter",
  },
  {
    name: "LifeStraw Go",
    image: lifeStrawGo,
    manual: "/resources/lifestraw-go-manual.pdf",
    datasheet: "/resources/lifestraw-go-datasheet.pdf",
    description: "Portable water filter bottle",
  },
  {
    name: "LifeStraw Max",
    image: lifeStrawMax,
    manual: "/resources/lifestraw-max-manual.pdf",
    datasheet: "/resources/lifestraw-max-datasheet.pdf",
    description: "High-capacity filtration system",
  },
  {
    name: "LifeStraw Community",
    image: lifeStrawCommunity,
    manual: "/resources/lifestraw-community-manual.pdf",
    datasheet: "/resources/lifestraw-community-datasheet.pdf",
    evidence: "/resources/lifestraw-community-evidence.pdf",
    description: "Community-scale water purifier",
  },
];

const additionalResources = [
  {
    title: "LifeStraw Evidence Dossier",
    description: "Comprehensive scientific evidence and research documentation",
    url: "/resources/lifestraw-evidence-dossier.pdf",
  },
];

export function ProductResourcesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="section-padding bg-muted/30">
      <div className="container-custom">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-accent font-semibold tracking-wider uppercase text-sm">
            Product Resources
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mt-4 mb-6">
            Manuals & Documentation
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Download user manuals, datasheets, and technical documentation for all LifeStraw products.
          </p>
        </motion.div>

        {/* Product Resources Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {productResources.map((product, index) => (
            <motion.div
              key={product.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-border/50 hover:shadow-lg transition-shadow bg-card">
                <CardContent className="p-6">
                  <div className="aspect-square relative mb-4 bg-muted/50 rounded-xl overflow-hidden flex items-center justify-center p-4">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <h3 className="font-display font-bold text-foreground text-lg mb-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{product.description}</p>
                  <div className="space-y-2">
                    <a
                      href={product.manual}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>User Manual</span>
                      <Download className="w-3 h-3 ml-auto" />
                    </a>
                    <a
                      href={product.datasheet}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Datasheet</span>
                      <Download className="w-3 h-3 ml-auto" />
                    </a>
                    {product.evidence && (
                      <a
                        href={product.evidence}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Evidence Report</span>
                        <Download className="w-3 h-3 ml-auto" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Additional Resources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-card rounded-2xl border border-border/50 p-6 md:p-8"
        >
          <h3 className="font-display font-bold text-foreground text-xl mb-4">
            Additional Resources
          </h3>
          <div className="space-y-4">
            {additionalResources.map((resource) => (
              <div
                key={resource.title}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg"
              >
                <div>
                  <h4 className="font-medium text-foreground">{resource.title}</h4>
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
