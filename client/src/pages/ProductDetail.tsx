import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, Check, Star, ChevronLeft, ChevronRight, Share2, X, Copy, CheckCheck } from "lucide-react";

import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import TechSpecsTable from "@/components/TechSpecsTable";
import SizeChartDisplay from "@/components/SizeChartDisplay";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cloudinaryUrl } from "@/lib/cloudinary";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = useProduct(slug || "");
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [added, setAdded] = useState(false);
  const [activeTab, setTab] = useState("Specs");
  const [reviews, setReviews] = useState<any[]>([]);
  const [isReviewFormVisible, setIsReviewFormVisible] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const getShareUrl = () => {
    const origin = window.location.origin;
    if (origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("192.168.")) {
      return `https://thelagari.com${window.location.pathname}`;
    }
    return window.location.href;
  };

  useEffect(() => {
    if (product?.id && activeTab === "Reviews") {
      api.get<any>(`/reviews/product/${product.id}`).then((data) => {
        setReviews(data.reviews || []);
      }).catch(console.error);
    }
  }, [product?.id, activeTab]);

  useEffect(() => {
    setActiveImageIdx(0);
  }, [slug]);

  useEffect(() => {
    if (product && product.product_variants && product.product_variants.length > 0) {
      const firstInStockIdx = product.product_variants.findIndex(v => (v.stock_level || 0) > 0);
      if (firstInStockIdx !== -1) {
        setSelectedVariant(firstInStockIdx);
      } else {
        setSelectedVariant(0);
      }
    }
  }, [product]);

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!product || !product.product_images || product.product_images.length <= 1 || isHovered) {
      return;
    }

    const interval = setInterval(() => {
      setActiveImageIdx((prev) => (prev === product.product_images.length - 1 ? 0 : prev + 1));
    }, 3000);

    return () => clearInterval(interval);
  }, [product, isHovered]);

  const submitReview = async () => {
    if (!newReview.comment.trim()) return toast.error("Please enter a review comment");
    try {
      setIsSubmittingReview(true);
      await api.post("/reviews", {
        product_id: product.id,
        rating: newReview.rating,
        comment: newReview.comment
      });
      toast.success("Review submitted successfully! It will appear once approved.");
      setIsReviewFormVisible(false);
      setNewReview({ rating: 5, comment: "" });
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">PRODUCT NOT FOUND</p>
          <Button asChild variant="outline" className="mt-4 rounded-full border-border/30 hover:border-primary/30">
            <Link to="/products"><ArrowLeft className="w-4 h-4 mr-2" /> BACK TO SHOP</Link>
          </Button>
        </div>
      </div>
    );
  }

  const variants = product.product_variants || [];
  const variant = variants[selectedVariant];
  const totalPrice = Number(product.base_price) + (variant ? Number(variant.price_modifier || 0) : 0);
  const specs = (product.tech_specs || {}) as Record<string, any>;

  const handleAdd = () => {
    if (!variant) return;
    addItem(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        basePrice: Number(product.base_price),
        shortDescription: product.short_description || "",
        longDescription: product.long_description || "",
        techSpecs: specs as any,
        category: (product.categories?.slug || "t-shirts") as any,
        activity: product.activity || [],
        isFeatured: product.is_featured || false,
        images: product.product_images?.map((i) => i.url) || [],
        variants: variants.map((v) => ({
          id: v.id,
          name: v.variant_name,
          priceModifier: Number(v.price_modifier || 0),
          sku: v.sku || "",
          stockLevel: v.stock_level || 0,
        })),
      },
      {
        id: variant.id,
        name: variant.variant_name,
        priceModifier: Number(variant.price_modifier || 0),
        sku: variant.sku || "",
        stockLevel: variant.stock_level || 0,
      }
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <Link to="/products" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-8 font-medium">
          <ArrowLeft className="w-3 h-3" /> BACK TO SHOP
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex flex-col">
            <div
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="aspect-[4/5] sm:aspect-square bg-card rounded-2xl border border-border/20 flex items-center justify-center relative overflow-hidden group shadow-lg shadow-black/5"
            >
              {product.product_images && product.product_images.length > 0 ? (
                <>
                  <img
                    src={cloudinaryUrl(product.product_images[activeImageIdx]?.url || product.product_images[0].url)}
                    alt={product.name}
                    className="w-full h-full object-cover brightness-95 group-hover:brightness-100 transition-all duration-500"
                  />

                  {product.product_images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIdx((prev) => (prev === 0 ? product.product_images.length - 1 : prev - 1));
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2.5 backdrop-blur-sm transition-all duration-300 z-10 opacity-0 group-hover:opacity-100 flex items-center justify-center border border-white/10 shadow-lg"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIdx((prev) => (prev === product.product_images.length - 1 ? 0 : prev + 1));
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2.5 backdrop-blur-sm transition-all duration-300 z-10 opacity-0 group-hover:opacity-100 flex items-center justify-center border border-white/10 shadow-lg"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      {/* Bullet Dots overlay */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-[2px]">
                        {product.product_images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIdx(idx)}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === activeImageIdx ? "bg-white w-3" : "bg-white/40"
                              }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <p className="text-5xl md:text-6xl font-bold text-muted-foreground/10">{specs.fit || "—"}</p>
                  <p className="text-sm tracking-[0.5em] text-muted-foreground/20 mt-2">{specs.material?.split(",")[0] || "APPAREL"}</p>
                </div>
              )}
            </div>

            {/* Thumbnails list */}
            {product.product_images && product.product_images.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto py-2 px-1 scrollbar-none justify-start">
                {product.product_images.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 flex-shrink-0 ${idx === activeImageIdx
                        ? "border-[#ff4d00] scale-105 shadow-md shadow-[#ff4d00]/10"
                        : "border-border/30 hover:border-[#ff4d00]/40 hover:scale-102"
                      }`}
                  >
                    <img src={cloudinaryUrl(img.url)} alt={`${product.name} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="space-y-6">
            <div>
              <p className="text-[11px] tracking-[0.4em] text-[#ff4d00] mb-3 font-black uppercase">
                {product.categories?.name || "PRODUCT"}
              </p>
              <h1 className="text-5xl md:text-7xl font-extrabold mb-4 text-foreground tracking-tight leading-[0.9]">
                {product.name}
              </h1>
              <p className="text-[15px] text-muted-foreground/60 font-medium mb-6">{product.short_description}</p>
              <p className="text-foreground/70 leading-relaxed text-sm max-w-xl">{product.long_description}</p>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-black text-[#ff4d00]">৳{totalPrice.toFixed(2)}</span>
                {product.traditional_price && (
                  <span className="text-2xl font-medium text-muted-foreground/30 line-through">
                    ৳{Number(product.traditional_price).toFixed(2)}
                  </span>
                )}
              </div>
              {product.traditional_price && Number(product.traditional_price) > totalPrice && (
                <div className="flex gap-8 mt-1">
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-foreground">
                      You save {Math.round((1 - totalPrice / Number(product.traditional_price)) * 100)}%
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">Compared to retail</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-medium text-muted-foreground/40 line-through">Traditional retail</span>
                    <span className="text-xs text-muted-foreground/30 font-medium italic">Industry average</span>
                  </div>
                </div>
              )}
            </div>

            {variants.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs tracking-wider text-muted-foreground font-medium">SELECT SIZE</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(i)}
                      className={`px-4 py-2.5 rounded-xl border text-sm transition-all font-medium ${i === selectedVariant
                          ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                          : "border-border/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                    >
                      {v.variant_name}
                    </button>
                  ))}
                </div>
                {variant && (
                  <div className="pt-2">
                    <span className={`inline-flex items-center gap-2 text-sm font-bold tracking-wider uppercase ${(variant.stock_level || 0) > 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
                      }`}>
                      {(variant.stock_level || 0) > 0 && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
                      {(variant.stock_level || 0) > 0 ? `${variant.stock_level} in stock` : "OUT OF STOCK"}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Button
              size="lg"
              className={`w-full tracking-wider rounded-full h-14 text-sm font-semibold transition-all shadow-lg ${!variant || (variant.stock_level || 0) === 0
                  ? "bg-muted text-muted-foreground cursor-not-allowed border border-border shadow-none"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
                }`}
              onClick={handleAdd}
              disabled={!variant || (variant.stock_level || 0) === 0}
            >
              {added ? (
                <><Check className="w-4 h-4 mr-2" /> ADDED TO CART</>
              ) : !variant || (variant.stock_level || 0) === 0 ? (
                "OUT OF STOCK"
              ) : (
                <><ShoppingCart className="w-4 h-4 mr-2" /> ADD TO CART — ৳{totalPrice.toFixed(2)}</>
              )}
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full tracking-wider rounded-full h-14 text-sm font-semibold border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all gap-2"
              onClick={() => setShowShareModal(true)}
            >
              <Share2 className="w-4 h-4" /> SHARE THIS PRODUCT
            </Button>

            <div className="flex flex-wrap gap-2">
              {(product.activity || []).map((act) => (
                <span key={act} className="text-[10px] tracking-wider text-muted-foreground bg-card px-3 py-1.5 rounded-full border border-border/20 font-medium">
                  {act.toUpperCase()}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="mt-16 border-t border-border/10 pt-16">
          <div className="flex gap-8 border-b border-border/10 mb-12">
            {["Specs", ...(product.size_chart ? ["Size Chart"] : []), "Reviews", "Q&A"].map((tab) => (
              <button
                key={tab}
                onClick={() => setTab(tab)}
                className={`pb-4 text-sm font-bold tracking-widest transition-all relative ${activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {tab.toUpperCase()}
                {activeTab === tab && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          {activeTab === "Specs" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">Product Technical Specifications</h2>
              <div className="bg-card rounded-2xl border border-border/10 overflow-hidden shadow-xl shadow-black/5">
                <TechSpecsTable specs={specs} />
              </div>
            </div>
          )}

          {activeTab === "Size Chart" && product.size_chart && (
            <div className="space-y-6 max-w-3xl">
              <h2 className="text-2xl font-bold text-foreground">{product.size_chart.name} Size Chart</h2>
              <SizeChartDisplay sizeChart={product.size_chart} />
            </div>
          )}

          {activeTab === "Reviews" && (
            <div className="space-y-8 max-w-4xl">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">Customer Reviews</h2>
                <Button className="rounded-full" onClick={() => setIsReviewFormVisible(!isReviewFormVisible)}>
                  {isReviewFormVisible ? "Cancel" : "Write a Review"}
                </Button>
              </div>

              {isReviewFormVisible && (
                <div className="p-6 bg-card border border-border/20 rounded-2xl space-y-4 shadow-lg shadow-black/5 animate-in fade-in slide-in-from-top-2">
                  <h3 className="font-bold text-lg">Write your review</h3>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onClick={() => setNewReview(prev => ({ ...prev, rating: s }))} className="focus:outline-none">
                          <Star className={`w-6 h-6 ${s <= newReview.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Review Comment</label>
                    <textarea
                      value={newReview.comment}
                      onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="What did you think about this product?"
                      className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <Button onClick={submitReview} disabled={isSubmittingReview} className="w-full sm:w-auto">
                    {isSubmittingReview ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              )}

              <div className="grid gap-6">
                {reviews.length === 0 ? (
                  <div className="p-12 text-center border border-border/10 rounded-2xl bg-card/50">
                    <Star className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No reviews yet. Be the first to review this product!</p>
                  </div>
                ) : (
                  reviews.map((review: any) => (
                    <div key={review._id} className="p-8 rounded-2xl bg-card border border-border/10 space-y-4 transition-all hover:border-primary/20">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/20"}`} />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {review.comment}
                      </p>
                      <div className="pt-4 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {review.user_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium">{review.user_name}</span>
                        {review.is_verified_purchase && (
                          <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-bold uppercase tracking-wider ml-2 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <Check className="w-2.5 h-2.5" /> Verified
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "Q&A" && (
            <div className="space-y-8 max-w-4xl">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">Questions & Answers</h2>
                <Button
                  className="rounded-full"
                  onClick={() => {
                    const whatsappNumber = "8801884469251";
                    const productLink = getShareUrl();
                    const variantName = variant?.variant_name ? ` (Size: ${variant.variant_name})` : "";
                    const message = `Hi ঠেলাগাড়ী! I have a question about the product "${product?.name}"${variantName}.\n\nProduct Link: ${productLink}`;
                    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  Ask a Question
                </Button>
              </div>
              <div className="grid gap-6">
                <div className="p-8 rounded-2xl bg-card border border-border/10 space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-bold tracking-widest text-primary uppercase">Question</p>
                    <p className="font-medium">Is this true to size or should I size up?</p>
                  </div>
                  <div className="pl-6 border-l-2 border-border/30 space-y-2">
                    <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Thelagari Answer</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Our items are designed with a slightly oversized, relaxed fit. If you prefer a more tailored look, we recommend sizing down.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

      </div>

      {/* Share Modal */}
      {showShareModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="relative w-full max-w-[520px] bg-white dark:bg-card rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute right-3 top-3 z-10 bg-primary text-primary-foreground w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8 space-y-6">
              <h3 className="text-xl font-bold text-foreground">Share this link via</h3>

              {/* Social Icons */}
              <div className="flex gap-5 items-center">
                {/* Facebook */}
                <a
                  href={`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:scale-110 transition-all duration-200"
                  title="Share on Facebook"
                >
                  <svg viewBox="0 0 512 512" fill="currentColor" className="w-10 h-10 md:w-12 md:h-12">
                    <path d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z" />
                  </svg>
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(product?.name + '\n' + getShareUrl())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-500 hover:text-green-700 hover:scale-110 transition-all duration-200"
                  title="Share on WhatsApp"
                >
                  <svg viewBox="0 0 448 512" fill="currentColor" className="w-10 h-10 md:w-12 md:h-12">
                    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href={`https://instagram.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-600 hover:text-pink-800 hover:scale-110 transition-all duration-200"
                  title="Visit our Instagram"
                >
                  <svg viewBox="0 0 448 512" fill="currentColor" className="w-10 h-10 md:w-12 md:h-12">
                    <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
                  </svg>
                </a>
              </div>

              {/* Copy Link */}
              <div className="flex items-center border border-gray-200 dark:border-border rounded-xl overflow-hidden">
                <input
                  className="flex-1 bg-transparent text-sm text-foreground p-4 focus:outline-none truncate"
                  readOnly
                  type="text"
                  value={getShareUrl()}
                />
                <button
                  className={`mx-2 px-5 py-2.5 rounded-lg font-semibold text-sm uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${linkCopied
                      ? "bg-green-500/20 text-green-600 border border-green-500/30"
                      : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                    }`}
                  onClick={() => {
                    navigator.clipboard.writeText(getShareUrl());
                    setLinkCopied(true);
                    toast.success("Link copied to clipboard!");
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                >
                  {linkCopied ? <><CheckCheck className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProductDetail;
