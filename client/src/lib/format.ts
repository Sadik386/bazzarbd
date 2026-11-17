import type { Product, ProductVariant, ShippingAddress } from "@/types";

export const BRAND = {
  name: "BazzarBD",
  tagline: "Contemporary apparel & lifestyle atelier from Dhaka.",
  city: "Dhaka, Bangladesh",
  supportEmail: "care@bazzarbd.com",
  supportPhone: "+880 1700-000000",
} as const;

export function getId(obj?: { id?: string; _id?: string } | string | null): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return String(obj.id || obj._id || "");
}

export function formatBDT(amount: number | undefined | null): string {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `৳${Math.round(safe).toLocaleString("en-BD")}`;
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function shortOrderCode(id?: string): string {
  if (!id) return "ORD-000000";
  return `ORD-${id.slice(-6).toUpperCase()}`;
}

export const FALLBACK_IMAGE = "/images/cat-tshirts.webp";

export function getImageUrl(url?: string | null): string {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/images/") || url === "/placeholder.svg") {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_URL || "/api";
  if (apiBase.startsWith("http")) {
    const serverBase = apiBase.replace(/\/api\/?$/, "");
    return `${serverBase}${url.startsWith("/") ? url : `/${url}`}`;
  }
  return url.startsWith("/") ? url : `/${url}`;
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied === "1") return;
  img.dataset.fallbackApplied = "1";
  img.src = FALLBACK_IMAGE;
}

export function getProductTotalStock(product?: Pick<Product, "product_variants" | "total_stock">): number {
  if (!product) return 0;
  if (typeof product.total_stock === "number") return product.total_stock;
  return (product.product_variants || []).reduce((sum, v) => sum + (Number(v.stock_level) || 0), 0);
}

export function getVariantPrice(product: Pick<Product, "base_price">, variant?: ProductVariant | null): number {
  const base = Number(product.base_price) || 0;
  const mod = Number(variant?.price_modifier) || 0;
  return Math.max(0, base + mod);
}

export function formatShippingAddress(addr?: ShippingAddress | string | null): string {
  if (!addr) return "No address provided";
  if (typeof addr === "string") return addr;
  const parts = [
    addr.full_name || [addr.firstName, addr.lastName].filter(Boolean).join(" "),
    addr.address,
    addr.area,
    addr.city,
  ].filter(Boolean);
  return parts.join(", ") || "No address provided";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
