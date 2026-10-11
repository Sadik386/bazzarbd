import { Link, useNavigate } from "react-router-dom";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { DbProduct } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { toast } from "sonner";
import { X } from "lucide-react";

interface ProductCardProps {
  product: DbProduct;
  index?: number;
}

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"buy" | "cart" | null>(null);
  const [isTouchDevice] = useState(() => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  
  const isWishlisted = isInWishlist(product.id);
  
  // Calculate if product is out of stock across all variants
  const totalStock = product.product_variants?.reduce((acc, v) => acc + (v.stock_level || 0), 0) ?? 0;
  const isOutOfStock = totalStock === 0;

  // Consistent pseudo-random hash generator based on product ID to keep ratings/reviews stable
  const getSeededValue = (str: string, seed: number) => {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const seedString = product.id || product.name || "";
  const ratingSeed = getSeededValue(seedString, 12345);
  const reviewSeed = getSeededValue(seedString, 67890);

  // Use rating override if set, otherwise default to seeded rating
  const rating = product.rating_override !== undefined && product.rating_override !== null
    ? Number(product.rating_override).toFixed(1)
    : (4.0 + (ratingSeed % 11) * 0.1).toFixed(1);
  
  // Use review count override if set, otherwise default to seeded count
  const reviewCount = product.review_count_override !== undefined && product.review_count_override !== null
    ? Number(product.review_count_override)
    : 50 + (reviewSeed % 450);
  
  const colors = ["#3a3a3a", "#1a1a1a", "#4a5d4e", "#7c6a5a"];

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOutOfStock) {
      toast.error(`${product.name} is currently out of stock`);
      return;
    }
    
    if (product.product_variants && product.product_variants.length > 0) {
      if (product.product_variants.length > 1) {
        setShowVariantPicker(true);
        setSelectedAction("cart");
      } else {
        const singleVariant = product.product_variants[0];
        addItem(product, singleVariant, 1);
        toast.success(`${product.name} added to cart`);
      }
    } else {
      toast.error("No variants available");
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOutOfStock) {
      toast.error(`${product.name} is currently out of stock`);
      return;
    }
    
    if (product.product_variants && product.product_variants.length > 0) {
      if (product.product_variants.length > 1) {
        setShowVariantPicker(true);
        setSelectedAction("buy");
      } else {
        const singleVariant = product.product_variants[0];
        addItem(product, singleVariant, 1, false);
        toast.success(`${product.name} added to cart`);
        navigate("/checkout");
      }
    } else {
      toast.error("No variants available");
    }
  };

  const handleSelectVariant = (variant: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if ((variant.stock_level ?? 0) <= 0) {
      toast.error(`${variant.variant_name || variant.name} is out of stock`);
      return;
    }

    if (selectedAction === "buy") {
      addItem(product, variant, 1, false);
      toast.success(`${product.name} (${variant.variant_name || variant.name}) added to cart`);
      setShowVariantPicker(false);
      setSelectedAction(null);
      navigate("/checkout");
    } else {
      addItem(product, variant, 1);
      toast.success(`${product.name} (${variant.variant_name || variant.name}) added to cart`);
      setShowVariantPicker(false);
      setSelectedAction(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.05 }}
      className="group"
    >
      <Link
        to={`/product/${product.slug}`}
        className="block"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setShowVariantPicker(false);
          setSelectedAction(null);
        }}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-card rounded-xl border border-border/30 group-hover:border-primary/20 transition-all duration-500">
          {product.product_images?.[0]?.url ? (
            <img 
              src={cloudinaryUrl(product.product_images[0].url)} 
              alt={product.name} 
              width="500"
              height="666"
              loading="lazy"
              onError={(e) => {
                // If proxy fails, fall back to the direct original URL
                const originalUrl = product.product_images[0].url;
                if (e.currentTarget.src !== originalUrl) {
                  e.currentTarget.src = originalUrl;
                }
              }}
              className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${
                isOutOfStock 
                  ? "grayscale opacity-60 brightness-[0.6] group-hover:brightness-[0.75]" 
                  : "brightness-90 group-hover:brightness-100"
              }`} 
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-card/50 text-muted-foreground/30 gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              <span className="text-[10px] tracking-widest uppercase font-semibold opacity-50">No Image</span>
            </div>
          )}

          {/* Gradient overlay - always visible on mobile */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition-opacity duration-500 ${isTouchDevice ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

          {/* Wishlist Button - always visible on mobile */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product);
            }}
            className={`absolute top-3 right-3 z-10 p-2 rounded-full bg-background/50 backdrop-blur-md text-foreground/70 hover:text-primary hover:bg-background/80 transition-all ${isTouchDevice ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            style={{ touchAction: 'manipulation' }}
            aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={isWishlisted ? "text-primary" : ""}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>

          {/* Action Buttons Overlay or Variant Picker - always visible on mobile */}
          <AnimatePresence>
            {(hovered || showVariantPicker || isTouchDevice) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-3 left-3 right-3 z-10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {isOutOfStock ? (
                  <button 
                    disabled
                    className="w-full text-[10px] font-bold tracking-[0.1em] uppercase py-2.5 rounded-xl bg-muted/80 backdrop-blur-md text-muted-foreground cursor-not-allowed border border-border/50"
                  >
                    Out Of Stock
                  </button>
                ) : showVariantPicker ? (
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
                        setShowVariantPicker(false);
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
                      {product.product_variants?.map((v: any, i: number) => {
                        const inStock = (v.stock_level ?? 0) > 0;
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={!inStock}
                            onClick={(e) => handleSelectVariant(v, e)}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase transition-all duration-200 ${
                              inStock
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
                  <div className="flex flex-col gap-1.5 w-full">
                    <button 
                      onClick={handleBuyNow}
                      className="w-full text-[10px] font-extrabold tracking-[0.15em] uppercase py-2.5 rounded-xl bg-[#121417] hover:bg-black text-[#e5b87c] hover:text-[#f3d9ab] transition-all duration-300 shadow-xl border border-white/5 text-center flex items-center justify-center"
                    >
                      BUY NOW
                    </button>
                    <button 
                      onClick={handleQuickAdd}
                      className="w-full text-[10px] font-extrabold tracking-[0.15em] uppercase py-2.5 rounded-xl bg-[#faf6f0] hover:bg-[#f6efe4] text-[#0a1e36] hover:text-[#061224] transition-all duration-300 shadow-xl border border-[#e8d5c4] text-center flex items-center justify-center"
                    >
                      ADD TO CART
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {isOutOfStock ? (
             <div className="absolute top-3 left-3 bg-red-600/95 text-white text-[9px] font-bold tracking-[0.15em] uppercase px-3 py-1 rounded-full backdrop-blur-sm shadow-md border border-red-500/30 z-10">
               Out of Stock
             </div>
          ) : product.is_featured ? (
             <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground text-[9px] font-bold tracking-[0.15em] uppercase px-3 py-1 rounded-full backdrop-blur-sm z-10">
               Best Seller
             </div>
          ) : null}
        </div>

        <div className="pt-4 space-y-1.5">
          <p className="text-[11px] tracking-[0.3em] font-black text-[#ff4d00] uppercase">
            {product.categories?.name || 'HOODIES'}
          </p>
          <h3 className="text-[22px] font-extrabold tracking-tight text-foreground transition-colors group-hover:text-foreground leading-tight py-0.5">
            {product.name}
          </h3>
          <p className="text-[13px] text-muted-foreground/60 font-medium truncate mb-2">{product.short_description || "Premium Quality"}</p>
          
          <div className="flex items-center gap-2">
            <span className="text-[20px] font-black text-[#ff4d00]">
              ৳{product.base_price ? Number(product.base_price).toFixed(2) : "0.00"}
            </span>
            {product.traditional_price && (
              <span className="text-[14px] text-muted-foreground/40 line-through font-medium">
                ৳{Number(product.traditional_price).toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 py-0.5">
             <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                   <svg key={star} className={`w-3.5 h-3.5 ${star <= Number(rating) ? 'fill-primary' : 'fill-muted text-muted'}`} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                   </svg>
                ))}
             </div>
             <span className="text-[13px] font-medium text-muted-foreground">({reviewCount})</span>
          </div>

          {/* Color Swatches */}
          <div className="flex gap-2 pt-1.5">
             {colors.map((color, i) => (
                <div 
                  key={i} 
                  className="w-4 h-4 rounded-full border border-border/50 transition-all hover:scale-125 hover:border-primary/40 cursor-pointer" 
                  style={{ backgroundColor: color }}
                />
             ))}
             <span className="text-[12px] text-muted-foreground ml-1">+2</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
