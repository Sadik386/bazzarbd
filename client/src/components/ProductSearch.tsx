import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cloudinaryUrl } from "@/lib/cloudinary";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  short_description: string | null;
  product_images: { url: string; alt_text: string | null; display_order: number | null }[];
}

const ProductSearch = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<{ products: SearchResult[] }>(`/products?search=${encodeURIComponent(query)}`);
        setResults((data?.products || []).slice(0, 6));
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (slug: string) => {
    onClose();
    navigate(`/product/${slug}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-background/98 backdrop-blur-xl z-[200] flex flex-col"
        >
          <div className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-12 md:pt-24 flex flex-col h-full pb-8">
            {/* Search Input Area */}
            <div className="flex items-center gap-4 border-b border-border/30 pb-4 relative group">
              <Search className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground/50 group-focus-within:text-primary transition-colors shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-grow bg-transparent text-foreground placeholder:text-muted-foreground/30 text-xl md:text-3xl font-light outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Clear Search"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-xs md:text-sm font-semibold text-primary px-3 py-1.5 md:px-4 md:py-2 bg-primary/10 hover:bg-primary/20 rounded-full transition-all shrink-0"
              >
                Close <span className="hidden md:inline">(Esc)</span>
              </button>
            </div>

            {/* Search Results / Suggestion Container */}
            <div className="flex-grow overflow-y-auto py-8">
              {query.trim() ? (
                <div>
                  {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-sm text-muted-foreground animate-pulse">Searching the catalog...</p>
                    </div>
                  )}
                  {!loading && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <p className="text-base md:text-lg font-medium text-foreground/70">No products found</p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">Try checking your spelling or search for something else</p>
                    </div>
                  )}
                  {!loading && results.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.map((product) => {
                        const img = product.product_images?.sort(
                          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
                        )[0];
                        return (
                          <button
                            key={product.id}
                            onClick={() => handleSelect(product.slug)}
                            className="w-full flex items-center gap-4 p-3 md:p-4 rounded-2xl bg-card/40 hover:bg-card border border-border/10 hover:border-border/50 hover:shadow-lg hover:shadow-primary/5 transition-all text-left group"
                          >
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-card border border-border/30 overflow-hidden shrink-0 flex items-center justify-center">
                              {img ? (
                                <img src={cloudinaryUrl(img.url)} alt={img.alt_text ?? product.name} width="64" height="64" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-95" />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <Search className="w-5 h-5 text-muted-foreground/30" />
                                </div>
                              )}
                            </div>
                            <div className="flex-grow min-w-0">
                              <p className="text-sm md:text-base font-semibold text-foreground/90 truncate group-hover:text-primary transition-colors text-left">{product.name}</p>
                              {product.short_description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5 font-light text-left">{product.short_description}</p>
                              )}
                              <p className="text-xs md:text-sm font-bold text-[#ff4d00] mt-1 text-left">
                                ৳{product.base_price.toFixed(2)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 md:py-24 opacity-60">
                  <Search className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground/20 mb-4 stroke-[1.2px]" />
                  <p className="text-base md:text-lg font-light text-muted-foreground text-center">Type to search the store</p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-md">
                    {["Jacket", "Hoodie", "Pants", "T-Shirt"].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setQuery(tag)}
                        className="px-3 py-1.5 md:px-4 md:py-2 text-xs font-medium text-foreground/70 hover:text-primary bg-card/60 hover:bg-card border border-border/30 rounded-full transition-all"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProductSearch;
