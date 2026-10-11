import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { cloudinaryUrl } from "@/lib/cloudinary";

interface Banner {
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
}

interface HeroCarouselProps {
  banners: Banner[];
}

export function HeroCarousel({ banners }: HeroCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );

  React.useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Default banner if none provided
  const displayBanners = banners.length > 0 ? banners : [
    {
      title: "Elevated Essentials Honestly Priced",
      subtitle: "THE SUMMER EDIT",
      image: "/images/hero_male.webp",

      link: "/products"
    }
  ];

  return (
    <section className="relative w-full overflow-hidden bg-black full-screen">
      <Carousel
        key={displayBanners.length}
        opts={{
          loop: true,
        }}
        setApi={setApi}
        plugins={[plugin.current]}
        className="w-full h-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent className="-ml-0" style={{ height: '100dvh' } as React.CSSProperties}>
          {displayBanners.map((banner, index) => (
            <CarouselItem key={index} className="pl-0 h-full relative">
              <div className="absolute inset-0 z-0">
                <motion.div
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={current === index ? { scale: 1, opacity: 1 } : { scale: 1.2, opacity: 0 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="w-full h-full"
                >
                  <img
                    src={cloudinaryUrl(banner.image)}
                    alt={banner.title}
                    width="1920"
                    height="1080"
                    loading={index === 0 ? "eager" : "lazy"}
                    className="w-full h-full object-cover object-center brightness-[0.4] saturate-[0.9]"
                  />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
              </div>

              <div className="container mx-auto px-6 h-full flex items-end pb-24 lg:pb-28 relative z-10" style={{ minHeight: '100dvh' } as React.CSSProperties}>
                <div className="max-w-2xl">
                  <AnimatePresence mode="wait">
                    {current === index && (
                      <motion.div
                        key={`content-${index}`}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFA273]/10 border border-[#FFA273]/20 mb-6">
                          <Sparkles className="w-3.5 h-3.5 text-[#FFA273]" />
                          <span className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[#FFA273]">
                            {banner.subtitle || "New Collection"}
                          </span>
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[0.95] mb-6 text-white">
                          {banner.title.split(" ").map((word, i) => (
                            <span key={i} className={i % 2 === 1 ? "text-gradient" : ""}>
                              {word}{" "}
                            </span>
                          ))}
                        </h1>

                        <div className="flex flex-wrap gap-4 mt-8">
                          <Button asChild size="lg" className="rounded-full px-12 h-16 text-[15px] font-semibold tracking-wide bg-primary text-black hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30">
                            <Link to={banner.link || "/products"} className="flex items-center gap-2.5">
                              Shop Now <ArrowRight className="w-5 h-5" />
                            </Link>
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className="absolute bottom-8 right-8 flex items-center gap-4 z-20">
          <div className="flex gap-2">
            {displayBanners.map((_, i) => (
              <button
                key={i}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  current === i ? "bg-primary w-8" : "bg-primary/30 hover:bg-primary/50"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-2 ml-4">
            <CarouselPrevious className="static translate-y-0 h-10 w-10 border-white/10 bg-white/5 hover:bg-white/10 text-white" />
            <CarouselNext className="static translate-y-0 h-10 w-10 border-white/10 bg-white/5 hover:bg-white/10 text-white" />
          </div>
        </div>
      </Carousel>
    </section>
  );
}
