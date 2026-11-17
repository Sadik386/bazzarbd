import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, getAccessToken } from "@/lib/api";
import { getId, getImageUrl, getVariantPrice } from "@/lib/format";
import type { CartItem, Product, ProductVariant } from "@/types";

interface ServerCartItem {
  product_id: string;
  variant_id: string;
  quantity: number;
  product_name?: string;
  variant_name?: string;
  base_price?: number;
  price_modifier?: number;
  product_image?: string;
  slug?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  addItem: (product: Product, variant?: ProductVariant | null, quantity?: number) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
  syncFromServer: () => Promise<void>;
  pushToServer: () => Promise<void>;
  subtotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      setOpen: (open) => set({ isOpen: open }),

      addItem: (product, variant, quantity = 1) => {
        const productId = getId(product);
        const chosenVariant = variant || product.product_variants?.[0];
        const variantId = getId(chosenVariant) || chosenVariant?.variant_name || "default";
        const variantName = chosenVariant?.variant_name || "Standard";
        const maxStock = chosenVariant?.stock_level ?? 99;
        const unitPrice = getVariantPrice(product, chosenVariant);
        const imageUrl = getImageUrl(product.product_images?.[0]?.url);

        set((state) => {
          const existingIdx = state.items.findIndex(
            (i) => i.productId === productId && i.variantId === variantId
          );

          if (existingIdx > -1) {
            const next = [...state.items];
            const current = next[existingIdx];
            next[existingIdx] = {
              ...current,
              quantity: Math.min(maxStock > 0 ? maxStock : 99, current.quantity + quantity),
              maxStock,
            };
            return { items: next, isOpen: true };
          }

          const newItem: CartItem = {
            productId,
            variantId,
            slug: product.slug,
            name: product.name,
            variantName,
            basePrice: product.base_price,
            priceModifier: chosenVariant?.price_modifier || 0,
            unitPrice,
            quantity: Math.max(1, Math.min(maxStock > 0 ? maxStock : 99, quantity)),
            imageUrl,
            maxStock,
          };
          return { items: [...state.items, newItem], isOpen: true };
        });

        get().pushToServer().catch(() => {});
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        }));
        get().pushToServer().catch(() => {});
      },

      updateQuantity: (productId, variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => {
            if (i.productId === productId && i.variantId === variantId) {
              const cap = i.maxStock && i.maxStock > 0 ? i.maxStock : 99;
              return { ...i, quantity: Math.min(cap, quantity) };
            }
            return i;
          }),
        }));
        get().pushToServer().catch(() => {});
      },

      clearCart: () => {
        set({ items: [] });
        if (getAccessToken()) {
          api.delete("/cart").catch(() => {});
        }
      },

      syncFromServer: async () => {
        if (!getAccessToken()) return;
        try {
          const res = await api.get<{ items: ServerCartItem[] }>("/cart");
          const remoteItems = (res.items || []).map<CartItem>((r) => {
            const base = Number(r.base_price) || 0;
            const mod = Number(r.price_modifier) || 0;
            return {
              productId: String(r.product_id),
              variantId: String(r.variant_id),
              slug: r.slug || "",
              name: r.product_name || "Product",
              variantName: r.variant_name || "Standard",
              basePrice: base,
              priceModifier: mod,
              unitPrice: Math.max(0, base + mod),
              quantity: Math.max(1, r.quantity || 1),
              imageUrl: getImageUrl(r.product_image),
            };
          });

          const local = get().items;
          if (local.length === 0 && remoteItems.length > 0) {
            set({ items: remoteItems });
          } else if (local.length > 0) {
            // Merge local items onto remote items, preferring local quantities
            const merged = [...remoteItems];
            for (const loc of local) {
              const idx = merged.findIndex(
                (m) => m.productId === loc.productId && m.variantId === loc.variantId
              );
              if (idx > -1) {
                merged[idx] = loc;
              } else {
                merged.push(loc);
              }
            }
            set({ items: merged });
            await get().pushToServer();
          }
        } catch {
          // Unauthenticated or offline — keep local persisted bag
        }
      },

      pushToServer: async () => {
        if (!getAccessToken()) return;
        const items = get().items;
        try {
          await api.put("/cart", {
            items: items.map((i) => ({
              product_id: i.productId,
              variant_id: i.variantId,
              quantity: i.quantity,
              product_name: i.name,
              variant_name: i.variantName,
              base_price: i.basePrice,
              price_modifier: i.priceModifier,
              product_image: i.imageUrl || "",
              slug: i.slug,
            })),
          });
        } catch {
          // Guest users only persist locally
        }
      },

      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),

      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "bazzarbd-bag",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
