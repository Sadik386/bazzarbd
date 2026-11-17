import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { getId } from "@/lib/format";
import { useWishlistStore } from "@/stores/wishlistStore";

export function WishlistPage() {
  const items = useWishlistStore((s) => s.items);
  const clear = useWishlistStore((s) => s.clear);

  return (
    <div className="mx-auto max-w-[1360px] space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-display text-4xl text-foreground sm:text-5xl">Saved Wishlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} saved piece(s) ready to add to your bag.
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" size="sm" onClick={clear}>
            Clear wishlist
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center space-y-4">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="font-display text-2xl text-foreground">No saved garments yet</h2>
          <p className="text-sm text-muted-foreground">
            Tap the heart icon on any piece to bookmark it for later.
          </p>
          <Button asChild>
            <Link to="/products">Explore collection</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-6">
          {items.map((product) => (
            <ProductCard key={getId(product)} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
