import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import { Leaf, Recycle, Droplets, Globe, TreePine, Heart } from "lucide-react";

const initiatives = [
  {
    icon: Droplets,
    title: "Clean Water Access",
    description: "Every LifeStraw product sold contributes to providing safe drinking water to communities in need across Zambia.",
  },
  {
    icon: Recycle,
    title: "Sustainable Materials",
    description: "LifeStraw products are designed with durability in mind, reducing single-use plastic bottle consumption by thousands per filter.",
  },
  {
    icon: TreePine,
    title: "Carbon Footprint Reduction",
    description: "By eliminating the need for boiling water or purchasing bottled water, LifeStraw helps reduce carbon emissions significantly.",
  },
  {
    icon: Globe,
    title: "Community Health",
    description: "We partner with local WASH Forums to ensure sustainable water solutions reach the communities that need them most.",
  },
  {
    icon: Heart,
    title: "Give Back Program",
    description: "A portion of every sale funds our donation program, providing LifeStraw products to schools and vulnerable communities.",
  },
  {
    icon: Leaf,
    title: "Environmental Education",
    description: "We work with communities to promote water conservation and environmental stewardship for future generations.",
  },
];

export default function Sustainability() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
        <Navbar />
        
        <main className="pt-24 pb-16">
          <div className="container-custom">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-6">
                <Leaf className="h-4 w-4" />
                <span className="text-sm font-medium">Our Commitment</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
                Responsibility to <span className="text-green-600">Earth</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                At Finch Investments, we believe that access to clean water and environmental 
                sustainability go hand in hand. Our mission extends beyond water filtration—we're 
                committed to protecting our planet for future generations.
              </p>
            </motion.div>

            {/* Impact Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
            >
              <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">1M+</div>
                <div className="text-muted-foreground">Plastic Bottles Saved</div>
              </div>
              <div className="bg-lifestraw/10 border border-lifestraw/30 rounded-xl p-8 text-center">
                <div className="text-4xl font-bold text-lifestraw mb-2">10,000+</div>
                <div className="text-muted-foreground">Liters Filtered Daily</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
                <div className="text-4xl font-bold text-amber-600 mb-2">50+</div>
                <div className="text-muted-foreground">Communities Served</div>
              </div>
            </motion.div>

            {/* Initiatives Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h2 className="text-2xl font-display font-bold text-foreground text-center mb-8">
                Our Sustainability Initiatives
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {initiatives.map((initiative, index) => (
                  <motion.div
                    key={initiative.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                    className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                      <initiative.icon className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {initiative.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {initiative.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-16 bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 md:p-12 text-center text-white"
            >
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
                Join Our Mission
              </h2>
              <p className="text-green-100 mb-6 max-w-2xl mx-auto">
                Every LifeStraw purchase contributes to a cleaner, healthier Zambia. 
                Together, we can make safe water accessible to all while protecting our environment.
              </p>
              <a
                href="/donate"
                className="inline-flex items-center gap-2 bg-white text-green-700 px-6 py-3 rounded-lg font-medium hover:bg-green-50 transition-colors"
              >
                <Heart className="h-5 w-5" />
                Donate Water Today
              </a>
            </motion.div>
          </div>
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
}
