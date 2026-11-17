import { create } from "zustand";

export interface LivePageProductContext {
  id: string;
  slug: string;
  title: string;
  basePrice: number;
  selectedPrice: number;
  selectedVariant: string;
  stockCount: number;
  inStock: boolean;
  description?: string;
  variants?: Array<{ name: string; stock: number; price: number }>;
}

export interface VoiceDisplayedProduct {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  base_price: number;
  image?: string;
  product_images?: Array<{ url: string }>;
  short_description?: string;
}

export interface VoiceOrderConfirmed {
  orderId?: string;
  id?: string;
  orderCode?: string;
  totalAmount?: number;
  total_amount?: number;
  customerName?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
}

interface PageContextState {
  pathname: string;
  product: LivePageProductContext | null;
  searchQuery?: string;
}

interface ConciergeState {
  isOpen: boolean;
  searchOpen: boolean;
  pageContext: PageContextState;
  voiceProducts: VoiceDisplayedProduct[];
  voiceOrder: VoiceOrderConfirmed | null;
  setOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setPageContext: (ctx: Partial<PageContextState>) => void;
  setVoiceProducts: (products: VoiceDisplayedProduct[]) => void;
  setVoiceOrder: (order: VoiceOrderConfirmed | null) => void;
}

export const useConciergeStore = create<ConciergeState>((set) => ({
  isOpen: false,
  searchOpen: false,
  pageContext: {
    pathname: "/",
    product: null,
  },
  voiceProducts: [],
  voiceOrder: null,

  setOpen: (open) => set({ isOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setPageContext: (ctx) =>
    set((state) => ({
      pageContext: {
        ...state.pageContext,
        ...ctx,
      },
    })),
  setVoiceProducts: (voiceProducts) => set({ voiceProducts }),
  setVoiceOrder: (voiceOrder) => set({ voiceOrder }),
}));
