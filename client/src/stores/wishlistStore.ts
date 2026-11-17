import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getId } from "@/lib/format";
import type { Product } from "@/types";

interface WishlistState {
  items: Product[];
  recentlyViewedIds: string[];
  toggleItem: (product: Product) => boolean;
  removeItem: (productId: string) => void;
  hasItem: (productId: string) => boolean;
  recordViewed: (productId: string) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      recentlyViewedIds: [],

      toggleItem: (product) => {
        const id = getId(product);
        const exists = get().items.some((p) => getId(p) === id);
        if (exists) {
          set((s) => ({ items: s.items.filter((p) => getId(p) !== id) }));
          return false;
        }
        set((s) => ({ items: [product, ...s.items] }));
        return true;
      },

      removeItem: (productId) => {
        set((s) => ({ items: s.items.filter((p) => getId(p) !== productId) }));
      },

      hasItem: (productId) => get().items.some((p) => getId(p) === productId),

      recordViewed: (productId) => {
        if (!productId) return;
        set((s) => {
          const next = [productId, ...s.recentlyViewedIds.filter((id) => id !== productId)];
          return { recentlyViewedIds: next.slice(0, 12) };
        });
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: "bazzarbd-wishlist",
    }
  )
);
