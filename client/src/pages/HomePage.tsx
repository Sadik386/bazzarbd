import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Mic, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useProducts, useRecommendations } from "@/hooks/useCatalog";
import { getId } from "@/lib/format";
import { useCartStore } from "@/stores/cartStore";
import { useConciergeStore } from "@/stores/conciergeStore";
import { useWishlistStore } from "@/stores/wishlistStore";

export function HomePage() {
  const setConciergeOpen = useConciergeStore((s) => s.setOpen);
  const cartItems = useCartStore((s) => s.items);
  const cartIds = useMemo(() => cartItems.map((i) => i.productId), [cartItems]);
  const viewedIds = useWishlistStore((s) => s.recentlyViewedIds);

  const { data: categories = [] } = useCategories();
  const { data: featuredRes, isLoading: loadingFeatured } = useProducts({
    status: "featured",
    limit: 8,
  });
  const { data: allRes, isLoading: loadingAll } = useProducts({ limit: 8 });
  const { data: recommended = [] } = useRecommendations({
    cartIds,
    viewedIds,
    type: "personalized",
    limit: 4,
  });

  const featuredProducts = featuredRes?.products || [];
  const allProducts = allRes?.products || [];
  const showcase = featuredProducts.length > 0 ? featuredProducts.slice(0, 8) : allProducts.slice(0, 8);
  const loadingShowcase = loadingFeatured || (featuredProducts.length === 0 && loadingAll);

  const rootCategories = categories.filter((c) => !c.parent_id).slice(0, 6);

  return (
    <div className="space-y-20 pb-24">
      {/* ── Editorial Atelier Hero Spread ───────────────────────────────────── */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-[1360px] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-7 lg:col-span-6"
          >
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-[4.25rem]">
              Quiet garments, woven for Dhaka daylight.
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Contemporary cotton tees, structured hoodies, and tailored everyday essentials crafted in small batches with honest BDT pricing and same-week nationwide dispatch.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button size="xl" asChild>
                <Link to="/products">Explore collection</Link>
              </Button>
              <Link
                to="/track"
                className="text-sm font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
              >
                Track an order
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6"
          >
            <figure className="space-y-2.5">
              <div className="aspect-[4/4] overflow-hidden rounded-2xl border border-border bg-secondary">
                <img
                  src="/images/hero.webp"
                  alt="BazzarBD sunlit linen dress and olive combed cotton tee"
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Sunlit Studio Edit — Combed Bengal Cotton & Linen</span>
                <span className="tabular-price">Dhaka · 24–48h Dispatch</span>
              </figcaption>
            </figure>
          </motion.div>
        </div>
      </section>

      {/* ── Textile Diptych & Live Category Index ───────────────────────────── */}
      <section className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-8">
            <Link
              to="/products?category=t-shirts"
              className="group relative overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="aspect-[5/4] overflow-hidden bg-secondary">
                <img
                  src="/images/cat-tshirts.webp"
                  alt="Folded stacks of combed cotton t-shirts"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <div>
                  <h2 className="font-display text-2xl text-foreground">Combed Cotton Tees</h2>
                  <p className="text-xs text-muted-foreground">Breathable 180–220 GSM jersey</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </Link>

            <Link
              to="/products?category=hoodies"
              className="group relative overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="aspect-[5/4] overflow-hidden bg-secondary">
                <img
                  src="/images/cat-hoodies.webp"
                  alt="Heavyweight charcoal fleece hoodie detail"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <div>
                  <h2 className="font-display text-2xl text-foreground">Heavyweight Fleece</h2>
                  <p className="text-xs text-muted-foreground">Brushed French terry outerwear</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </Link>
          </div>

          {/* Clean Hairline Category Directory */}
          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-4">
            <div className="flex items-baseline justify-between border-b border-border pb-3">
              <h2 className="font-display text-2xl text-foreground">Directory</h2>
              <Link to="/products" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            </div>

            {rootCategories.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                Browse the complete collection for shirts, hoodies, and lifestyle pieces.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {rootCategories.map((cat) => (
                  <li key={getId(cat)}>
                    <Link
                      to={`/products?category=${encodeURIComponent(cat.slug)}`}
                      className="group flex items-center justify-between py-3 text-sm text-foreground transition-colors hover:text-primary"
                    >
                      <span className="font-medium">{cat.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ── Featured Collection Lookbook ────────────────────────────────────── */}
      <section className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">Featured Pieces</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ready-to-ship staples curated from our current studio batch.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/products">Browse full catalog</Link>
          </Button>
        </div>

        {loadingShowcase ? (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : showcase.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <h3 className="font-display text-2xl text-foreground">Catalog is awaiting new arrivals</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Add products in the Admin Workspace to showcase them on your storefront.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-6">
            {showcase.map((product) => (
              <ProductCard key={getId(product)} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ── Personalized Recommendations ────────────────────────────────────── */}
      {recommended.length > 0 && (
        <section className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="font-display text-3xl text-foreground">Selected For You</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Matched to your browsing history and current bag.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-6">
            {recommended.slice(0, 4).map((product) => (
              <ProductCard key={getId(product)} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── Dhaka Atelier Craft & Delivery Standards ────────────────────────── */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-[1360px] divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <div className="p-6 lg:p-8">
            <h3 className="text-sm font-semibold text-foreground">Combed Cotton Mill Lots</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Pre-shrunk reactive-dyed jersey and linen blends tailored for humid South-Asian summers.
            </p>
          </div>
          <div className="p-6 lg:p-8">
            <h3 className="text-sm font-semibold text-foreground">24–48h Dhaka Courier</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Flat ৳60 inside Dhaka and ৳120 across 64 districts via Pathao & Steadfast dispatch.
            </p>
          </div>
          <div className="p-6 lg:p-8">
            <h3 className="text-sm font-semibold text-foreground">Cash on Delivery</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Inspect your parcel at the doorstep or pay digitally via bKash and Nagad at checkout.
            </p>
          </div>
          <div className="p-6 lg:p-8">
            <h3 className="text-sm font-semibold text-foreground">7-Day Easy Exchanges</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Quick size exchanges on unworn garments with full measurements posted on every product.
            </p>
          </div>
        </div>
      </section>

      {/* ── Atelier Voice & AI Concierge Invitation ─────────────────────────── */}
      <section className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 overflow-hidden rounded-2xl border border-border bg-secondary/70 p-8 sm:p-10 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">
              Not sure on fit, fabric weight, or a gift budget?
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Speak live by voice or chat in English or বাংলা with our Atelier Concierge. Check real-time stock, compare garments under a budget, or place a Cash on Delivery order conversationally.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button onClick={() => setConciergeOpen(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Open Atelier Concierge
              </Button>
              <Button variant="outline" onClick={() => setConciergeOpen(true)} className="gap-2">
                <Mic className="h-4 w-4" />
                Talk via live voice
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card lg:col-span-5">
            <img
              src="/images/hero_male.webp"
              alt="BazzarBD evening charcoal hoodie lookbook"
              className="aspect-[16/10] w-full object-cover object-top"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
