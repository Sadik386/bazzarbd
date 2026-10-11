import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus, Search, Star, CheckSquare, Award, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import ConfirmDialog from "./ConfirmDialog";
import { cloudinaryUrl } from "@/lib/cloudinary";

// Inline stock input with confirm / cancel buttons
interface StockInputProps {
  productId: string;
  variantId: string;
  variantName: string;
  initialStock: number;
  onSave: (productId: string, variantId: string, newStock: number) => void;
}

const StockInput = ({ productId, variantId, variantName, initialStock, onSave }: StockInputProps) => {
  const [value, setValue] = useState(initialStock);
  const [saving, setSaving] = useState(false);

  // Keep in sync if the parent refreshes with a new initialStock value
  useEffect(() => { setValue(initialStock); }, [initialStock]);

  const isDirty = value !== initialStock;

  const handleConfirm = async () => {
    setSaving(true);
    await onSave(productId, variantId, value);
    setSaving(false);
  };

  const handleCancel = () => { setValue(initialStock); };

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground w-12 truncate">{variantName}:</span>
      <Input
        type="number"
        className={`h-7 w-16 text-xs px-2 transition-colors ${
          isDirty ? "border-amber-500 focus-visible:ring-amber-500" : ""
        }`}
        value={value}
        min={0}
        onChange={(e) => setValue(parseInt(e.target.value) || 0)}
      />
      {isDirty && (
        <>
          <button
            onClick={handleConfirm}
            disabled={saving}
            title="Confirm"
            className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 shrink-0"
          >
            {saving ? (
              <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
            ) : (
              <Check className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            title="Cancel"
            className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive hover:bg-destructive/80 text-white transition-colors disabled:opacity-50 shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
};

interface AdminProductListProps {
  onEdit: (product: any) => void;
  onAdd: () => void;
}

const AdminProductList = ({ onEdit, onAdd }: AdminProductListProps) => {
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const setPage = (updater: number | ((prev: number) => number)) => {
    const next = typeof updater === "function" ? updater(page) : updater;
    setSearchParams((prev) => { prev.set("page", String(next)); return prev; }, { replace: true });
  };

  const setLimit = (val: number) => {
    setSearchParams((prev) => { prev.set("limit", String(val)); prev.set("page", "1"); return prev; }, { replace: true });
  };
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, { is_featured?: boolean; is_recommended?: boolean }>>({});
  const [savingBatched, setSavingBatched] = useState(false);

  const fetchProducts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.get<any>(`/products?page=${page}&limit=${limit}&search=${searchTerm}`);
      // Merge with pending changes to keep UI consistent during search/pagination
      const processed = data.products.map((p: any) => {
        const pending = pendingChanges[p.id];
        if (pending) {
          return {
            ...p,
            is_featured: pending.is_featured !== undefined ? pending.is_featured : p.is_featured,
            is_recommended: pending.is_recommended !== undefined ? pending.is_recommended : p.is_recommended,
          };
        }
        return p;
      });
      setProducts(processed);
      setPagination(data.pagination);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load products");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    setSelectedIds([]); // Clear selection when page or search term changes
  }, [page, searchTerm, limit]);

  const handleUpdateStock = async (productId: string, variantId: string, newStock: number) => {
    try {
      await api.patch(`/products/${productId}/stock`, { variantId, stock_level: newStock });
      toast.success("Stock updated");
      fetchProducts(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update stock");
    }
  };

  const handleToggleFeatured = (productId: string) => {
    let newStatus = false;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          newStatus = !p.is_featured;
          return { ...p, is_featured: newStatus };
        }
        return p;
      })
    );

    setPendingChanges((prev) => {
      const existing = prev[productId] || {};
      const updated = { ...existing, is_featured: newStatus };
      return { ...prev, [productId]: updated };
    });
  };

  const handleToggleRecommended = (productId: string) => {
    let newStatus = false;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          newStatus = !p.is_recommended;
          return { ...p, is_recommended: newStatus };
        }
        return p;
      })
    );

    setPendingChanges((prev) => {
      const existing = prev[productId] || {};
      const updated = { ...existing, is_recommended: newStatus };
      return { ...prev, [productId]: updated };
    });
  };

  const handleBulkFeatured = (status: boolean) => {
    setProducts((prev) =>
      prev.map((p) => ({ ...p, is_featured: status }))
    );

    setPendingChanges((prev) => {
      const updated = { ...prev };
      products.forEach((p) => {
        updated[p.id] = { ...updated[p.id], is_featured: status };
      });
      return updated;
    });

    toast.success(`Marked all page products as ${status ? "Best Seller" : "Not Best Seller"}`);
  };

  const handleBulkRecommended = (status: boolean) => {
    setProducts((prev) =>
      prev.map((p) => ({ ...p, is_recommended: status }))
    );

    setPendingChanges((prev) => {
      const updated = { ...prev };
      products.forEach((p) => {
        updated[p.id] = { ...updated[p.id], is_recommended: status };
      });
      return updated;
    });

    toast.success(`Marked all page products as ${status ? "Expert Recommended" : "Not Recommended"}`);
  };

  const handleSaveBatchedChanges = async () => {
    const changeCount = Object.keys(pendingChanges).length;
    if (changeCount === 0) return;

    setSavingBatched(true);
    try {
      const updates = Object.entries(pendingChanges).map(([id, flags]) => ({
        id,
        ...flags
      }));

      await api.post("/products/bulk-update", { updates });
      toast.success(`Successfully saved ${changeCount} product changes!`);
      setPendingChanges({});
      await fetchProducts(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save changes");
    } finally {
      setSavingBatched(false);
    }
  };

  const handleDiscardChanges = () => {
    setPendingChanges({});
    fetchProducts();
    toast.success("Discarded all unsaved changes");
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete product");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSelectRow = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    const currentPageIds = filteredProducts.map((p) => p.id);
    const allSelectedOnPage = currentPageIds.every((id) => selectedIds.includes(id));

    if (allSelectedOnPage) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const union = [...prev];
        currentPageIds.forEach((id) => {
          if (!union.includes(id)) union.push(id);
        });
        return union;
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await api.post("/products/bulk-delete", { ids: selectedIds });
      toast.success(`${selectedIds.length} products deleted successfully`);
      setSelectedIds([]);
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete selected products");
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-destructive/10 border border-destructive/20 rounded-xl p-3 px-4 text-xs font-semibold text-destructive animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-destructive" />
            <span>{selectedIds.length} products selected for bulk action</span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 gap-2 px-4 font-bold rounded-lg shadow-lg shadow-destructive/10"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Selected
          </Button>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkFeatured(true)}
            className="text-xs gap-1.5 h-9"
          >
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
            Page: Mark Best Seller
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkRecommended(true)}
            className="text-xs gap-1.5 h-9"
          >
            <Award className="w-3.5 h-3.5 fill-violet-500 text-violet-500" />
            Page: Mark Recommended
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              handleBulkFeatured(false);
              handleBulkRecommended(false);
            }}
            className="text-xs text-muted-foreground gap-1.5 h-9"
          >
            Clear Page Settings
          </Button>
          <Button onClick={onAdd} className="gap-2 h-9">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px] text-center">
                <Checkbox
                  checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.includes(p.id))}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all products"
                />
              </TableHead>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">Loading products...</TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No products found</TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id} className={selectedIds.includes(product.id) ? "bg-muted/30" : ""}>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={() => handleSelectRow(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    {product.product_images?.[0] ? (
                      <img
                        src={cloudinaryUrl(product.product_images[0].url)}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded-md border border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-secondary rounded-md border border-border flex items-center justify-center text-[10px] text-muted-foreground">
                        No image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{product.name}</div>
                    <div className="text-[9px] font-mono text-muted-foreground select-all">{product.id}</div>
                  </TableCell>
                  <TableCell>{product.categories?.name || "Uncategorized"}</TableCell>
                  <TableCell>৳{product.base_price.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      {product.product_variants?.map((v: any) => (
                        <StockInput
                          key={v.id}
                          productId={product.id}
                          variantId={v.id}
                          variantName={v.variant_name}
                          initialStock={v.stock_level}
                          onSave={handleUpdateStock}
                        />
                      ))}
                      {!product.product_variants?.length && (
                        <span className="text-xs text-destructive italic">No variants</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleRecommended(product.id)}
                        className={product.is_recommended ? "text-violet-500 hover:text-violet-600" : "text-muted-foreground hover:text-foreground"}
                        title="Toggle Expert Recommendation"
                      >
                        <Award className={`w-4 h-4 ${product.is_recommended ? "fill-current" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleFeatured(product.id)}
                        className={product.is_featured ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground hover:text-foreground"}
                        title="Toggle Best Seller"
                      >
                        <Star className={`w-4 h-4 ${product.is_featured ? "fill-current" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(product)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(product.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-1">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-xs text-muted-foreground font-medium">
              SHOWING {((page - 1) * limit) + 1} - {Math.min(page * limit, pagination.total)} OF {pagination.total} PRODUCTS
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">PER PAGE:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-card border border-border/30 rounded-lg text-xs px-2 py-1 text-foreground outline-none focus:border-primary/40 transition-colors font-semibold cursor-pointer"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          {pagination.pages > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-8 text-[10px] tracking-wider rounded-lg border-border/40"
              >
                PREVIOUS
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pagination.pages}
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                className="h-8 text-[10px] tracking-wider rounded-lg border-border/40"
              >
                NEXT
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete Product"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedIds.length} Products`}
        description={`Are you sure you want to delete these ${selectedIds.length} products? This action will permanently remove them from the database and cannot be undone.`}
        confirmLabel="Delete Selected"
        onConfirm={handleBulkDelete}
      />

      {Object.keys(pendingChanges).length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-6 px-6 py-4 rounded-2xl bg-slate-900/90 text-white border border-slate-800 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300 min-w-[340px] md:min-w-[480px]">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Unsaved Changes
            </span>
            <span className="text-xs text-slate-400">
              You have {Object.keys(pendingChanges).length} unsaved settings changes.
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={savingBatched}
              onClick={handleDiscardChanges}
              className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 font-medium h-9 rounded-xl px-4 transition-all"
            >
              Discard
            </Button>
            <Button
              size="sm"
              disabled={savingBatched}
              onClick={handleSaveBatchedChanges}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold h-9 rounded-xl px-5 shadow-lg shadow-emerald-500/20 transition-all gap-1.5"
            >
              {savingBatched ? (
                <>
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductList;
