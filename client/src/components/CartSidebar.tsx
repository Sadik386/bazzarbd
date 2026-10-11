import { X, Minus, Plus, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cloudinaryUrl } from "@/lib/cloudinary";

const CartSidebar = () => {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice } = useCart();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={closeCart}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border/30 flex flex-col shadow-2xl shadow-black/50"
          >
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h2 className="text-lg font-bold tracking-wider text-foreground">CART</h2>
              <button onClick={closeCart} className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-primary/5" aria-label="Close cart">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6" data-lenis-prevent="true">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-card border border-border/30 flex items-center justify-center mb-4">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <p className="font-mono text-sm">CART IS EMPTY</p>
                  <p className="text-xs mt-2 text-muted-foreground/60">Add some products to get started</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => {
                    const price = item.product.basePrice + item.variant.priceModifier;
                    return (
                      <div key={`${item.product.id}-${item.variant.id}`} className="flex gap-4 p-3 rounded-xl bg-card/50 border border-border/20">
                        <Link
                          to={`/product/${item.product.slug}`}
                          onClick={closeCart}
                          className="w-20 h-20 bg-card rounded-lg flex items-center justify-center flex-shrink-0 border border-border/20 overflow-hidden hover:border-primary/40 transition-colors"
                        >
                          {item.product.images?.[0] ? (
                            <img src={cloudinaryUrl(item.product.images[0])} alt={item.product.name} width="80" height="80" loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                          ) : (item.product as any).product_images?.[0]?.url ? (
                            <img src={cloudinaryUrl((item.product as any).product_images[0].url)} alt={item.product.name} width="80" height="80" loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">{item.variant.name}</span>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <Link
                            to={`/product/${item.product.slug}`}
                            onClick={closeCart}
                            className="block group/item"
                          >
                            <h3 className="text-sm font-semibold truncate text-foreground group-hover/item:text-primary transition-colors">{item.product.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.variant.name}</p>
                            <p className="text-sm text-[#ff4d00] font-bold mt-1">৳{price.toFixed(2)}</p>
                          </Link>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.variant.id, item.quantity - 1)}
                              className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/5"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-xs w-6 text-center text-foreground">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.variant.id, item.quantity + 1)}
                              disabled={item.quantity >= (item.variant.stockLevel ?? Infinity)}
                              className={`p-1.5 transition-colors rounded-md ${item.quantity >= (item.variant.stockLevel ?? Infinity)
                                ? "text-muted-foreground/30 cursor-not-allowed"
                                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                                }`}
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeItem(item.product.id, item.variant.id)}
                              className="ml-auto p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md"
                              aria-label="Remove item"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-border/30 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm text-muted-foreground">TOTAL</span>
                  <span className="text-xl font-bold text-[#ff4d00]">৳{totalPrice.toFixed(2)}</span>
                </div>
                <Button className="w-full font-semibold tracking-wider rounded-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20" size="lg" onClick={() => { closeCart(); navigate("/checkout"); }}>
                  CHECKOUT <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartSidebar;
