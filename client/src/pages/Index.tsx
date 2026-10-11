import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { ArrowRight, Truck, RotateCcw, Shield, Instagram, Facebook, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { HeroCarousel } from "@/components/HeroCarousel";
import { RecommendationsCarousel } from "@/components/RecommendationsCarousel";
import { useTheme } from "@/contexts/ThemeContext";
import { cloudinaryUrl } from "@/lib/cloudinary";

const Index = () => {
  const { theme } = useTheme();
  const { data: paginatedResponse, isLoading } = useProducts();
  const { data: dbCategories } = useCategories();
  const [banners, setBanners] = useState<any[]>([]);
  const [returnDays, setReturnDays] = useState<number>(7);

  const allProducts = paginatedResponse?.products || [];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const b = await api.get("/settings/banners");
        if (b) setBanners(b);

        const days = await api.get("/settings/return_days");
        if (days) setReturnDays(Number(days));
      } catch (err) {
        console.error("Failed to fetch settings");
      }
    };
    fetchSettings();
  }, []);

  const featuredProducts = allProducts.filter((p) => p.is_featured).slice(0, 12);

  // Generate recommended items for the carousel
  const recommendedProductsFromFlag = allProducts.filter((p) => p.is_recommended);
  const baseRecommendedProducts = recommendedProductsFromFlag.length > 0
    ? recommendedProductsFromFlag
    : allProducts.slice(0, 8);

  const recommendedItems = baseRecommendedProducts.map((p, i) => {
    const totalStock = p.product_variants?.reduce((acc, v) => acc + (v.stock_level || 0), 0) ?? 0;
    return {
      id: p.id,
      slug: p.slug,
      title: p.name,
      image: cloudinaryUrl(p.product_images?.[0]?.url || ""),
      price: p.base_price,
      highlightType: (["badge", "border", "glow", "background"] as any)[i % 4],
      highlightLabel: i % 4 === 0 ? "Bestseller" : undefined,
      isOutOfStock: totalStock === 0,
      product: p,
    };
  });



  const categories = dbCategories && dbCategories.length > 0
    ? dbCategories
      .filter((c) => !c.parent_id)
      .map((c) => ({
        name: c.name,
        slug: c.slug,
        image: cloudinaryUrl(c.image_url) || "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=800&auto=format&fit=crop"
      }))
    : [
      { name: "T-Shirts", slug: "t-shirts", image: "/images/cat-tshirts.webp" },
      { name: "Hoodies", slug: "hoodies", image: "/images/cat-hoodies.webp" },
      { name: "Pants", slug: "pants", image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop" },
      { name: "Jackets", slug: "jackets", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop" },
      { name: "New Arrivals", slug: "new-arrivals", image: "/images/hero.webp" },
    ];

  return (
    <div className="bg-background pt-16 overflow-x-hidden">
      {/* Hero Section Carousel */}
      <HeroCarousel banners={banners} />

      {/* Categories Showcase */}
      <section className="py-20 lg:py-28 overflow-hidden">
        <div className="container mx-auto px-4 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-[11px] font-semibold tracking-[0.3em] text-primary uppercase mb-3">Browse</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Shop by Category</h2>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-8 pb-8">
            {categories.map((cat, idx) => (
              <Link to={`/products?category=${cat.slug}`} key={cat.name}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.08 }}
                  viewport={{ once: true }}
                  className="flex-shrink-0 flex flex-col items-center group cursor-pointer w-[90px] xs:w-[110px] sm:w-[140px]"
                >
                  <div className="w-[90px] h-[90px] xs:w-[110px] xs:h-[110px] sm:w-[140px] sm:h-[140px] rounded-full overflow-hidden border-2 border-border/30 transition-all duration-500 group-hover:scale-105 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/10 mb-4 relative">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover brightness-75 group-hover:brightness-90 group-hover:scale-110 transition-all duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                  <span className="text-[10px] sm:text-[12px] font-semibold tracking-widest uppercase text-center text-foreground/60 group-hover:text-primary transition-colors relative">
                    {cat.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
                  </span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recommendations Banner Carousel */}
      <RecommendationsCarousel items={recommendedItems} />



      {/* Best Sellers */}
      <section className="py-20 relative">

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-end justify-between mb-16 px-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-[11px] font-semibold tracking-[0.3em] text-primary uppercase mb-3">Our Favorites</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Best Sellers</h2>
            </motion.div>
            <Link to="/products" className="text-[12px] font-semibold tracking-widest uppercase text-foreground/40 hover:text-primary transition-colors pb-1 flex items-center gap-2 group">
              Shop All
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6">
            {isLoading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-4 animate-pulse">
                  <div className="bg-card aspect-[3/4] rounded-xl" />
                  <div className="h-4 w-3/4 bg-card rounded" />
                  <div className="h-4 w-1/4 bg-card rounded" />
                </div>
              ))
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map((p, idx) => (
                <div key={p.id} className="group">
                  <ProductCard product={p} index={idx} />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 text-muted-foreground font-mono">
                NO BEST SELLERS AVAILABLE
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Large Creative CTA */}
      <section className="py-24 lg:py-40 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center rounded-2xl overflow-hidden relative group"
          style={{ background: 'linear-gradient(135deg, hsl(20 6% 12%), hsl(22 8% 15%), hsl(20 6% 12%))' }}
        >
          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />

          <div className="relative z-10 p-6 sm:p-12 lg:p-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFA273]/10 border border-[#FFA273]/20 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFA273] animate-pulse" />
              <span className="text-[11px] font-semibold tracking-[0.15em] text-[#FFA273] uppercase">Sustainability first</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold leading-[1.1] mb-6 text-white">
              Better for the planet,{" "}
              <span className="text-gradient">better for you.</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-10 max-w-md leading-relaxed">
              We believe that premium quality shouldn't come at a premium price. That's why we work directly with the world's best factories.
            </p>
            <Button asChild size="lg" className="w-full sm:w-auto inline-flex justify-center rounded-full px-8 sm:px-12 h-14 sm:h-16 text-[15px] font-semibold tracking-wide bg-[#FFA273] text-[#1a1816] hover:bg-[#FFB48F] shadow-lg shadow-[#FFA273]/20 transition-all hover:shadow-xl hover:shadow-[#FFA273]/30">
              <Link to="/products" className="flex items-center gap-2.5">
                Explore Our Mission <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
          <div className="relative h-[300px] sm:h-[500px] lg:h-auto overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1000&auto=format&fit=crop"
              className="w-full h-full object-cover brightness-50 group-hover:brightness-[0.6] scale-105 group-hover:scale-100 transition-all duration-1000"
              alt="Sustainable materials"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#201e1c]/80" />
          </div>
        </motion.div>
      </section>

      {/* Benefits Bar */}
      <section className="py-12 border-t border-border/30">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Truck, title: "Direct to You", desc: "No middleman, radically low prices." },
            { icon: Shield, title: "Premium Materials", desc: "Italian leather, cashmere, silk & more." },
            { icon: CheckCircle, title: "Order With Confidence", desc: "Review product details before placing your order." }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="text-center group flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-[13px] font-semibold tracking-widest uppercase mb-1.5 text-foreground">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>




    </div>
  );
};

export default Index;
