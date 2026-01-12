import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Droplets, Heart, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { supabase } from "@/integrations/supabase/client";
import kidDrinkingWater from "@/assets/kid-drinking-water.png";

interface DynamicAnnouncement {
  id: string;
  tagline: string;
  headline: string;
  headline_accent: string;
  stat_1_value: string | null;
  stat_1_label: string | null;
  stat_2_value: string | null;
  stat_2_label: string | null;
  stat_3_value: string | null;
  stat_3_label: string | null;
  button_text: string | null;
  button_link: string | null;
}

// Static slides - "One Purchase" is now first, "Exclusive Distributors" is third
const staticSlides = [
  {
    id: "impact",
    tagline: "Every Purchase Makes a Difference",
    headline: "One Purchase =",
    headlineAccent: "One Year of Safe Water",
    subtext: "For every product sold, a child in need receives safe water for an entire school year through our Give Back program.",
    image: kidDrinkingWater,
    icon: Heart,
  },
  {
    id: "distributors",
    tagline: "Your Trusted Partner",
    headline: "Authorized Distributors",
    headlineAccent: "in the Region",
    description: "We bring world-class water purification to families, schools, and communities across the region.",
    image: kidDrinkingWater,
    icon: Droplets,
  },
];

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dynamicAnnouncement, setDynamicAnnouncement] = useState<DynamicAnnouncement | null>(null);

  // Fetch active announcement from database
  useEffect(() => {
    const fetchAnnouncement = async () => {
      const { data, error } = await supabase
        .from("hero_announcements")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        setDynamicAnnouncement(data);
      }
    };

    fetchAnnouncement();
  }, []);

  // Calculate total slides: static slides + 1 dynamic announcement if exists
  const totalSlides = staticSlides.length + (dynamicAnnouncement ? 1 : 0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  // Determine which slide to show
  // Order: Impact slide (0) -> Dynamic announcement (1, if exists) -> Distributors (2 or 1)
  const getSlideContent = () => {
    if (currentSlide === 0) {
      return { type: "impact", data: staticSlides[0] };
    }
    if (dynamicAnnouncement && currentSlide === 1) {
      return { type: "announcement", data: dynamicAnnouncement };
    }
    const distributorsIndex = dynamicAnnouncement ? 2 : 1;
    if (currentSlide === distributorsIndex) {
      return { type: "distributors", data: staticSlides[1] };
    }
    return { type: "impact", data: staticSlides[0] };
  };

  const slideContent = getSlideContent();

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-secondary/30"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Decorative water droplets */}
      <div className="absolute inset-0 opacity-20 z-20 pointer-events-none">
        <div className="absolute top-20 right-20">
          <Droplets className="w-32 h-32 text-primary" />
        </div>
        <div className="absolute bottom-32 left-16">
          <Droplets className="w-24 h-24 text-primary" />
        </div>
        <div className="absolute top-1/2 left-1/3">
          <Droplets className="w-16 h-16 text-primary" />
        </div>
      </div>

      <div className="container-custom relative z-10 py-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            {/* Slide 1: Impact (One Purchase = One Year) */}
            {slideContent.type === "impact" && (
              <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="relative order-1 flex justify-center"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-secondary/60 rounded-3xl z-10 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary/40 via-transparent to-transparent rounded-3xl z-10 pointer-events-none" />
                    <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-water/20 rounded-3xl blur-2xl opacity-60" />
                    <img
                      src={(slideContent.data as typeof staticSlides[0]).image}
                      alt="Child getting clean water"
                      className="relative z-0 max-h-[450px] md:max-h-[500px] w-auto object-cover rounded-2xl shadow-2xl"
                    />
                  </div>
                </motion.div>

                <div className="text-center md:text-left order-2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6"
                  >
                    <Heart className="w-4 h-4" />
                    <span className="text-sm font-medium tracking-wider uppercase">
                      {(slideContent.data as typeof staticSlides[0]).tagline}
                    </span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight"
                  >
                    {(slideContent.data as typeof staticSlides[0]).headline}
                    <span className="block mt-2 text-primary">
                      {(slideContent.data as typeof staticSlides[0]).headlineAccent}
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto md:mx-0 mb-8"
                  >
                    {(slideContent.data as typeof staticSlides[0]).subtext}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Button variant="default" size="lg" asChild>
                      <Link to="/impact">See Our Impact</Link>
                    </Button>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Slide 2: Dynamic Announcement (BMS-controlled) */}
            {slideContent.type === "announcement" && dynamicAnnouncement && (
              <div className="text-center max-w-5xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6"
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium tracking-wider uppercase">
                    {dynamicAnnouncement.tagline}
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-foreground mb-4 leading-tight"
                >
                  {dynamicAnnouncement.headline}
                  <span className="block mt-2 text-primary">{dynamicAnnouncement.headline_accent}</span>
                </motion.h1>

                {/* Stats */}
                {(dynamicAnnouncement.stat_1_value || dynamicAnnouncement.stat_2_value || dynamicAnnouncement.stat_3_value) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12"
                  >
                    {dynamicAnnouncement.stat_1_value && dynamicAnnouncement.stat_1_label && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-background/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-border/50"
                      >
                        <div className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary mb-2">
                          <AnimatedCounter value={dynamicAnnouncement.stat_1_value} duration={2} key={`${currentSlide}-stat1`} />
                        </div>
                        <div className="text-muted-foreground font-medium">{dynamicAnnouncement.stat_1_label}</div>
                      </motion.div>
                    )}
                    {dynamicAnnouncement.stat_2_value && dynamicAnnouncement.stat_2_label && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                        className="bg-background/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-border/50"
                      >
                        <div className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary mb-2">
                          <AnimatedCounter value={dynamicAnnouncement.stat_2_value} duration={2} key={`${currentSlide}-stat2`} />
                        </div>
                        <div className="text-muted-foreground font-medium">{dynamicAnnouncement.stat_2_label}</div>
                      </motion.div>
                    )}
                    {dynamicAnnouncement.stat_3_value && dynamicAnnouncement.stat_3_label && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 }}
                        className="bg-background/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-border/50"
                      >
                        <div className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary mb-2">
                          <AnimatedCounter value={dynamicAnnouncement.stat_3_value} duration={2} key={`${currentSlide}-stat3`} />
                        </div>
                        <div className="text-muted-foreground font-medium">{dynamicAnnouncement.stat_3_label}</div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-12"
                >
                  <Button variant="default" size="lg" asChild>
                    <Link to={dynamicAnnouncement.button_link || "/technology"}>
                      {dynamicAnnouncement.button_text || "Learn More"}
                    </Link>
                  </Button>
                </motion.div>
              </div>
            )}

            {/* Slide 3: Distributors */}
            {slideContent.type === "distributors" && (
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="text-center md:text-left order-2 md:order-1">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6"
                  >
                    <Droplets className="w-4 h-4" />
                    <span className="text-sm font-medium tracking-wider uppercase">
                      {(slideContent.data as typeof staticSlides[1]).tagline}
                    </span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight"
                  >
                    {(slideContent.data as typeof staticSlides[1]).headline}
                    <span className="block mt-2 text-primary">
                      {(slideContent.data as typeof staticSlides[1]).headlineAccent}
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg md:text-xl text-muted-foreground mb-8"
                  >
                    {(slideContent.data as typeof staticSlides[1]).description}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
                  >
                    <Button variant="default" size="lg" asChild>
                      <Link to="/products">View Products</Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link to="/contact">Contact Us</Link>
                    </Button>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="order-1 md:order-2 flex justify-center"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-water/20 rounded-3xl blur-3xl transform scale-110" />
                    <img
                      src={(slideContent.data as typeof staticSlides[1]).image}
                      alt="Water purification dispenser"
                      className="relative z-10 max-h-[500px] w-auto object-contain drop-shadow-2xl"
                    />
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 text-foreground hover:bg-background hover:scale-110 transition-all shadow-lg z-20"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 text-foreground hover:bg-background hover:scale-110 transition-all shadow-lg z-20"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Dot Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-primary w-8"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
