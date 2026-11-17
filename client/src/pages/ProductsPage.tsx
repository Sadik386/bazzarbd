import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useCategories, useProducts, useSemanticSearch } from "@/hooks/useCatalog";
import { formatBDT, getId, getProductTotalStock } from "@/lib/format";

type SortMode = "newest" | "price-asc" | "price-desc";

export function ProductsPage() {
  const { categoryGroup } = useParams<{ categoryGroup?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCategory = searchParams.get("category") || categoryGroup || "all";
  const initialQuery = searchParams.get("q") || "";
  const initialMode = searchParams.get("mode") === "semantic";
  const initialPage = Math.max(1, Number(searchParams.get("page") || 1));

  const [category, setCategory] = useState(initialCategory);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [submittedSearch, setSubmittedSearch] = useState(initialQuery);
  const [semanticMode, setSemanticMode] = useState(initialMode);
  const [selectedActivity, setSelectedActivity] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 15000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>("newest");
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    const nextCat = searchParams.get("category") || categoryGroup || "all";
    const nextQ = searchParams.get("q") || "";
    const nextMode = searchParams.get("mode") === "semantic";
    const nextPage = Math.max(1, Number(searchParams.get("page") || 1));
    setCategory(nextCat);
    setSearchInput(nextQ);
    setSubmittedSearch(nextQ);
    setSemanticMode(nextMode);
    setPage(nextPage);
  }, [searchParams, categoryGroup]);

  const { data: categories = [] } = useCategories();

  const useAiSearch = semanticMode && submittedSearch.trim().length >= 2;

  const { data: catalogRes, isLoading: loadingCatalog } = useProducts({
    category: category !== "all" ? category : undefined,
    activity: selectedActivity !== "all" ? selectedActivity : undefined,
    search: !useAiSearch && submittedSearch.trim() ? submittedSearch.trim() : undefined,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 15000 ? priceRange[1] : undefined,
    page,
    limit: 12,
  });

  const { data: semanticProducts = [], isLoading: loadingSemantic } = useSemanticSearch(
    submittedSearch,
    {
      category: category !== "all" ? category : undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 15000 ? priceRange[1] : undefined,
      enabled: useAiSearch,
    }
  );

  const rawProducts = useMemo(
    () => (useAiSearch ? semanticProducts : catalogRes?.products || []),
    [useAiSearch, semanticProducts, catalogRes?.products]
  );
  const isLoading = useAiSearch ? loadingSemantic : loadingCatalog;

  const activityOptions = useMemo(() => {
    const set = new Set<string>();
    rawProducts.forEach((p) => (p.activity || []).forEach((a) => a && set.add(a)));
    return Array.from(set).sort();
  }, [rawProducts]);

  const filteredProducts = useMemo(() => {
    const base = inStockOnly
      ? rawProducts.filter((p) => getProductTotalStock(p) > 0)
      : [...rawProducts];

    if (sortBy === "price-asc") {
      base.sort((a, b) => a.base_price - b.base_price);
    } else if (sortBy === "price-desc") {
      base.sort((a, b) => b.base_price - a.base_price);
    }
    return base;
  }, [rawProducts, inStockOnly, sortBy]);

  const applyUrlParams = (nextCat: string, nextQ: string, nextSemantic: boolean, nextPage: number) => {
    const p = new URLSearchParams();
    if (nextCat && nextCat !== "all") p.set("category", nextCat);
    if (nextQ.trim()) p.set("q", nextQ.trim());
    if (nextSemantic) p.set("mode", "semantic");
    if (nextPage > 1) p.set("page", String(nextPage));
    setSearchParams(p, { replace: true });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedSearch(searchInput);
    setPage(1);
    applyUrlParams(category, searchInput, semanticMode, 1);
  };

  const handleCategoryChange = (slug: string) => {
    setCategory(slug);
    setPage(1);
    applyUrlParams(slug, submittedSearch, semanticMode, 1);
  };

  const clearFilters = () => {
    setCategory("all");
    setSearchInput("");
    setSubmittedSearch("");
    setSemanticMode(false);
    setSelectedActivity("all");
    setPriceRange([0, 15000]);
    setInStockOnly(false);
    setSortBy("newest");
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const filterPanel = (
    <div className="space-y-6">
      {/* Categories */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-foreground">Categories</p>
        <div className="flex flex-col space-y-1">
          <button
            type="button"
            onClick={() => handleCategoryChange("all")}
            className={`rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
              category === "all"
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            All pieces
          </button>
          {categories.map((c) => (
            <button
              key={getId(c)}
              type="button"
              onClick={() => handleCategoryChange(c.slug)}
              className={`rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                category === c.slug
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Price ceiling</span>
          <span className="tabular-price text-muted-foreground">
            {formatBDT(priceRange[0])} – {formatBDT(priceRange[1])}
          </span>
        </div>
        <Slider
          min={0}
          max={15000}
          step={250}
          value={priceRange}
          onValueChange={(val) => setPriceRange([val[0] ?? 0, val[1] ?? 15000])}
        />
      </div>

      {/* Availability */}
      <div className="flex items-center gap-2.5 border-t border-border pt-5">
        <Checkbox
          id="in-stock-only"
          checked={inStockOnly}
          onCheckedChange={(checked) => setInStockOnly(Boolean(checked))}
        />
        <Label htmlFor="in-stock-only" className="cursor-pointer text-sm font-normal">
          In stock only
        </Label>
      </div>

      {/* Activity Tags */}
      {activityOptions.length > 0 && (
        <div className="space-y-2.5 border-t border-border pt-5">
          <p className="text-xs font-semibold text-foreground">Occasion / Fit</p>
          <div className="flex flex-wrap gap-1.5">
            {["all", ...activityOptions].map((act) => (
              <button
                key={act}
                type="button"
                onClick={() => setSelectedActivity(act)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  selectedActivity === act
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-foreground/30"
                }`}
              >
                {act === "all" ? "Any" : act}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
        Reset filters
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-10 sm:px-6 lg:px-8">
      {/* Page Header & Search Bar */}
      <div className="mb-8 flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-4xl text-foreground sm:text-5xl">The Collection</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Filter by category, price in BDT, or toggle AI semantic search to describe what you need.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex w-full max-w-xl flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                semanticMode
                  ? "Describe fabric, season, or budget..."
                  : "Search by garment name..."
              }
              className="pl-9 pr-8"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSubmittedSearch("");
                  applyUrlParams(category, "", semanticMode, 1);
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant={semanticMode ? "default" : "outline"}
            size="sm"
            onClick={() => setSemanticMode((prev) => !prev)}
            className="h-10 gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Search</span>
          </Button>

          <Button type="submit" variant="ink" className="h-10">
            Search
          </Button>
        </form>
      </div>

      {/* Main Content Split */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:col-span-3 lg:block">{filterPanel}</aside>

        {/* Product Grid Area */}
        <div className="space-y-6 lg:col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 lg:hidden">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Filters
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Filter Collection</DrawerTitle>
                  </DrawerHeader>
                  <div className="overflow-y-auto px-5 pb-8">{filterPanel}</div>
                </DrawerContent>
              </Drawer>

              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="tabular-price font-medium text-foreground">
                  {filteredProducts.length}
                </span>{" "}
                {useAiSearch ? "AI-matched pieces" : "pieces"}
              </p>

              {useAiSearch && (
                <Badge variant="default" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Semantic Match
                </Badge>
              )}
            </div>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortMode)}>
              <SelectTrigger className="h-9 w-[180px] text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Featured & Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <h2 className="font-display text-2xl text-foreground">No pieces found</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Adjust your price ceiling, category, or switch AI semantic search on.
              </p>
              <Button variant="outline" onClick={clearFilters} className="mt-5">
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard key={getId(product)} product={product} />
              ))}
            </div>
          )}

          {/* Pagination (standard catalog mode) */}
          {!useAiSearch && catalogRes?.pagination && catalogRes.pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-border pt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const next = page - 1;
                  setPage(next);
                  applyUrlParams(category, submittedSearch, semanticMode, next);
                }}
              >
                Previous
              </Button>
              <span className="tabular-price px-3 text-xs text-muted-foreground">
                Page {page} of {catalogRes.pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= catalogRes.pagination.pages}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  applyUrlParams(category, submittedSearch, semanticMode, next);
                }}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
