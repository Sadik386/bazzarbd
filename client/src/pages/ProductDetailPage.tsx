import { useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  HelpCircle,
  Ruler,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ProductCard } from "@/components/ProductCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useProduct,
  useProductBundle,
  useProductQuestions,
  useProductReviews,
  useRecommendations,
} from "@/hooks/useCatalog";
import { api } from "@/lib/api";
import { formatBDT, formatDate, getId, getImageUrl, getVariantPrice, handleImageError } from "@/lib/format";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { useConciergeStore } from "@/stores/conciergeStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading, error } = useProduct(slug);
  const productId = getId(product);

  const user = useAuthStore((s) => s.user);
  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const recordViewed = useWishlistStore((s) => s.recordViewed);
  const isWishlisted = useWishlistStore((s) => s.items.some((i) => getId(i) === productId));
  const setPageContext = useConciergeStore((s) => s.setPageContext);

  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [bengaliView, setBengaliView] = useState(false);
  const [sizeUnit, setSizeUnit] = useState<"inch" | "cm">("inch");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [aiStylingNote, setAiStylingNote] = useState<string | null>(null);
  const [loadingAiNote, setLoadingAiNote] = useState(false);

  // Review & Q&A submission state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [activeSlide, setActiveSlide] = useState(0);

  const { data: bundleData } = useProductBundle(productId || undefined);
  const { data: similarProducts = [] } = useRecommendations({
    productId: productId || undefined,
    type: "similar",
    limit: 4,
    enabled: Boolean(productId),
  });
  const { data: reviewsData } = useProductReviews(productId || undefined);
  const { data: questions = [] } = useProductQuestions(productId || undefined);

  useEffect(() => {
    setSelectedVariantIdx(0);
    setQuantity(1);
    setAiStylingNote(null);
  }, [slug]);

  useEffect(() => {
    if (productId) {
      recordViewed(productId);
    }
  }, [productId, recordViewed]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveSlide(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const variants = useMemo(() => product?.product_variants || [], [product]);
  const selectedVariant = variants[selectedVariantIdx] || variants[0] || null;
  const activePrice = product ? getVariantPrice(product, selectedVariant) : 0;
  const activeStock = selectedVariant?.stock_level ?? 0;
  const inStock = activeStock > 0;

  // Sync live product state for Pipecat live voice awareness
  useEffect(() => {
    if (!product) return;
    setPageContext({
      product: {
        id: productId,
        slug: product.slug,
        title: product.name,
        basePrice: product.base_price,
        selectedPrice: activePrice,
        selectedVariant: selectedVariant?.variant_name || "Standard",
        stockCount: activeStock,
        inStock,
        description: product.short_description,
        variants: variants.map((v) => ({
          name: v.variant_name,
          stock: v.stock_level,
          price: getVariantPrice(product, v),
        })),
      },
    });
    return () => setPageContext({ product: null });
  }, [product, productId, activePrice, selectedVariant, activeStock, inStock, variants, setPageContext]);

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-[1360px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:px-8">
        <Skeleton className="aspect-[4/5] rounded-2xl lg:col-span-6" />
        <div className="space-y-4 lg:col-span-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-4xl text-foreground">Piece not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This garment may have moved or sold out of the archive.
        </p>
        <Button asChild className="mt-6">
          <Link to="/products">Return to collection</Link>
        </Button>
      </div>
    );
  }

  const images =
    product.product_images?.length > 0
      ? product.product_images
      : [{ url: "/images/cat-tshirts.webp", alt_text: product.name }];

  const hasBengali = Boolean(product.name_bn || product.short_description_bn || product.long_description_bn);
  const displayName = bengaliView && product.name_bn ? product.name_bn : product.name;
  const displayShort =
    bengaliView && product.short_description_bn
      ? product.short_description_bn
      : product.short_description;
  const displayLong =
    bengaliView && product.long_description_bn ? product.long_description_bn : product.long_description;

  const handleAddToBag = () => {
    if (!inStock) return;
    addItem(product, selectedVariant, quantity);
    toast.success(`${product.name} (${selectedVariant?.variant_name || "Standard"}) added to bag`);
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    addItem(product, selectedVariant, quantity);
    useCartStore.getState().setOpen(false);
    navigate("/checkout");
  };

  const handleAddBundle = () => {
    if (!bundleData) return;
    addItem(product, selectedVariant, 1);
    for (const addon of bundleData.addOns) {
      const firstAvail = addon.product_variants?.find((v) => v.stock_level > 0) || addon.product_variants?.[0];
      if (firstAvail) addItem(addon, firstAvail, 1);
    }
    toast.success("Complete look added to your bag");
  };

  const fetchAiStylingNote = async () => {
    if (!bundleData?.addOns?.length && similarProducts.length === 0) return;
    setLoadingAiNote(true);
    try {
      const items = bundleData?.addOns?.length ? bundleData.addOns : similarProducts;
      const res = await api.post<{ insights: Record<string, string> | string }>(
        "/recommendations/ai-insights",
        {
          baseProductName: product.name,
          products: items.slice(0, 3).map((p) => ({
            id: getId(p),
            name: p.name,
            base_price: p.base_price,
            category: p.categories?.name,
          })),
        }
      );
      if (typeof res.insights === "string") {
        setAiStylingNote(res.insights);
      } else if (res.insights && typeof res.insights === "object") {
        setAiStylingNote(Object.values(res.insights).join(" · "));
      }
    } catch {
      toast.error("Could not generate styling notes right now");
    } finally {
      setLoadingAiNote(false);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    setSubmittingReview(true);
    try {
      await api.post("/reviews", {
        product_id: productId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      toast.success("Review submitted for moderation");
      setReviewComment("");
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in required to submit a review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    setSubmittingQuestion(true);
    try {
      await api.post("/questions", {
        product_id: productId,
        question: questionText.trim(),
      });
      toast.success("Question submitted — our studio team will answer shortly");
      setQuestionText("");
      queryClient.invalidateQueries({ queryKey: ["questions", productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in required to ask a question");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const reviews = reviewsData?.reviews || [];
  const techSpecEntries = Object.entries(product.tech_specs || {});

  return (
    <div className="mx-auto max-w-[1360px] space-y-20 px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-foreground">Collection</Link>
        {product.categories && (
          <>
            <span>/</span>
            <Link
              to={`/products?category=${encodeURIComponent(product.categories.slug)}`}
              className="hover:text-foreground"
            >
              {product.categories.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      {/* ── Main Product Showcase ───────────────────────────────────────────── */}
      <section className="grid gap-10 lg:grid-cols-12 lg:items-start">
        {/* Left: Embla Gallery */}
        <div className="space-y-4 lg:col-span-6">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary">
            <div ref={emblaRef} className="overflow-hidden">
              <div className="flex">
                {images.map((img, i) => (
                  <div key={i} className="min-w-0 flex-[0_0_100%]">
                    <button
                      type="button"
                      onClick={() => setZoomImage(getImageUrl(img.url))}
                      className="block w-full cursor-zoom-in"
                    >
                      <img
                        src={getImageUrl(img.url)}
                        alt={img.alt_text || `${product.name} view ${i + 1}`}
                        onError={handleImageError}
                        className="aspect-[4/5] w-full object-cover"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollPrev()}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground backdrop-blur-sm hover:bg-card"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollNext()}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground backdrop-blur-sm hover:bg-card"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => emblaApi?.scrollTo(idx)}
                  className={cn(
                    "h-20 w-16 shrink-0 overflow-hidden rounded-lg border transition-all",
                    activeSlide === idx ? "border-primary ring-2 ring-primary/20" : "border-border opacity-70 hover:opacity-100"
                  )}
                >
                  <img
                    src={getImageUrl(img.url)}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Tailoring Details & Purchase Controls */}
        <div className="space-y-6 lg:col-span-6">
          <div className="space-y-3 border-b border-border pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {product.categories && (
                <Link
                  to={`/products?category=${encodeURIComponent(product.categories.slug)}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {product.categories.name}
                </Link>
              )}

              {hasBengali && (
                <button
                  type="button"
                  onClick={() => setBengaliView((prev) => !prev)}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:border-primary"
                >
                  {bengaliView ? "Switch to English" : "বাংলায় দেখুন"}
                </button>
              )}
            </div>

            <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">
              {displayName}
            </h1>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="tabular-price text-2xl font-semibold text-foreground">
                {formatBDT(activePrice)}
              </span>
              {product.traditional_price && product.traditional_price > activePrice && (
                <span className="tabular-price text-sm text-muted-foreground line-through">
                  {formatBDT(product.traditional_price)}
                </span>
              )}
              <Badge variant={inStock ? "success" : "destructive"}>
                {inStock ? `${activeStock} in stock` : "Sold out"}
              </Badge>
            </div>

            {displayShort && (
              <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
                {displayShort}
              </p>
            )}
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Select size / variant
                </Label>
                {product.size_chart && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        <Ruler className="h-3.5 w-3.5" />
                        Size chart ({product.size_chart.name})
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{product.size_chart.name} Size Chart</DialogTitle>
                        <DialogDescription>
                          {product.size_chart.deviation_note || "Garment measurements taken flat."}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant={sizeUnit === "inch" ? "default" : "outline"}
                          onClick={() => setSizeUnit("inch")}
                        >
                          Inches
                        </Button>
                        <Button
                          size="sm"
                          variant={sizeUnit === "cm" ? "default" : "outline"}
                          onClick={() => setSizeUnit("cm")}
                        >
                          cm
                        </Button>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-border bg-secondary/50 text-xs">
                            <tr>
                              {product.size_chart.columns.map((col, idx) => (
                                <th key={idx} className="px-4 py-2.5 font-medium">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {product.size_chart.rows.map((row, idx) => {
                              const vals = sizeUnit === "inch" ? row.values_inch : row.values_cm;
                              return (
                                <tr key={idx}>
                                  <td className="px-4 py-2.5 font-medium">{row.size}</td>
                                  {vals.map((val, cIdx) => (
                                    <td key={cIdx} className="tabular-price px-4 py-2.5 text-muted-foreground">
                                      {val}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {variants.map((v, idx) => {
                  const isSelected = idx === selectedVariantIdx;
                  const out = v.stock_level <= 0;
                  return (
                    <button
                      key={getId(v) || v.variant_name}
                      type="button"
                      disabled={out}
                      onClick={() => {
                        setSelectedVariantIdx(idx);
                        setQuantity(1);
                      }}
                      className={cn(
                        "min-w-[56px] rounded-lg border px-3.5 py-2 text-sm font-medium transition-all",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-foreground/40",
                        out && "cursor-not-allowed opacity-40 line-through"
                      )}
                    >
                      {v.variant_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity + CTAs */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex h-11 items-center rounded-lg border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3.5 text-sm text-muted-foreground hover:text-foreground"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="tabular-price w-8 text-center text-sm font-medium">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, activeStock), q + 1))}
                  className="px-3.5 text-sm text-muted-foreground hover:text-foreground"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <Button
                size="xl"
                onClick={handleAddToBag}
                disabled={!inStock}
                className="flex-1"
              >
                <ShoppingBag className="h-4 w-4" />
                {inStock ? "Add to bag" : "Sold out"}
              </Button>

              <Button
                size="xl"
                variant="outline"
                onClick={() => {
                  const added = toggleWishlist(product);
                  toast.success(added ? "Saved to wishlist" : "Removed from wishlist");
                }}
                aria-label="Toggle wishlist"
              >
                <Heart className={cn("h-4 w-4", isWishlisted && "fill-destructive text-destructive")} />
              </Button>
            </div>

            {inStock && (
              <Button variant="ink" size="lg" onClick={handleBuyNow} className="w-full">
                Proceed straight to checkout
              </Button>
            )}
          </div>

          {/* Accordion: Description, Highlights, Tech Specs */}
          <Accordion type="multiple" defaultValue={["details"]} className="border-t border-border">
            <AccordionItem value="details">
              <AccordionTrigger>Garment details & highlights</AccordionTrigger>
              <AccordionContent className="space-y-3 leading-relaxed">
                {displayLong && <p className="whitespace-pre-line">{displayLong}</p>}
                {product.highlights && product.highlights.length > 0 && (
                  <ul className="space-y-1.5 pt-1">
                    {product.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground/90">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>

            {techSpecEntries.length > 0 && (
              <AccordionItem value="specs">
                <AccordionTrigger>Fabric & technical specifications</AccordionTrigger>
                <AccordionContent>
                  <dl className="divide-y divide-border rounded-lg border border-border bg-card">
                    {techSpecEntries.map(([key, val]) => (
                      <div key={key} className="flex justify-between gap-4 px-4 py-2.5 text-xs">
                        <dt className="font-medium text-foreground">{key}</dt>
                        <dd className="text-right text-muted-foreground">{String(val)}</dd>
                      </div>
                    ))}
                  </dl>
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="delivery">
              <AccordionTrigger>Delivery & returns policy</AccordionTrigger>
              <AccordionContent className="space-y-1.5">
                <p>Inside Dhaka: ৳60 · Delivered in 24–48 hours.</p>
                <p>Outside Dhaka: ৳120 · Delivered in 2–4 business days across 64 districts.</p>
                <p>7-day size exchange on unworn garments with original tags.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* ── Frequently Bought Together Bundle ────────────────────────────────── */}
      {bundleData && bundleData.addOns.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <h2 className="font-display text-3xl text-foreground">Complete the Look</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pair with complementary essentials and save {bundleData.bundlePricing.discountPercent}% on the bundle.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAiStylingNote}
              isLoading={loadingAiNote}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI stylist note
            </Button>
          </div>

          {aiStylingNote && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-foreground">
              {aiStylingNote}
            </div>
          )}

          <div className="mt-6 grid items-center gap-6 lg:grid-cols-12">
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
              {[product, ...bundleData.addOns].map((item) => (
                <Link
                  key={getId(item)}
                  to={`/product/${item.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40"
                >
                  <img
                    src={getImageUrl(item.product_images?.[0]?.url)}
                    alt={item.name}
                    className="h-16 w-14 shrink-0 rounded-md object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="tabular-price mt-0.5 text-xs text-muted-foreground">
                      {formatBDT(item.base_price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-secondary/50 p-5 lg:col-span-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bundle total</span>
                <span className="tabular-price text-muted-foreground line-through">
                  {formatBDT(bundleData.bundlePricing.totalPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Paired price</span>
                <span className="tabular-price text-xl font-semibold text-primary">
                  {formatBDT(bundleData.bundlePricing.finalPrice)}
                </span>
              </div>
              <Button onClick={handleAddBundle} className="w-full">
                Add bundle to bag
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── Reviews & Customer Q&A ──────────────────────────────────────────── */}
      <section className="grid gap-10 border-t border-border pt-12 lg:grid-cols-12">
        {/* Reviews */}
        <div className="space-y-6 lg:col-span-6">
          <div>
            <h2 className="font-display text-3xl text-foreground">Verified Reviews</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Honest fit and fabric notes from BazzarBD customers.
            </p>
          </div>

          {reviews.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No reviews published yet for this piece.
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={getId(rev)} className="rounded-xl border border-border bg-card p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{rev.user_name}</span>
                      {rev.is_verified_purchase && (
                        <Badge variant="success">Verified buyer</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(rev.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary">
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}

          {user ? (
            <form onSubmit={submitReview} className="space-y-3 rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold">Write a review</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    aria-label={`Rate ${star} stars`}
                    className="p-0.5 text-primary"
                  >
                    <Star className={cn("h-4 w-4", star <= reviewRating && "fill-current")} />
                  </button>
                ))}
              </div>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="How does the fabric feel and fit?"
                required
              />
              <Button type="submit" size="sm" isLoading={submittingReview}>
                Submit review
              </Button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">
              <Link to="/auth" className="font-medium text-primary underline">Sign in</Link> to leave a review.
            </p>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6 lg:col-span-6">
          <div>
            <h2 className="font-display text-3xl text-foreground">Garment Q&A</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Questions answered directly by our Dhaka studio team.
            </p>
          </div>

          {questions.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No questions yet. Ask about shrinkage, GSM, or sizing below.
            </p>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => (
                <div key={getId(q)} className="rounded-xl border border-border bg-card p-5 space-y-2">
                  <p className="flex items-start gap-2 text-sm font-medium text-foreground">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{q.question}</span>
                  </p>
                  {q.answer && (
                    <p className="pl-6 text-sm leading-relaxed text-muted-foreground">{q.answer}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {user ? (
            <form onSubmit={submitQuestion} className="space-y-3 rounded-xl border border-border bg-card p-5">
              <Label htmlFor="ask-q">Ask a question</Label>
              <div className="flex gap-2">
                <Input
                  id="ask-q"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Does this shrink after washing?"
                  required
                />
                <Button type="submit" isLoading={submittingQuestion}>
                  Ask
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">
              <Link to="/auth" className="font-medium text-primary underline">Sign in</Link> to ask a question.
            </p>
          )}
        </div>
      </section>

      {/* ── Similar Pieces ──────────────────────────────────────────────────── */}
      {similarProducts.length > 0 && (
        <section className="space-y-6 border-t border-border pt-12">
          <h2 className="font-display text-3xl text-foreground">You May Also Consider</h2>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {similarProducts.map((p) => (
              <ProductCard key={getId(p)} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Image Lightbox Modal */}
      <Dialog open={Boolean(zoomImage)} onOpenChange={(open) => !open && setZoomImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">{product.name} photo zoom</DialogTitle>
          <DialogDescription className="sr-only">Enlarged product garment photograph.</DialogDescription>
          {zoomImage && (
            <img
              src={zoomImage}
              alt={product.name}
              onError={handleImageError}
              className="max-h-[82vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
