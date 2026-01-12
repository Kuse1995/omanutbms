import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Download, FileText, BookOpen, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface ProductResource {
  id: string;
  name: string;
  image: string;
  manual: string | null;
  datasheet: string | null;
  description: string;
}

export function ProductResourcesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [products, setProducts] = useState<ProductResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProductResources() {
      try {
        const { data, error } = await supabase
          .from("inventory")
          .select("id, name, image_url, manual_url, datasheet_url, description")
          .or("manual_url.neq.,datasheet_url.neq.")
          .order("name");

        if (error) throw error;

        const mappedProducts: ProductResource[] = (data || [])
          .filter(item => item.manual_url || item.datasheet_url)
          .map(item => ({
            id: item.id,
            name: item.name,
            image: item.image_url || "/placeholder.svg",
            manual: item.manual_url,
            datasheet: item.datasheet_url,
            description: item.description || "Water filtration product",
          }));

        setProducts(mappedProducts);
      } catch (error) {
        console.error("Error fetching product resources:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProductResources();
  }, []);

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
            Download user manuals, datasheets, and technical documentation for all products.
          </p>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground">Loading resources...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No product resources available at the moment.</p>
          </div>
        )}

        {/* Product Resources Grid */}
        {!loading && products.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
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
                      {product.manual && (
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
                      )}
                      {product.datasheet && (
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
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
