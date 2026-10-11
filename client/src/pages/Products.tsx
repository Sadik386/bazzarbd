import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useProducts, useCategories } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import { SlidersHorizontal, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { cloudinaryUrl } from "@/lib/cloudinary";


// Helper to resolve the root parent group of a category dynamically
const getCategoryGroupId = (c: any, allCats: any[]): string => {
  if (c.parent_id) {
    const parent = allCats.find(p => p.id === c.parent_id || p._id === c.parent_id);
    if (parent) {
      return getCategoryGroupId(parent, allCats);
    }
  }
  return c.slug || "";
};

// Helper to generate a sliding window of page numbers for responsive pagination
const getPageNumbers = (current: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 5) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);

    if (current > 3) {
      pages.push("...");
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    if (current < total - 2) {
      pages.push("...");
    }

    if (!pages.includes(total)) {
      pages.push(total);
    }
  }
  return pages;
};

const Products = () => {
  const navigate = useNavigate();
  const { categoryGroup } = useParams<{ categoryGroup?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const statusParam = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const setPage = (updater: number | ((prev: number) => number)) => {
    const next = typeof updater === "function" ? updater(page) : updater;
    setSearchParams((prev) => { prev.set("page", String(next)); return prev; }, { replace: true });
  };
  const [sortBy, setSortBy] = useState<"newest" | "name" | "price-asc" | "price-desc">("newest");

  // Price filter states with dynamic scaling
  const [priceOpen, setPriceOpen] = useState(true);
  const [sliderMax, setSliderMax] = useState(1000); // Default dynamic slider max
  const [hasSetInitialMax, setHasSetInitialMax] = useState(false);

  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [minInput, setMinInput] = useState("0");
  const [maxInput, setMaxInput] = useState("1000");
  const [appliedMin, setAppliedMin] = useState<number | undefined>(undefined);
  const [appliedMax, setAppliedMax] = useState<number | undefined>(undefined);

  const limit = 12;
  const { data: dbCategories } = useCategories();

  // Find the active category based on the query parameter or URL path
  const activeCategory = useMemo(() => {
    if (!dbCategories || dbCategories.length === 0) return null;
    const slugToFind = categoryParam || categoryGroup;
    if (!slugToFind) return null;
    return dbCategories.find(c => c.slug.toLowerCase() === slugToFind.toLowerCase());
  }, [categoryParam, categoryGroup, dbCategories]);

  // If a main category is selected, we want to fetch products under itself and all of its subcategories
  const resolvedCategoryParam = useMemo(() => {
    if (!activeCategory) return "all";
    if (activeCategory.parent_id) {
      return activeCategory.slug;
    }
    // Main category: find all subcategories
    const subCats = (dbCategories || []).filter(
      c => c.parent_id === activeCategory.id || c.parent_id === activeCategory._id
    );
    const slugs = [activeCategory.slug, ...subCats.map(c => c.slug)];
    return slugs.join(",");
  }, [activeCategory, dbCategories]);

  const { data: paginatedResponse, isLoading } = useProducts(
    resolvedCategoryParam,
    undefined,
    page,
    limit,
    statusParam || undefined,
    appliedMin,
    appliedMax
  );

  const dbProducts = paginatedResponse?.products || [];
  const pagination = paginatedResponse?.pagination;

  // Initialize and scale max price dynamically based on actual items in store
  useEffect(() => {
    if (dbProducts && dbProducts.length > 0) {
      const prices = dbProducts.map((p) => p.base_price);
      const maxInList = Math.max(...prices);
      const roundedMax = Math.ceil(maxInList / 100) * 100;

      if (!hasSetInitialMax) {
        const initialMax = Math.max(roundedMax, 500); // At least 500 BDT limit
        setSliderMax(initialMax);
        setMaxPrice(initialMax);
        setMaxInput(initialMax.toString());
        setHasSetInitialMax(true);
      } else if (roundedMax > sliderMax) {
        setSliderMax(roundedMax);
        if (maxPrice === sliderMax) {
          setMaxPrice(roundedMax);
          setMaxInput(roundedMax.toString());
        }
      }
    }
  }, [dbProducts, hasSetInitialMax, maxPrice, sliderMax]);

  const sorted = useMemo(() => {
    if (!dbProducts) return [];
    const result = [...dbProducts];

    const getStock = (p: any) => p.product_variants?.reduce((acc: number, v: any) => acc + (v.stock_level || 0), 0) ?? 0;

    const sortByStock = (a: any, b: any) => {
      const isOutA = getStock(a) === 0;
      const isOutB = getStock(b) === 0;
      if (isOutA && !isOutB) return 1;
      if (!isOutA && isOutB) return -1;
      return 0;
    };

    switch (sortBy) {
      case "price-asc":
        return result.sort((a, b) => sortByStock(a, b) || a.base_price - b.base_price);
      case "price-desc":
        return result.sort((a, b) => sortByStock(a, b) || b.base_price - a.base_price);
      case "name":
        return result.sort((a, b) => sortByStock(a, b) || a.name.localeCompare(b.name));
      case "newest":
      default:
        // Preserve backend order (already sorted by createdAt: -1)
        return result;
    }
  }, [dbProducts, sortBy]);

  // Slider inputs handler
  const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), maxPrice - 10);
    setMinPrice(val);
    setMinInput(val.toString());
  };

  const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), minPrice + 10);
    setMaxPrice(val);
    setMaxInput(val.toString());
  };

  // Manual box typing handlers
  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMinInput(val);
    const parsed = Number(val);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= maxPrice - 10) {
      setMinPrice(parsed);
    }
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMaxInput(val);
    const parsed = Number(val);
    if (!isNaN(parsed) && parsed >= minPrice + 10 && parsed <= sliderMax) {
      setMaxPrice(parsed);
    }
  };

  const applyPriceFilter = () => {
    setAppliedMin(minPrice);
    setAppliedMax(maxPrice);
    setPage(1);
  };

  const clearPriceFilter = () => {
    setMinPrice(0);
    setMaxPrice(sliderMax);
    setMinInput("0");
    setMaxInput(sliderMax.toString());
    setAppliedMin(undefined);
    setAppliedMax(undefined);
    setPage(1);
  };

  const displayedCircles = useMemo(() => {
    if (!dbCategories || dbCategories.length === 0) return [];

    if (activeCategory) {
      // Find parent category to display hierarchy
      const parent = activeCategory.parent_id
        ? dbCategories.find(p => p.id === activeCategory.parent_id || p._id === activeCategory.parent_id)
        : activeCategory;

      if (parent) {
        const allGroupCircle = {
          id: parent.id || parent._id,
          name: `ALL ${parent.name.toUpperCase()}`,
          slug: parent.slug,
          image_url: parent.image_url || "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=600&auto=format&fit=crop"
        };

        const subCats = dbCategories.filter(
          c => c.parent_id === parent.id || c.parent_id === parent._id
        );

        return [allGroupCircle, ...subCats];
      }
    }

    // Default: Show ALL PRODUCTS + all database main categories (where parent_id is null/undefined)
    const allProductsCircle = {
      id: "all",
      name: "ALL PRODUCTS",
      slug: "all",
      image_url: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=600&auto=format&fit=crop"
    };

    const mainCats = dbCategories
      .filter(c => !c.parent_id)
      .map(c => ({
        id: c.id || c._id,
        name: c.name,
        slug: c.slug,
        image_url: c.image_url || "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=600&auto=format&fit=crop"
      }));

    return [allProductsCircle, ...mainCats];
  }, [activeCategory, dbCategories]);

  const getCategoryImage = (sub: any) => {
    if (sub.image_url) return cloudinaryUrl(sub.image_url);

    const slug = (sub.slug || "").toLowerCase();
    const name = (sub.name || "").toLowerCase();

    if (slug.includes("shirt") || slug === "tee" || slug.includes("polo") || name.includes("shirt") || name.includes("tee") || name.includes("polo") || name.includes("top")) {
      return "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop";
    }
    if (slug.includes("pant") || slug.includes("baggy") || slug.includes("denim") || slug.includes("danim") || name.includes("pant") || name.includes("trouser") || name.includes("jeans") || name.includes("chinos") || name.includes("cargo") || name.includes("short")) {
      return "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=600&auto=format&fit=crop";
    }
    if (slug === "cap" || slug.includes("hat") || slug.includes("belt") || slug.includes("sock") || slug.includes("accessory") || name.includes("cap") || name.includes("hat") || name.includes("belt") || name.includes("sock") || name.includes("glass") || name.includes("wallet")) {
      return "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=600&auto=format&fit=crop";
    }
    return "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=600&auto=format&fit=crop"; // General fallback
  };

  // Dynamic bar percents
  const minPercent = (minPrice / sliderMax) * 100;
  const maxPercent = (maxPrice / sliderMax) * 100;

  return (
    <div className="min-h-screen pt-24 pb-16 overflow-x-hidden">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs tracking-[0.3em] text-primary mb-2 font-semibold">COLLECTION</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-8 text-foreground">Shop</h1>
        </motion.div>

        {/* Premium Category & Subcategory Navigation */}
        <div className="mb-12 border-b border-border/10 pb-6">
          {/* Subcategory Circles (Premium Catalog Style Matching User Screenshot) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-2"
          >
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-6 pb-4">
              {displayedCircles.map((sub: any) => {
                const isActive = sub.slug === (categoryParam || categoryGroup || "all");
                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setPage(1);
                      if (sub.slug === "all") {
                        navigate("/products");
                      } else {
                        navigate(`/products?category=${sub.slug}`);
                      }
                    }}
                    className="group flex flex-col items-center cursor-pointer w-[72px] sm:w-[90px] focus:outline-none"
                  >
                    {/* Circle container */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`w-[60px] h-[60px] sm:w-[78px] sm:h-[78px] rounded-full overflow-hidden border-2 transition-all duration-300 relative ${isActive
                          ? "border-primary ring-4 ring-primary/20 shadow-lg shadow-primary/10 scale-105"
                          : "border-border/30 group-hover:border-primary/40 group-hover:shadow-md group-hover:shadow-primary/5"
                        }`}
                    >
                      <img
                        src={getCategoryImage(sub)}
                        alt={sub.name}
                        className="w-full h-full object-cover brightness-[0.8] group-hover:brightness-95 group-hover:scale-110 transition-all duration-500 rounded-full"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent rounded-full" />
                    </motion.div>

                    {/* Label underneath */}
                    <span className={`text-[8px] sm:text-[9px] font-bold tracking-widest text-center mt-2 uppercase transition-colors max-w-[72px] sm:max-w-[90px] line-clamp-2 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      }`}>
                      {sub.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Layout Workspace: Sidebar + Products List */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Area */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-6">


            {/* Price Range Card (Exactly like Screenshot) */}
            <div className="border border-border/30 rounded-xl overflow-hidden bg-card/10">
              <div
                className="flex justify-between items-center bg-[#f0ece9] dark:bg-card/70 px-4 py-3.5 cursor-pointer border-b border-border/30"
                onClick={() => setPriceOpen(!priceOpen)}
              >
                <span className="text-[11px] font-bold tracking-wider text-[#1a1a1a] dark:text-foreground uppercase">Price Range</span>
                <div className="p-1 bg-border/20 rounded-full">
                  {priceOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-[#1a1a1a] dark:text-foreground" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[#1a1a1a] dark:text-foreground" />
                  )}
                </div>
              </div>

              {priceOpen && (
                <div className="p-4 space-y-4">
                  {/* Slider Container */}
                  <div className="px-1 pt-2 pb-1">
                    <div className="relative h-2 w-full bg-border/40 rounded-full mb-6">
                      {/* Active Range bar */}
                      <div
                        className="absolute h-full rounded-full bg-[#e2c19d]"
                        style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
                      />
                      <div className="dual-range-container relative w-full h-full">
                        <input
                          type="range"
                          min="0"
                          max={sliderMax}
                          step="10"
                          value={minPrice}
                          onChange={handleMinSliderChange}
                          className="absolute w-full pointer-events-none appearance-none h-2 bg-transparent outline-none top-0 left-0"
                        />
                        <input
                          type="range"
                          min="0"
                          max={sliderMax}
                          step="10"
                          value={maxPrice}
                          onChange={handleMaxSliderChange}
                          className="absolute w-full pointer-events-none appearance-none h-2 bg-transparent outline-none top-0 left-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Manual Typing Boxes */}
                  <div className="flex gap-3 items-center">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        max={sliderMax}
                        value={minInput}
                        onChange={handleMinInputChange}
                        placeholder="Min"
                        className="bg-card border border-border/40 rounded-lg py-2 px-3 text-center text-xs font-semibold w-full focus:border-primary/45 outline-none text-foreground"
                      />
                    </div>
                    <span className="text-muted-foreground text-xs font-bold">—</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        max={sliderMax}
                        value={maxInput}
                        onChange={handleMaxInputChange}
                        placeholder="Max"
                        className="bg-card border border-border/40 rounded-lg py-2 px-3 text-center text-xs font-semibold w-full focus:border-primary/45 outline-none text-foreground"
                      />
                    </div>
                  </div>

                  {/* Clear & Filter Button Triggers */}
                  <div className="flex justify-between items-center pt-1.5 gap-2">
                    <button
                      onClick={clearPriceFilter}
                      className="bg-[#e2c19d] hover:bg-[#d5b38d] text-black font-semibold text-[11px] py-2 px-3 rounded-lg transition-colors flex-1"
                    >
                      Clear Filters
                    </button>
                    <button
                      onClick={applyPriceFilter}
                      className="bg-[#1a1a1a] dark:bg-[#e2c19d] hover:bg-black dark:hover:bg-[#d5b38d] text-white dark:text-black font-semibold text-[11px] py-2 px-3 rounded-lg transition-colors flex-1"
                    >
                      Filter Range
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Cards Workspace */}
          <div className="flex-1 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-border/10">
              <p className="text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                SHOWING {((page - 1) * limit) + 1} - {Math.min(page * limit, pagination?.total || 0)} OF {pagination?.total || 0} PRODUCTS
              </p>

              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-bold tracking-wider">SORT:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-card border border-border/30 rounded-lg text-xs px-3 py-1.5 text-foreground outline-none focus:border-primary/40 transition-colors font-semibold cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="name">Name</option>
                  <option value="price-asc">Price: Low → High</option>
                  <option value="price-desc">Price: High → Low</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-card rounded-xl border border-border/20 h-80 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {sorted.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sorted.map((product, i) => (
                      <ProductCard key={product.id} product={product} index={i} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-24 text-muted-foreground border border-dashed border-border/20 rounded-xl">
                    <p className="text-xs tracking-widest uppercase">NO PRODUCTS MATCH YOUR FILTERS</p>
                  </div>
                )}

                {pagination && pagination.pages > 1 && (
                  <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 mt-16 px-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-border/40 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card transition-colors flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">PREVIOUS</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-1">
                      {getPageNumbers(page, pagination.pages).map((p, idx) => {
                        if (p === "...") {
                          return (
                            <span
                              key={`dots-${idx}`}
                              className="w-8 h-8 flex items-center justify-center text-xs font-semibold text-muted-foreground"
                            >
                              ...
                            </span>
                          );
                        }
                        return (
                          <button
                            key={p}
                            onClick={() => setPage(Number(p))}
                            className={`w-8 h-8 text-xs font-semibold rounded-lg transition-all ${page === p
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "bg-card text-muted-foreground border border-border/30 hover:border-primary/30"
                              }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      disabled={page === pagination.pages}
                      onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-border/40 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card transition-colors flex items-center gap-1.5"
                    >
                      <span className="hidden sm:inline">NEXT</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
