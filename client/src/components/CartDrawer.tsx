import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { formatBDT, handleImageError } from "@/lib/format";
import { useCartStore } from "@/stores/cartStore";

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const setOpen = useCartStore((s) => s.setOpen);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.subtotal());

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="p-0">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <DialogTitle className="font-display text-2xl font-normal">Your Bag</DialogTitle>
            <DialogDescription className="text-xs">
              {items.reduce((acc, i) => acc + i.quantity, 0)} item(s) selected
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close bag"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-secondary/60">
                <ShoppingBag className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-display text-2xl text-foreground">Your bag is empty</p>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                Explore woven cotton shirts, hoodies, and tailored essentials ready for dispatch.
              </p>
              <Button asChild className="mt-6" onClick={() => setOpen(false)}>
                <Link to="/products">Explore collection</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={`${item.productId}-${item.variantId}`} className="flex gap-4 py-4">
                  <Link
                    to={item.slug ? `/product/${item.slug}` : "/products"}
                    onClick={() => setOpen(false)}
                    className="h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary"
                  >
                    <img
                      src={item.imageUrl || "/images/cat-tshirts.webp"}
                      alt={item.name}
                      onError={handleImageError}
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={item.slug ? `/product/${item.slug}` : "/products"}
                          onClick={() => setOpen(false)}
                          className="block truncate text-sm font-medium text-foreground hover:text-primary"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">Size / Variant: {item.variantName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId, item.variantId)}
                        aria-label={`Remove ${item.name}`}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg border border-border bg-background">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="tabular-price w-7 text-center text-xs font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <p className="tabular-price text-sm font-medium text-foreground">
                        {formatBDT(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border bg-secondary/35 px-6 py-5 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-price font-semibold text-foreground">{formatBDT(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Inside Dhaka ৳60 (24–48h) · Outside Dhaka ৳120 (2–4 days) calculated at checkout.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="outline" asChild onClick={() => setOpen(false)}>
                <Link to="/products">Continue shopping</Link>
              </Button>
              <Button asChild onClick={() => setOpen(false)}>
                <Link to="/checkout">Checkout</Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Dialog>
  );
}
