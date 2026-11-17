import { Heart, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatBDT, getId, getImageUrl, getProductTotalStock, handleImageError } from "@/lib/format";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const productId = getId(product);
  const totalStock = getProductTotalStock(product);
  const inStock = totalStock > 0;
  const primaryImage = getImageUrl(product.product_images?.[0]?.url);
  const hoverImage = product.product_images?.[1]?.url
    ? getImageUrl(product.product_images[1].url)
    : null;

  const hasDiscount =
    typeof product.traditional_price === "number" &&
    product.traditional_price > product.base_price;

  const discountPct = hasDiscount
    ? Math.round(((product.traditional_price! - product.base_price) / product.traditional_price!) * 100)
    : 0;

  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isWishlisted = useWishlistStore((s) => s.items.some((i) => getId(i) === productId));

  const categoryName =
    product.categories?.name ||
    (typeof product.category_id === "object" && product.category_id ? product.category_id.name : "");

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    const firstAvailable =
      product.product_variants?.find((v) => v.stock_level > 0) || product.product_variants?.[0];
    addItem(product, firstAvailable, 1);
    toast.success(`${product.name} added to bag`);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleWishlist(product);
    toast.success(added ? "Saved to wishlist" : "Removed from wishlist");
  };

  return (
    <article className={cn("group flex flex-col", className)}>
      <Link
        to={`/product/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden rounded-xl border border-border bg-secondary/50"
      >
        <img
          src={primaryImage}
          alt={product.product_images?.[0]?.alt_text || product.name}
          loading="lazy"
          onError={handleImageError}
          className={cn(
            "h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]",
            hoverImage && "group-hover:opacity-0"
          )}
        />
        {hoverImage && (
          <img
            src={hoverImage}
            alt={product.name}
            loading="lazy"
            onError={handleImageError}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 ease-out group-hover:scale-[1.03] group-hover:opacity-100"
          />
        )}

        {/* Discrete editorial badge — only rendered for sold out or actual savings */}
        {!inStock ? (
          <Badge variant="secondary" className="absolute left-3 top-3 bg-card/95 backdrop-blur-sm">
            Sold out
          </Badge>
        ) : hasDiscount && discountPct > 0 ? (
          <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
            Save {discountPct}%
          </Badge>
        ) : null}

        {/* Wishlist button */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          className={cn(
            "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 text-foreground backdrop-blur-sm transition-all hover:bg-card",
            isWishlisted ? "text-destructive" : "opacity-85 group-hover:opacity-100"
          )}
        >
          <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
        </button>

        {/* Quick add bar */}
        {inStock && (
          <button
            type="button"
            onClick={handleQuickAdd}
            className="absolute inset-x-3 bottom-3 flex h-9 translate-y-2 items-center justify-center gap-1.5 rounded-lg bg-foreground/95 px-3 text-xs font-medium text-background opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-primary group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Quick add
          </button>
        )}
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {categoryName && (
            <p className="truncate text-xs text-muted-foreground">{categoryName}</p>
          )}
          <Link
            to={`/product/${product.slug}`}
            className="mt-0.5 block truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            {product.name}
          </Link>
        </div>

        <div className="shrink-0 text-right">
          <p className="tabular-price text-sm font-medium text-foreground">
            {formatBDT(product.base_price)}
          </p>
          {hasDiscount && (
            <p className="tabular-price text-xs text-muted-foreground line-through">
              {formatBDT(product.traditional_price)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
