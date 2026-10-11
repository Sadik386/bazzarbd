import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Product } from "@/data/products";

interface WishlistContextType {
  items: string[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("wishlist");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const toggleWishlist = useCallback((product: Product) => {
    setItems((prev) => {
      const isExisting = prev.includes(product.id);
      let newItems;
      if (isExisting) {
        newItems = prev.filter((id) => id !== product.id);
        toast.info("Removed from wishlist", {
          description: `${product.name} removed from your wishlist.`,
        });
      } else {
        newItems = [...prev, product.id];
        toast.success("Added to wishlist", {
          description: `${product.name} added to your wishlist.`,
        });
      }
      localStorage.setItem("wishlist", JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  const isInWishlist = useCallback((productId: string) => {
    return items.includes(productId);
  }, [items]);

  return (
    <WishlistContext.Provider value={{ items, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};
