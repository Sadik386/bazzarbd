import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Download, Edit3, Plus, RefreshCw, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/hooks/useCatalog";
import { api, downloadBlob } from "@/lib/api";
import { formatBDT, getId, getImageUrl, getProductTotalStock, slugify } from "@/lib/format";
import type { Product, ProductsResponse, ProductVariant, SizeChart } from "@/types";

interface ProductDraft {
  id?: string;
  name: string;
  slug: string;
  category_id: string;
  size_chart_id: string;
  base_price: string;
  traditional_price: string;
  short_description: string;
  long_description: string;
  name_bn: string;
  short_description_bn: string;
  long_description_bn: string;
  highlightsText: string;
  specsText: string;
  activityText: string;
  is_featured: boolean;
  is_recommended: boolean;
  images: string[];
  variants: ProductVariant[];
  aiNotes: string;
  meta_title: string;
  meta_description: string;
}

const EMPTY_DRAFT: ProductDraft = {
  name: "",
  slug: "",
  category_id: "",
  size_chart_id: "",
  base_price: "",
  traditional_price: "",
  short_description: "",
  long_description: "",
  name_bn: "",
  short_description_bn: "",
  long_description_bn: "",
  highlightsText: "",
  specsText: "",
  activityText: "",
  is_featured: false,
  is_recommended: false,
  images: [],
  variants: [{ variant_name: "M", price_modifier: 0, sku: "", stock_level: 15 }],
  aiNotes: "",
  meta_title: "",
  meta_description: "",
};

function toDraft(p: Product): ProductDraft {
  const specsText = Object.entries(p.tech_specs || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return {
    id: getId(p),
    name: p.name,
    slug: p.slug,
    category_id: typeof p.category_id === "string" ? p.category_id : getId(p.category_id),
    size_chart_id: p.size_chart_id || "",
    base_price: String(p.base_price),
    traditional_price: p.traditional_price ? String(p.traditional_price) : "",
    short_description: p.short_description || "",
    long_description: p.long_description || "",
    name_bn: p.name_bn || "",
    short_description_bn: p.short_description_bn || "",
    long_description_bn: p.long_description_bn || "",
    highlightsText: (p.highlights || []).join("\n"),
    specsText,
    activityText: (p.activity || []).join(", "),
    is_featured: Boolean(p.is_featured),
    is_recommended: Boolean(p.is_recommended),
    images: (p.product_images || []).map((i) => i.url),
    variants:
      p.product_variants?.length > 0
        ? p.product_variants
        : [{ variant_name: "Standard", price_modifier: 0, sku: "", stock_level: 10 }],
    aiNotes: "",
    meta_title: p.seo?.meta_title || "",
    meta_description: p.seo?.meta_description || "",
  };
}

export function AdminProductsTab() {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await api.get<ProductsResponse | Product[]>("/products?limit=150");
      return Array.isArray(res) ? res : res.products || [];
    },
  });

  const { data: sizeCharts = [] } = useQuery<SizeChart[]>({
    queryKey: ["admin-size-charts"],
    queryFn: () => api.get<SizeChart[]>("/admin/size-charts"),
  });

  const handleOpenNew = () => {
    setDraft(EMPTY_DRAFT);
    setModalOpen(true);
  };

  const handleOpenEdit = async (p: Product) => {
    try {
      const full = await api.get<Product>(`/products/${p.slug}`);
      setDraft(toDraft(full));
    } catch {
      setDraft(toDraft(p));
    }
    setModalOpen(true);
  };

  const handleAiGenerate = async () => {
    if (!draft.name && draft.images.length === 0 && !draft.aiNotes) {
      toast.error("Enter a product name, image, or notes for AI content generation");
      return;
    }
    setGeneratingAi(true);
    try {
      const res = await api.post<{ data: Record<string, unknown> }>("/ai/generate-content", {
        name: draft.name,
        price: draft.base_price ? Number(draft.base_price) : undefined,
        notes: draft.aiNotes,
        imageUrl: draft.images[0] ? getImageUrl(draft.images[0]) : undefined,
        language: "Bilingual (English & Bengali)",
      });
      const d = res.data || {};
      const specsObj =
        d.specifications && typeof d.specifications === "object"
          ? Object.entries(d.specifications as Record<string, string>)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")
          : draft.specsText;

      setDraft((prev) => ({
        ...prev,
        name: String(d.title_en || prev.name),
        slug: String(d.slug || prev.slug || slugify(String(d.title_en || prev.name))),
        name_bn: String(d.title_bn || prev.name_bn),
        short_description: String(d.short_description_en || prev.short_description),
        short_description_bn: String(d.short_description_bn || prev.short_description_bn),
        long_description: String(d.long_description_en || prev.long_description),
        long_description_bn: String(d.long_description_bn || prev.long_description_bn),
        highlightsText: Array.isArray(d.highlights)
          ? d.highlights.join("\n")
          : prev.highlightsText,
        specsText: specsObj,
        base_price: prev.base_price || (d.suggested_price_bdt ? String(d.suggested_price_bdt) : ""),
        traditional_price:
          prev.traditional_price ||
          (d.suggested_traditional_price_bdt ? String(d.suggested_traditional_price_bdt) : ""),
        meta_title: String(d.meta_title || prev.meta_title),
        meta_description: String(d.meta_description || prev.meta_description),
      }));
      toast.success("AI generated bilingual copy, specs & SEO");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tech_specs: Record<string, string> = {};
      draft.specsText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((line) => {
          const [k, ...rest] = line.split(":");
          if (k && rest.length > 0) tech_specs[k.trim()] = rest.join(":").trim();
        });

      const payload = {
        name: draft.name.trim(),
        slug: draft.slug.trim() || `${slugify(draft.name)}-${Date.now().toString().slice(-4)}`,
        category_id: draft.category_id || null,
        size_chart_id: draft.size_chart_id || null,
        base_price: Number(draft.base_price) || 0,
        traditional_price: draft.traditional_price ? Number(draft.traditional_price) : null,
        short_description: draft.short_description.trim(),
        long_description: draft.long_description.trim(),
        name_bn: draft.name_bn.trim() || undefined,
        short_description_bn: draft.short_description_bn.trim() || undefined,
        long_description_bn: draft.long_description_bn.trim() || undefined,
        highlights: draft.highlightsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        tech_specs,
        activity: draft.activityText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        is_featured: draft.is_featured,
        is_recommended: draft.is_recommended,
        seo: {
          meta_title: draft.meta_title || undefined,
          meta_description: draft.meta_description || undefined,
        },
        product_images: draft.images.map((url, idx) => ({
          url,
          alt_text: draft.name.trim(),
          display_order: idx,
        })),
        product_variants: draft.variants.map((v) => ({
          variant_name: v.variant_name.trim() || "Standard",
          price_modifier: Number(v.price_modifier) || 0,
          sku: v.sku || undefined,
          stock_level: Number(v.stock_level) || 0,
        })),
      };

      if (draft.id) {
        await api.put(`/products/${draft.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("Product created");
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  const handleToggleFeatured = async (p: Product) => {
    try {
      await api.post("/products/bulk-update", {
        updates: [{ id: getId(p), is_featured: !p.is_featured }],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch {
      toast.error("Failed to toggle featured flag");
    }
  };

  const handleReembed = async (id: string) => {
    try {
      await api.post(`/search/reembed/${id}`);
      toast.success("Semantic embedding refreshed");
    } catch {
      toast.error("Could not refresh semantic vector");
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await api.getBlob("/admin/export/products");
      downloadBlob(blob, `products-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      toast.error("Failed to export products CSV");
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <img
            src={getImageUrl(row.original.product_images?.[0]?.url)}
            alt={row.original.name}
            className="h-11 w-9 shrink-0 rounded border border-border object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.original.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.categories?.name || "Uncategorized"}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "base_price",
      header: "Price",
      cell: ({ row }) => (
        <span className="tabular-price font-medium">{formatBDT(row.original.base_price)}</span>
      ),
    },
    {
      id: "stock",
      header: "Stock",
      cell: ({ row }) => {
        const total = getProductTotalStock(row.original);
        return (
          <Badge variant={total > 5 ? "success" : total > 0 ? "warning" : "destructive"}>
            {total} units
          </Badge>
        );
      },
    },
    {
      id: "featured",
      header: "Featured",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => handleToggleFeatured(row.original)}
          title="Toggle featured"
          className="text-primary"
        >
          <Star
            className={`h-4 w-4 ${row.original.is_featured ? "fill-current" : "opacity-30"}`}
          />
        </button>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const pid = getId(row.original);
        return (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={() => handleReembed(pid)} title="Re-index AI vector">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(row.original)} title="Edit">
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => handleDelete(pid)} title="Delete">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={products}
        searchPlaceholder="Search products..."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button size="sm" onClick={handleOpenNew} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New product
            </Button>
          </div>
        }
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Product" : "New Product Listing"}</DialogTitle>
            <DialogDescription>
              Upload photos, manage variants, or invoke Gemini AI to compose bilingual copy & SEO.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5">
            {/* AI Merchandise Assistant Bar */}
            <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Merchandise Copywriter (English + বাংলা)
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAiGenerate}
                  isLoading={generatingAi}
                  className="h-8 gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto-fill copy & SEO
                </Button>
              </div>
              <Input
                value={draft.aiNotes}
                onChange={(e) => setDraft((d) => ({ ...d, aiNotes: e.target.value }))}
                placeholder="Optional AI notes: e.g. 220 GSM combed cotton, relaxed drop-shoulder fit..."
              />
            </div>

            <ImageDropzone
              urls={draft.images}
              onChange={(images) => setDraft((d) => ({ ...d, images }))}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prod-name">Product name (EN)</Label>
                <Input
                  id="prod-name"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      name: e.target.value,
                      slug: d.id ? d.slug : slugify(e.target.value),
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-slug">URL slug</Label>
                <Input
                  id="prod-slug"
                  value={draft.slug}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-price">Base price (BDT)</Label>
                <Input
                  id="prod-price"
                  type="number"
                  value={draft.base_price}
                  onChange={(e) => setDraft((d) => ({ ...d, base_price: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-compare">Compare-at price (optional)</Label>
                <Input
                  id="prod-compare"
                  type="number"
                  value={draft.traditional_price}
                  onChange={(e) => setDraft((d) => ({ ...d, traditional_price: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={draft.category_id || "none"}
                  onValueChange={(v) => setDraft((d) => ({ ...d, category_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={getId(c)} value={getId(c)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Size chart</Label>
                <Select
                  value={draft.size_chart_id || "none"}
                  onValueChange={(v) => setDraft((d) => ({ ...d, size_chart_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None linked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No size chart</SelectItem>
                    {sizeCharts.map((sc) => (
                      <SelectItem key={getId(sc)} value={getId(sc)}>
                        {sc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variants Matrix */}
            <div className="space-y-2.5 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Size / Variant Inventory</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      variants: [
                        ...d.variants,
                        { variant_name: "L", price_modifier: 0, sku: "", stock_level: 10 },
                      ],
                    }))
                  }
                >
                  + Add variant
                </Button>
              </div>
              <div className="space-y-2">
                {draft.variants.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center gap-2">
                    <Input
                      className="col-span-4"
                      placeholder="Size / Color"
                      value={v.variant_name}
                      onChange={(e) => {
                        const next = [...draft.variants];
                        next[idx] = { ...v, variant_name: e.target.value };
                        setDraft((d) => ({ ...d, variants: next }));
                      }}
                    />
                    <Input
                      className="col-span-3"
                      placeholder="SKU"
                      value={v.sku || ""}
                      onChange={(e) => {
                        const next = [...draft.variants];
                        next[idx] = { ...v, sku: e.target.value };
                        setDraft((d) => ({ ...d, variants: next }));
                      }}
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      placeholder="+/- ৳"
                      value={v.price_modifier}
                      onChange={(e) => {
                        const next = [...draft.variants];
                        next[idx] = { ...v, price_modifier: Number(e.target.value) };
                        setDraft((d) => ({ ...d, variants: next }));
                      }}
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      placeholder="Stock"
                      value={v.stock_level}
                      onChange={(e) => {
                        const next = [...draft.variants];
                        next[idx] = { ...v, stock_level: Number(e.target.value) };
                        setDraft((d) => ({ ...d, variants: next }));
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={draft.variants.length <= 1}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          variants: d.variants.filter((_, i) => i !== idx),
                        }))
                      }
                      className="col-span-1"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Short description (EN)</Label>
                <Textarea
                  rows={2}
                  value={draft.short_description}
                  onChange={(e) => setDraft((d) => ({ ...d, short_description: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Short description (বাংলা)</Label>
                <Textarea
                  rows={2}
                  value={draft.short_description_bn}
                  onChange={(e) => setDraft((d) => ({ ...d, short_description_bn: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Full description (EN)</Label>
                <Textarea
                  rows={3}
                  value={draft.long_description}
                  onChange={(e) => setDraft((d) => ({ ...d, long_description: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Technical specs (Key: Value per line)</Label>
                <Textarea
                  rows={3}
                  placeholder={"Fabric: 100% Combed Cotton\nWeight: 200 GSM"}
                  value={draft.specsText}
                  onChange={(e) => setDraft((d) => ({ ...d, specsText: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.is_featured}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, is_featured: Boolean(v) }))}
                />
                <span>Featured on Home</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.is_recommended}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, is_recommended: Boolean(v) }))}
                />
                <span>Recommended collection</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={saving}>
                {draft.id ? "Save changes" : "Publish product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
