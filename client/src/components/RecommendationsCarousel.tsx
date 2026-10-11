import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Star, TrendingUp, Zap, X } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import type { DbProduct } from "@/hooks/useProducts";

interface RecommendationItem {
  id: string;
  slug: string;
  title: string;
  image: string;
  price: number;
  highlightType?: "border" | "background" | "badge" | "glow";
  highlightLabel?: string;
  isOutOfStock?: boolean;
  product?: DbProduct;
}

interface RecommendationsCarouselProps {
  items: RecommendationItem[];
  title?: string;
  subtitle?: string;
}

export function RecommendationsCarousel({
  items,
  title = "Expert Recommendations",
  subtitle = "CURATED FOR YOU"
}: RecommendationsCarouselProps) {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [activePickerItemId, setActivePickerItemId] = React.useState<string | null>(null);
  const [selectedAction, setSelectedAction] = React.useState<"buy" | "cart" | null>(null);
  const plugin = React.useRef(
    Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  const handleQuickAdd = (e: React.MouseEvent, item: RecommendationItem, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (item.isOutOfStock) {
      toast.error(`${item.title} is currently out of stock`);
      return;
    }

    const productObj = item.product;
    if (productObj && productObj.product_variants && productObj.product_variants.length > 0) {
      if (productObj.product_variants.length > 1) {
        setActivePickerItemId(`${item.id}-${index}`);
        setSelectedAction("cart");
      } else {
        const singleVariant = productObj.product_variants[0];
        addItem(productObj, singleVariant, 1);
        toast.success(`${item.title} added to cart`);
      }
    } else {
      toast.error("No variants available");
    }
  };

  const handleBuyNow = (e: React.MouseEvent, item: RecommendationItem, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (item.isOutOfStock) {
      toast.error(`${item.title} is currently out of stock`);
      return;
    }

    const productObj = item.product;
    if (productObj && productObj.product_variants && productObj.product_variants.length > 0) {
      if (productObj.product_variants.length > 1) {
        setActivePickerItemId(`${item.id}-${index}`);
        setSelectedAction("buy");
      } else {
        const singleVariant = productObj.product_variants[0];
        addItem(productObj, singleVariant, 1, false);
        toast.success(`${item.title} added to cart`);
        navigate("/checkout");
      }
    } else {
      toast.error("No variants available");
    }
  };

  const handleSelectVariant = (variant: any, item: RecommendationItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if ((variant.stock_level ?? 0) <= 0) {
      toast.error(`${variant.variant_name || variant.name} is out of stock`);
      return;
    }

    const productObj = item.product;
    if (!productObj) return;

    if (selectedAction === "buy") {
      addItem(productObj, variant, 1, false);
      toast.success(`${item.title} (${variant.variant_name || variant.name}) added to cart`);
      setActivePickerItemId(null);
      setSelectedAction(null);
      navigate("/checkout");
    } else {
      addItem(productObj, variant, 1);
      toast.success(`${item.title} (${variant.variant_name || variant.name}) added to cart`);
      setActivePickerItemId(null);
      setSelectedAction(null);
    }
  };

  if (items.length === 0) return null;

  // Duplicate items if we have fewer than 8 items to ensure Embla's loop mode works seamlessly
  let displayItems = items;
  if (items.length > 0 && items.length < 8) {
    displayItems = [...items, ...items];
    while (displayItems.length < 8) {
      displayItems = [...displayItems, ...items];
    }
  }

  return (
    <section className="py-16 bg-card/30 border-y border-border/20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[11px] font-bold tracking-[0.3em] text-primary uppercase mb-2">{subtitle}</p>
            <h2 className="text-3xl font-bold text-foreground">{title}</h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Link to="/products" className="text-xs font-bold tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group">
              VIEW COLLECTION <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        <Carousel
          key={displayItems.length}
          plugins={[plugin.current]}
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {displayItems.map((item, index) => (
              <CarouselItem key={`${item.id}-${index}`} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  onMouseLeave={() => {
                    setActivePickerItemId(null);
                    setSelectedAction(null);
                  }}
                  className={cn(
                    "group relative bg-background rounded-2xl overflow-hidden border transition-all duration-500",
                    item.highlightType === "border" ? "border-primary/50 shadow-lg shadow-primary/5" : "border-border/30 hover:border-primary/30",
                    item.highlightType === "glow" ? "shadow-[0_0_20px_rgba(var(--primary),0.1)]" : ""
                  )}
                >
                  <Link to={`/product/${item.slug}`} className="block h-full">
                    {/* Highlight Badge / Stock Status */}
                    {item.isOutOfStock ? (
                      <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-red-600/95 text-white text-[10px] font-bold tracking-widest uppercase rounded-full shadow-lg backdrop-blur-sm border border-red-500/30">
                        OUT OF STOCK
                      </div>
                    ) : item.highlightType === "badge" ? (
                      <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase rounded-full shadow-lg">
                        {item.highlightLabel || "MUST HAVE"}
                      </div>
                    ) : null}

                    {/* Highlight Glow Effect */}
                    {item.highlightType === "glow" && !item.isOutOfStock && (
                      <div className="absolute inset-0 bg-primary/5 animate-pulse z-0 pointer-events-none" />
                    )}

                    <div className="aspect-[4/5] overflow-hidden relative">
                      <img
                        src={item.image}
                        alt={item.title}
                        className={cn(
                          "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
                          item.isOutOfStock ? "grayscale opacity-60 brightness-[0.6]" : ""
                        )}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Action Buttons Overlay or Variant Picker */}
                      <AnimatePresence>
                        <motion.div
                          className={cn(
                            "absolute bottom-3 left-3 right-3 z-10 flex flex-col gap-1.5 transition-all duration-300",
                            activePickerItemId === `${item.id}-${index}`
                              ? "opacity-100 translate-y-0"
                              : "opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0"
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          {item.isOutOfStock ? (
                            <button
                              disabled
                              className="w-full text-[10px] font-bold tracking-[0.1em] uppercase py-2.5 rounded-xl bg-muted/85 backdrop-blur-md text-muted-foreground cursor-not-allowed border border-border/50"
                            >
                              Out Of Stock
                            </button>
                          ) : activePickerItemId === `${item.id}-${index}` ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="w-full bg-[#121417]/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl relative flex flex-col items-center gap-2"
                            >
                              {/* Close button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setActivePickerItemId(null);
                                  setSelectedAction(null);
                                }}
                                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>

                              <span className="text-[10px] font-black tracking-[0.15em] text-[#ff4d00] uppercase mb-0.5">
                                Select Size
                              </span>

                              <div className="flex flex-wrap gap-1.5 justify-center w-full max-h-24 overflow-y-auto px-1 py-0.5">
                                {item.product?.product_variants?.map((v: any, i: number) => {
                                  const inStock = (v.stock_level ?? 0) > 0;
                                  return (
                                    <button
                                      key={i}
                                      type="button"
                                      disabled={!inStock}
                                      onClick={(e) => handleSelectVariant(v, item, e)}
                                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase transition-all duration-200 ${inStock
                                          ? "bg-white/10 hover:bg-primary hover:text-primary-foreground border border-white/15 text-white cursor-pointer"
                                          : "bg-black/40 text-white/30 border border-white/5 line-through cursor-not-allowed"
                                        }`}
                                    >
                                      {v.variant_name || v.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          ) : (
                            <>
                              <button
                                onClick={(e) => handleBuyNow(e, item, index)}
                                className="w-full text-[10px] font-extrabold tracking-[0.15em] uppercase py-2.5 rounded-xl bg-[#121417] hover:bg-black text-[#e5b87c] hover:text-[#f3d9ab] transition-all duration-300 shadow-xl border border-white/5 text-center flex items-center justify-center"
                              >
                                BUY NOW
                              </button>
                              <button
                                onClick={(e) => handleQuickAdd(e, item, index)}
                                className="w-full text-[10px] font-extrabold tracking-[0.15em] uppercase py-2.5 rounded-xl bg-[#faf6f0] hover:bg-[#f6efe4] text-[#0a1e36] hover:text-[#061224] transition-all duration-300 shadow-xl border border-[#e8d5c4] text-center flex items-center justify-center"
                              >
                                ADD TO CART
                              </button>
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className={cn(
                      "p-5 space-y-2 relative z-10",
                      item.highlightType === "background" ? "bg-primary/5" : ""
                    )}>
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-foreground transition-colors">
                          {item.title}
                        </h3>
                        {item.highlightType === "badge" ? (
                          <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                        ) : (
                          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#ff4d00]">
                          ৳{item.price ? item.price.toFixed(0) : "0"}
                        </p>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <div key={star} className="w-2 h-2 rounded-full bg-primary/20" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="hidden lg:block">
            <CarouselPrevious className="-left-6 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-primary hover:text-primary-foreground" />
            <CarouselNext className="-right-6 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-primary hover:text-primary-foreground" />
          </div>
        </Carousel>
      </div>
    </section>
  );
}
