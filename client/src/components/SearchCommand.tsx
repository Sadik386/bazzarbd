import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { ArrowRight, Search, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useProducts, useSemanticSearch } from "@/hooks/useCatalog";
import { formatBDT, getId, getImageUrl, handleImageError } from "@/lib/format";
import { useConciergeStore } from "@/stores/conciergeStore";

const SUGGESTED_QUERIES = [
  "Breathable cotton shirt for Dhaka heat",
  "Heavyweight charcoal hoodie",
  "Everyday minimal essentials under 2500",
];

export function SearchCommand() {
  const navigate = useNavigate();
  const open = useConciergeStore((s) => s.searchOpen);
  const setOpen = useConciergeStore((s) => s.setSearchOpen);
  const [query, setQuery] = useState("");
  const [semanticMode, setSemanticMode] = useState(true);

  const trimmed = query.trim();

  // Keyboard shortcut Cmd/Ctrl + K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  const { data: keywordData, isFetching: loadingKeyword } = useProducts({
    search: trimmed || undefined,
    limit: 8,
  });

  const { data: semanticResults = [], isFetching: loadingSemantic } = useSemanticSearch(trimmed, {
    enabled: open && semanticMode && trimmed.length >= 2,
  });

  const results =
    semanticMode && trimmed.length >= 2 && semanticResults.length > 0
      ? semanticResults
      : keywordData?.products || [];

  const isLoading = semanticMode && trimmed.length >= 2 ? loadingSemantic || loadingKeyword : loadingKeyword;

  const goToProduct = (slug: string) => {
    setOpen(false);
    navigate(`/product/${slug}`);
  };

  const goToFullSearch = () => {
    setOpen(false);
    navigate(`/products?q=${encodeURIComponent(trimmed)}${semanticMode ? "&mode=semantic" : ""}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl [&>button]:hidden">
        <DialogTitle className="sr-only">Search catalog</DialogTitle>
        <DialogDescription className="sr-only">
          Search BazzarBD products by keyword or natural-language semantic description.
        </DialogDescription>
        <Command shouldFilter={false} className="bg-card text-foreground">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search garments, fabrics, or describe a look..."
              className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2 text-xs">
            <button
              type="button"
              onClick={() => setSemanticMode((prev) => !prev)}
              className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary"
            >
              <Sparkles className={`h-3.5 w-3.5 ${semanticMode ? "text-primary" : "text-muted-foreground"}`} />
              <span>AI semantic search: {semanticMode ? "On" : "Off"}</span>
            </button>
            <span className="text-muted-foreground">Esc to close</span>
          </div>

          <Command.List className="max-h-[380px] overflow-y-auto p-2">
            {!trimmed && (
              <Command.Group heading="Try searching" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {SUGGESTED_QUERIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuery(q)}
                      className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-secondary"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </Command.Group>
            )}

            {isLoading && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Searching BazzarBD archive...
              </div>
            )}

            {!isLoading && results.length === 0 && trimmed && (
              <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
                No pieces matched "{trimmed}". Try another fabric, category, or ask the AI Concierge.
              </Command.Empty>
            )}

            {results.length > 0 && (
              <Command.Group
                heading={trimmed ? "Matching pieces" : "Popular pieces"}
                className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
              >
                <div className="mt-1 space-y-1">
                  {results.slice(0, 8).map((product) => (
                    <Command.Item
                      key={getId(product)}
                      value={`${product.name}-${product.slug}`}
                      onSelect={() => goToProduct(product.slug)}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-secondary/70 aria-selected:bg-secondary"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={getImageUrl(product.product_images?.[0]?.url)}
                          alt={product.name}
                          onError={handleImageError}
                          className="h-11 w-9 shrink-0 rounded object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{product.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {product.categories?.name || product.short_description || "Apparel"}
                          </p>
                        </div>
                      </div>
                      <span className="tabular-price shrink-0 text-xs font-medium text-foreground">
                        {formatBDT(product.base_price)}
                      </span>
                    </Command.Item>
                  ))}
                </div>
              </Command.Group>
            )}

            {trimmed && (
              <div className="mt-2 border-t border-border pt-2">
                <button
                  type="button"
                  onClick={goToFullSearch}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5"
                >
                  <span>View all catalog results for "{trimmed}"</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
