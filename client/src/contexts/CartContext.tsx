import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Product, ProductVariant } from "@/data/products";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

// Lightweight shape stored on the server
interface ServerCartItem {
  product_id: string;
  variant_id: string;
  quantity: number;
  product_name: string;
  variant_name: string;
  base_price: number;
  price_modifier: number;
  product_image: string;
  slug: string;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, variant: ProductVariant, qty?: number, openCartAfterAdd?: boolean) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

/** Build a user-scoped localStorage key */
const getStorageKey = (): string => {
  try {
    const token = localStorage.getItem("auth_token");
    if (token) {
      // Decode JWT payload to get user id (base64url → base64 → json)
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.id) return `cart_items_${payload.id}`;
    }
  } catch { /* ignore */ }
  return "cart_items_guest";
};

/** Helper to normalize variants (handles both camelCase client-side format and snake_case backend DB format) */
const normalizeCartItemVariant = (v: any): ProductVariant => {
  if (!v) return v;
  const priceModifier = typeof v.priceModifier === "number" ? v.priceModifier : (typeof v.price_modifier === "number" ? v.price_modifier : 0);
  const stockLevel = typeof v.stockLevel === "number" ? v.stockLevel : (typeof v.stock_level === "number" ? v.stock_level : 999);
  
  return {
    ...v,
    id: v.id || v._id || "",
    name: v.name || v.variant_name || "",
    priceModifier,
    sku: v.sku || "",
    stockLevel
  };
};

/** Helper to normalize products (handles both camelCase client-side format and snake_case backend DB format) */
const normalizeCartItemProduct = (p: any): Product => {
  if (!p) return p;
  const basePrice = typeof p.basePrice === "number" ? p.basePrice : (typeof p.base_price === "number" ? p.base_price : 0);
  const images = Array.isArray(p.images) ? p.images : (Array.isArray(p.product_images) ? p.product_images.map((img: any) => img.url) : []);
  
  return {
    ...p,
    id: p.id || p._id || "",
    name: p.name || "",
    slug: p.slug || "",
    basePrice,
    images,
    shortDescription: p.shortDescription || p.short_description || "",
    longDescription: p.longDescription || p.long_description || "",
    techSpecs: p.techSpecs || p.tech_specs || { material: "", weight: "", fit: "", care: "" },
    category: p.category || (p.categories?.slug) || "t-shirts",
    activity: p.activity || [],
    isFeatured: p.isFeatured !== undefined ? p.isFeatured : (p.is_featured !== undefined ? p.is_featured : false),
    variants: Array.isArray(p.variants) 
      ? p.variants.map(normalizeCartItemVariant) 
      : (Array.isArray(p.product_variants) ? p.product_variants.map(normalizeCartItemVariant) : [])
  };
};

/** Convert a client CartItem → server shape */
const toServerItem = (item: CartItem): ServerCartItem => ({
  product_id: item.product.id,
  variant_id: item.variant.id,
  quantity: item.quantity,
  product_name: item.product.name,
  variant_name: item.variant.name,
  base_price: item.product.basePrice,
  price_modifier: item.variant.priceModifier,
  product_image: item.product.images?.[0] || "",
  slug: item.product.slug,
});

/** Convert a server shape → client CartItem */
const fromServerItem = (s: ServerCartItem): CartItem => ({
  product: {
    id: s.product_id,
    name: s.product_name,
    slug: s.slug,
    basePrice: s.base_price,
    shortDescription: "",
    longDescription: "",
    techSpecs: { material: "", weight: "", fit: "", care: "" },
    category: "t-shirts" as any,
    activity: [],
    isFeatured: false,
    images: s.product_image ? [s.product_image] : [],
    variants: [{
      id: s.variant_id,
      name: s.variant_name,
      priceModifier: s.price_modifier,
      sku: "",
      stockLevel: 999,
    }],
  },
  variant: {
    id: s.variant_id,
    name: s.variant_name,
    priceModifier: s.price_modifier,
    sku: "",
    stockLevel: 999,
  },
  quantity: s.quantity,
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const key = getStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item: any) => ({
              product: normalizeCartItemProduct(item.product),
              variant: normalizeCartItemVariant(item.variant),
              quantity: item.quantity,
            }))
            .filter((item) => item.quantity > 0);
        }
      }
    } catch { /* ignore */ }
    return [];
  });
  const [isOpen, setIsOpen] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoad = useRef(true);

  // ---------- Persist to localStorage (always) ----------
  useEffect(() => {
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(items));
  }, [items]);

  // ---------- Debounced sync to server ----------
  const syncToServer = useCallback((cartItems: CartItem[]) => {
    const token = localStorage.getItem("auth_token");
    if (!token) return; // Guest – don't sync

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        await api.put("/cart", { items: cartItems.map(toServerItem) });
      } catch {
        // Silently fail – localStorage is the backup
      }
    }, 1000); // Debounce 1s
  }, []);

  // ---------- Load from server on mount (if logged in) ----------
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) { initialLoad.current = false; return; }

    api.get<{ items: ServerCartItem[] }>("/cart")
      .then((res) => {
        if (res.items && res.items.length > 0) {
          const serverItems = res.items.map(fromServerItem).filter((item) => item.quantity > 0);

          // Merge: server cart takes priority, local-only items are added
          setItems((localItems) => {
            const merged = [...serverItems];
            localItems.forEach((local) => {
              const exists = merged.find(
                (m) => m.product.id === local.product.id && m.variant.id === local.variant.id
              );
              if (!exists) merged.push(local);
            });
            return merged;
          });
        }
      })
      .catch(() => { /* offline / not logged in */ })
      .finally(() => { initialLoad.current = false; });
  }, []);

  // ---------- Sync to server whenever items change (after initial load) ----------
  useEffect(() => {
    if (initialLoad.current) return;
    syncToServer(items);
  }, [items, syncToServer]);

  // ---------- Listen for auth changes (login/logout) ----------
  useEffect(() => {
    const handleAuthChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === "login") {
        // User just logged in – fetch their server cart and merge
        api.get<{ items: ServerCartItem[] }>("/cart")
          .then((res) => {
            if (res.items && res.items.length > 0) {
              const serverItems = res.items.map(fromServerItem).filter((item) => item.quantity > 0);
              setItems((localItems) => {
                const merged = [...serverItems];
                localItems.forEach((local) => {
                  const exists = merged.find(
                    (m) => m.product.id === local.product.id && m.variant.id === local.variant.id
                  );
                  if (!exists) merged.push(local);
                });
                return merged;
              });
            }
            // Migrate localStorage key
            const oldKey = "cart_items_guest";
            localStorage.removeItem(oldKey);
          })
          .catch(() => {});
      } else if (detail?.type === "logout") {
        // User logged out – save current items under guest key, then clear
        const guestKey = "cart_items_guest";
        localStorage.setItem(guestKey, JSON.stringify([]));
        setItems([]);
      }
    };
    window.addEventListener("auth-change", handleAuthChange);
    return () => window.removeEventListener("auth-change", handleAuthChange);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((product: Product, variant: ProductVariant, qty = 1, openCartAfterAdd = true) => {
    const normalizedProduct = normalizeCartItemProduct(product);
    const normalizedVariant = normalizeCartItemVariant(variant);
    
    // Strict stock level check (defaulting to 999 if not defined)
    const stockLevel = typeof normalizedVariant.stockLevel === "number" ? normalizedVariant.stockLevel : 999;
    if (stockLevel <= 0) {
      toast.error(`${normalizedProduct.name} (${normalizedVariant.name}) is currently out of stock`);
      return;
    }

    let isStockExceeded = false;
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === normalizedProduct.id && i.variant.id === normalizedVariant.id);
      if (existing) {
        if (existing.quantity >= stockLevel) {
          isStockExceeded = true;
          return prev;
        }
        return prev.map((i) =>
          i.product.id === normalizedProduct.id && i.variant.id === normalizedVariant.id
            ? { ...i, quantity: Math.min(i.quantity + qty, stockLevel) }
            : i
        );
      }
      return [...prev, { product: normalizedProduct, variant: normalizedVariant, quantity: Math.min(qty, stockLevel) }];
    });

    if (isStockExceeded) {
      toast.error(`Cannot add more. Only ${stockLevel} items are in stock.`);
      return;
    }

    if (openCartAfterAdd) {
      setIsOpen(true);
    }
  }, []);

  const removeItem = useCallback((productId: string, variantId: string) => {
    setItems((prev) => prev.filter((i) => !(i.product.id === productId && i.variant.id === variantId)));
  }, []);

  const updateQuantity = useCallback((productId: string, variantId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => !(i.product.id === productId && i.variant.id === variantId)));
      return;
    }
    
    let isExceeded = false;
    setItems((prev) => {
      const item = prev.find((i) => i.product.id === productId && i.variant.id === variantId);
      let stock = 999;
      if (item) {
        stock = typeof item.variant.stockLevel === "number" ? item.variant.stockLevel : 999;
        if (qty > stock) {
          isExceeded = true;
          qty = stock;
        }
      }
      return prev.map((i) =>
        i.product.id === productId && i.variant.id === variantId ? { ...i, quantity: qty } : i
      );
    });

    if (isExceeded) {
      toast.error("Requested quantity exceeds available stock");
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    const token = localStorage.getItem("auth_token");
    if (token) {
      api.delete("/cart").catch(() => {});
    }
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + (i.product.basePrice + i.variant.priceModifier) * i.quantity,
    0
  );

  return (
    <CartContext.Provider value={{ items, isOpen, openCart, closeCart, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};
