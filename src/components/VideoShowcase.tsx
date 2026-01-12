import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import type { CarouselApi } from "@/components/ui/carousel";
import { Play } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

// Videos can be configured per tenant in the future
const videos = [
  {
    src: "/videos/lifestraw-ad-1.mp4",
    title: "Clean Water Anywhere",
  },
  {
    src: "/videos/lifestraw-ad-2.mp4",
    title: "Safe Drinking Water",
  },
  {
    src: "/videos/lifestraw-ad-3.mp4",
    title: "Products in Action",
  },
];

const VideoCard = ({ video }: { video: { src: string; title: string } }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div 
      className="group relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-secondary shadow-lg group-hover:shadow-xl transition-shadow duration-300">
        <video
          ref={videoRef}
          src={video.src}
          className="w-full h-full object-cover"
          controls
          playsInline
          preload="metadata"
          muted={isHovered}
        >
          Your browser does not support the video tag.
        </video>
        
        {/* Decorative gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
      
      {/* Video title */}
      <p className="mt-4 text-center text-foreground font-medium">
        {video.title}
      </p>
    </div>
  );
};

export const VideoShowcase = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { companyName } = useBusinessConfig();

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Auto-advancement
  useEffect(() => {
    if (!api || isPaused) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api, isPaused]);

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-32 bg-gradient-to-b from-background to-secondary/30"
    >
      <div className="container-custom">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Play className="w-4 h-4" />
            Watch Our Videos
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            See Our Products
            <span className="text-primary block">In Action</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover how our products are making a difference 
            through our promotional videos.
          </p>
        </motion.div>

        {/* Video Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Carousel
            opts={{
              align: "center",
              loop: true,
            }}
            setApi={setApi}
            className="w-full max-w-5xl mx-auto"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <CarouselContent className="-ml-4">
              {videos.map((video) => (
                <CarouselItem key={video.src} className="pl-4 md:basis-4/5 lg:basis-3/4">
                  <VideoCard video={video} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-12 bg-primary/10 border-primary/20 hover:bg-primary hover:text-primary-foreground" />
            <CarouselNext className="hidden md:flex -right-12 bg-primary/10 border-primary/20 hover:bg-primary hover:text-primary-foreground" />
          </Carousel>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {videos.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  current === index 
                    ? "bg-primary w-8" 
                    : "bg-primary/30 hover:bg-primary/50"
                }`}
                aria-label={`Go to video ${index + 1}`}
              />
            ))}
          </div>

          {/* Mobile swipe hint */}
          <p className="text-center text-muted-foreground text-sm mt-4 md:hidden">
            Swipe to see more videos
          </p>
        </motion.div>
      </div>
    </section>
  );
};
