import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, HeartCrack } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useWishlist } from "@/contexts/WishlistContext";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";

const Wishlist = () => {
  const { items } = useWishlist();
  const { data: paginatedResponse, isLoading } = useProducts();

  const allProducts = paginatedResponse?.products || [];
  const wishlistProducts = allProducts.filter((p) => items.includes(p.id));

  return (
    <div className="bg-background pt-24 pb-20 min-h-[80vh]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <p className="text-[11px] font-semibold tracking-[0.3em] text-primary uppercase mb-3">Your Selection</p>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground">Wishlist</h1>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-4 animate-pulse">
                <div className="bg-card aspect-[3/4] rounded-xl" />
                <div className="h-4 w-3/4 bg-card rounded" />
                <div className="h-4 w-1/4 bg-card rounded" />
              </div>
            ))}
          </div>
        ) : wishlistProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {wishlistProducts.map((product, idx) => (
              <div key={product.id} className="group">
                <ProductCard product={product} index={idx} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
              <HeartCrack className="w-10 h-10 text-primary/40" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              Save your favorite items here to review them later or easily move them to your cart.
            </p>
            <Button asChild size="lg" className="rounded-full">
              <Link to="/products" className="flex items-center gap-2">
                Discover Products <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
