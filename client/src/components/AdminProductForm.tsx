import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ImageUpload from "./ImageUpload";
import { toast } from "sonner";
import { X, Plus, Save, ArrowLeft, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler } from "lucide-react";

interface AdminProductFormProps {
  product?: any;
  onCancel: () => void;
  onSuccess: () => void;
}

const AdminProductForm = ({ product, onCancel, onSuccess }: AdminProductFormProps) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [sizeCharts, setSizeCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [tempCategoryId, setTempCategoryId] = useState<string | null>(null);
  const [tempSubcategoryId, setTempSubcategoryId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const openCategoryDialog = () => {
    if (formData.category_id) {
      const selected = categories.find(c => c.id === formData.category_id || c._id === formData.category_id);
      if (selected) {
        if (selected.parent_id) {
          setTempCategoryId(selected.parent_id);
          setTempSubcategoryId(selected.id || selected._id);
        } else {
          setTempCategoryId(selected.id || selected._id);
          setTempSubcategoryId(null);
        }
      } else {
        setTempCategoryId(null);
        setTempSubcategoryId(null);
      }
    } else {
      setTempCategoryId(null);
      setTempSubcategoryId(null);
    }
    setIsAddingCategory(false);
    setNewCategoryName("");
    setIsCategoryDialogOpen(true);
  };

  const getSelectedCategoryName = () => {
    if (!formData.category_id || categories.length === 0) return "Select category";
    const selected = categories.find(c => c.id === formData.category_id || c._id === formData.category_id);
    if (!selected) return "Select category";
    if (selected.parent_id) {
      const parent = categories.find(c => c.id === selected.parent_id || c._id === selected.parent_id);
      return parent ? `${parent.name} > ${selected.name}` : selected.name;
    }
    return selected.name;
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const slug = newCategoryName.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");
      const payload: any = {
        name: newCategoryName.trim(),
        slug,
        description: "",
      };
      
      if (tempCategoryId) {
        payload.parent_id = tempCategoryId;
      }

      const response = await api.post<any>("/categories", payload);
      toast.success(`${tempCategoryId ? "Sub-category" : "Category"} added successfully`);
      
      const updatedCats = await api.get<any[]>("/categories");
      setCategories(updatedCats);
      
      const newId = response.id || response._id;
      if (tempCategoryId) {
        setTempSubcategoryId(newId);
      } else {
        setTempCategoryId(newId);
      }
      
      setIsAddingCategory(false);
      setNewCategoryName("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to add category");
    }
  };

  const handleSaveSelection = () => {
    const finalId = tempSubcategoryId || tempCategoryId || "";
    setFormData(prev => ({ ...prev, category_id: finalId }));
    setIsCategoryDialogOpen(false);
  };
  
  const [formData, setFormData] = useState({
    name: product?.name || "",
    slug: product?.slug || "",
    base_price: product?.base_price || 0,
    traditional_price: product?.traditional_price || 0,
    category_id: product?.category_id || "",
    short_description: product?.short_description || "",
    long_description: product?.long_description || "",
    is_featured: product?.is_featured || false,
    is_recommended: product?.is_recommended || false,
    rating_override: product?.rating_override !== undefined && product?.rating_override !== null ? String(product.rating_override) : "",
    review_count_override: product?.review_count_override !== undefined && product?.review_count_override !== null ? String(product.review_count_override) : "",
    activity: product?.activity || [],
    product_images: product?.product_images || [],
    product_variants: product?.product_variants || [],
    tech_specs: product?.tech_specs || {},
    size_chart_id: product?.size_chart_id || "",
  });

  const [specsArray, setSpecsArray] = useState<{key: string, value: string}[]>(
    product?.tech_specs ? Object.entries(product.tech_specs).map(([k, v]) => ({ key: k, value: String(v) })) : []
  );

  useEffect(() => {
    fetchCategories();
    fetchSizeCharts();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await api.get<any[]>("/categories");
      setCategories(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories");
    }
  };

  const fetchSizeCharts = async () => {
    try {
      const data = await api.get<any[]>("/admin/size-charts");
      setSizeCharts(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSlugify = () => {
    setFormData(prev => ({ 
      ...prev, 
      slug: prev.name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "") 
    }));
  };

  const handleImageUpload = (url: string) => {
    setFormData(prev => ({
      ...prev,
      product_images: [...prev.product_images, { url, alt_text: prev.name, display_order: prev.product_images.length }]
    }));
  };

  const handleMultipleImageUpload = (urls: string[]) => {
    const newImages = urls.map((url, i) => ({
      url,
      alt_text: formData.name,
      display_order: formData.product_images.length + i
    }));
    setFormData(prev => ({
      ...prev,
      product_images: [...prev.product_images, ...newImages]
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      product_images: prev.product_images.filter((_, i) => i !== index)
    }));
  };

  const handleImageReorder = (newUrls: string[]) => {
    setFormData(prev => {
      // Re-map URLs to existing image objects, preserving metadata, and update display_order
      const urlToImg = Object.fromEntries(prev.product_images.map((img: any) => [img.url, img]));
      const reordered = newUrls.map((url, i) => ({
        ...(urlToImg[url] || { url, alt_text: prev.name }),
        display_order: i,
      }));
      return { ...prev, product_images: reordered };
    });
  };

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      product_variants: [...prev.product_variants, { variant_name: "", price_modifier: 0, sku: "", stock_level: 0 }]
    }));
  };

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      product_variants: prev.product_variants.filter((_, i) => i !== index)
    }));
  };

  const addActivity = (tag: string) => {
    if (!tag.trim() || formData.activity.includes(tag.trim())) return;
    setFormData(prev => ({ ...prev, activity: [...prev.activity, tag.trim()] }));
  };

  const removeActivity = (tag: string) => {
    setFormData(prev => ({ ...prev, activity: prev.activity.filter((a: string) => a !== tag) }));
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...formData.product_variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData(prev => ({ ...prev, product_variants: newVariants }));
  };

  const addSpec = () => setSpecsArray([...specsArray, { key: "", value: "" }]);
  const removeSpec = (index: number) => setSpecsArray(specsArray.filter((_, i) => i !== index));
  const updateSpec = (index: number, field: "key" | "value", value: string) => {
    const newSpecs = [...specsArray];
    newSpecs[index][field] = value;
    setSpecsArray(newSpecs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = product ? `/products/${product.id}` : "/products";

      // Convert specs array back to object
      const tech_specs = specsArray.reduce((acc: any, spec) => {
        if (spec.key.trim()) acc[spec.key.trim()] = spec.value;
        return acc;
      }, {});

      // Prepare data for submission
      const submitData = {
        ...formData,
        tech_specs,
        category_id: formData.category_id || undefined,
        size_chart_id: formData.size_chart_id || null,
        product_variants: formData.product_variants.filter(
          (v: any) => v.variant_name && v.variant_name.trim() !== ""
        ),
        rating_override: formData.rating_override === "" ? null : Number(formData.rating_override),
        review_count_override: formData.review_count_override === "" ? null : Number(formData.review_count_override),
      };

      if (product) {
        await api.put(url, submitData);
      } else {
        await api.post(url, submitData);
      }

      toast.success(`Product ${product ? "updated" : "created"} successfully`);
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex justify-between items-center">
        <Button type="button" variant="ghost" onClick={onCancel} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Button>
        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="w-4 h-4" /> {loading ? "Saving..." : "Save Product"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="contents lg:block lg:space-y-6">
          <Card className="glass order-2 lg:order-none">
            <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <div className="flex gap-2">
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                  <Button type="button" variant="secondary" onClick={handleSlugify}>Auto Slug</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input id="slug" name="slug" value={formData.slug} onChange={handleInputChange} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_price">Base Price (৳)</Label>
                  <Input id="base_price" name="base_price" type="number" step="0.01" value={formData.base_price} onChange={(e) => setFormData(p => ({ ...p, base_price: parseFloat(e.target.value) }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="traditional_price">Our Price (৳)</Label>
                  <Input id="traditional_price" name="traditional_price" type="number" step="0.01" value={formData.traditional_price} onChange={(e) => setFormData(p => ({ ...p, traditional_price: parseFloat(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <button
                    type="button"
                    onClick={openCategoryDialog}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left [&>span]:line-clamp-1"
                  >
                    <span>{getSelectedCategoryName()}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6 py-2">
                <div className="flex items-center gap-3">
                  <Switch 
                    id="is_featured" 
                    checked={formData.is_featured} 
                    onCheckedChange={(val) => setFormData(p => ({ ...p, is_featured: val }))} 
                  />
                  <Label htmlFor="is_featured">Featured Product</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch 
                    id="is_recommended" 
                    checked={formData.is_recommended} 
                    onCheckedChange={(val) => setFormData(p => ({ ...p, is_recommended: val }))} 
                  />
                  <Label htmlFor="is_recommended">Expert Recommendation</Label>
                </div>
              </div>

              <div className="border-t border-border/40 my-4 pt-4 space-y-4">
                <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Storefront Review Overrides</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rating_override">Star Rating (1.0 - 5.0)</Label>
                    <Input 
                      id="rating_override" 
                      name="rating_override" 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="5"
                      placeholder="e.g. 4.8" 
                      value={formData.rating_override} 
                      onChange={handleInputChange} 
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review_count_override">Review Count</Label>
                    <Input 
                      id="review_count_override" 
                      name="review_count_override" 
                      type="number" 
                      min="0"
                      placeholder="e.g. 150" 
                      value={formData.review_count_override} 
                      onChange={handleInputChange} 
                      className="bg-background/50"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Leave blank to automatically fallback to beautiful, stable seeded customer reviews.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass order-3 lg:order-none">
            <CardHeader><CardTitle className="text-lg">Descriptions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="short_description">Short Description</Label>
                <Input id="short_description" name="short_description" value={formData.short_description} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="long_description">Long Description</Label>
                <Textarea id="long_description" name="long_description" value={formData.long_description} onChange={handleInputChange} rows={5} />
              </div>
              <div className="space-y-2">
                <Label>Activity Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.activity.map((tag: string) => (
                    <span key={tag} className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => removeActivity(tag)}><X className="w-2 h-2" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Add tag (e.g. Outdoor)" 
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addActivity(e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Size Chart Selector */}
          {sizeCharts.length > 0 && (
            <Card className="glass order-2.5 lg:order-none">
              <CardHeader className="flex flex-row items-center gap-2">
                <Ruler className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Size Chart</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Assign a size chart template to show measurement details on the product page.
                </p>
                <Select
                  value={formData.size_chart_id || "none"}
                  onValueChange={(val) => setFormData(p => ({ ...p, size_chart_id: val === "none" ? "" : val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No size chart" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No size chart</SelectItem>
                    {sizeCharts.map((sc) => (
                      <SelectItem key={sc._id || sc.id} value={sc._id || sc.id}>
                        {sc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="contents lg:block lg:space-y-6">
          <Card className="glass order-1 lg:order-none">
            <CardHeader><CardTitle className="text-lg">Product Images</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ImageUpload 
                onUploadComplete={handleImageUpload} 
                onMultipleUploadComplete={handleMultipleImageUpload}
                currentImages={formData.product_images.map((img: any) => img.url)}
                onDeleteImage={(url) => setFormData(p => ({ ...p, product_images: p.product_images.filter((img: any) => img.url !== url) }))}
                onReorder={handleImageReorder}
                maxImages={10}
              />
            </CardContent>
          </Card>

          <Card className="glass order-4 lg:order-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Variants (Sizes, Colors, etc.)</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addVariant} className="gap-1">
                <Plus className="w-3 h-3" /> Add Variant
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.product_variants.map((variant: any, index: number) => (
                <div key={index} className="grid grid-cols-4 gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="col-span-1 space-y-1">
                    <Label className="text-[10px] uppercase">Name</Label>
                    <Input placeholder="S, M, L..." value={variant.variant_name} onChange={(e) => updateVariant(index, "variant_name", e.target.value)} />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-[10px] uppercase">SKU</Label>
                    <Input placeholder="SKU" value={variant.sku} onChange={(e) => updateVariant(index, "sku", e.target.value)} />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-[10px] uppercase">Stock</Label>
                    <Input type="number" value={variant.stock_level} onChange={(e) => updateVariant(index, "stock_level", parseInt(e.target.value))} />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(index)} className="text-destructive h-9">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {formData.product_variants.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No variants added yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass order-5 lg:order-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Technical Specifications</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addSpec} className="gap-1">
                <Plus className="w-3 h-3" /> Add Spec
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {specsArray.map((spec, index) => (
                <div key={index} className="grid grid-cols-7 gap-2 items-center">
                  <div className="col-span-3">
                    <Input 
                      placeholder="Label (e.g. material)" 
                      value={spec.key} 
                      onChange={(e) => updateSpec(index, "key", e.target.value)} 
                      className="text-xs"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input 
                      placeholder="Value (e.g. 100% Cotton)" 
                      value={spec.value} 
                      onChange={(e) => updateSpec(index, "value", e.target.value)} 
                      className="text-xs"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSpec(index)} className="text-destructive h-8 w-8">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {specsArray.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2 italic">No specifications added</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {isCategoryDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs">
          <div className="bg-card border border-border text-foreground rounded-2xl p-6 w-full max-w-[460px] shadow-2xl relative mx-4">
            
            {/* Red Circle Close Button overlapping the top right corner */}
            <button
              type="button"
              onClick={() => setIsCategoryDialogOpen(false)}
              className="absolute -top-3 -right-3 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors z-10"
            >
              <X className="w-3.5 h-3.5 stroke-[3]" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
              <h3 className="text-xl font-extrabold tracking-tight text-foreground">
                Assign categories
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingCategory(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            {/* Add Category Form (Inline) */}
            {isAddingCategory && (
              <div className="bg-background border border-border rounded-xl p-3.5 mb-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {tempCategoryId ? "Add Sub-category" : "Add Main Category"}
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="h-8 text-xs bg-card border-border text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleCreateCategory}
                    size="sm"
                    className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3"
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName("");
                    }}
                    size="sm"
                    className="h-8 border-border text-muted-foreground hover:bg-secondary hover:text-foreground text-xs px-2.5"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Categories Section */}
            <div className="mb-5">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Select categories
              </h4>
              <div className="flex flex-wrap gap-2">
                {categories
                  .filter(c => !c.parent_id)
                  .map((cat) => {
                    const isSelected = tempCategoryId === (cat.id || cat._id);
                    if (isSelected) {
                      return (
                        <div
                          key={cat.id || cat._id}
                          className="bg-primary/10 border-2 border-dashed border-primary rounded-full px-4 py-1.5 text-[10px] font-bold tracking-wider text-primary flex items-center gap-1.5 select-none"
                        >
                          <span className="uppercase">{cat.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTempCategoryId(null);
                              setTempSubcategoryId(null);
                            }}
                            className="bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-full w-3.5 h-3.5 flex items-center justify-center transition-colors"
                          >
                            <X className="w-2.5 h-2.5 stroke-[2.5]" />
                          </button>
                        </div>
                      );
                    }
                    return (
                      <button
                        type="button"
                        key={cat.id || cat._id}
                        onClick={() => {
                          setTempCategoryId(cat.id || cat._id);
                          setTempSubcategoryId(null);
                        }}
                        className="bg-secondary hover:bg-secondary/80 border border-border hover:border-primary/50 hover:text-primary rounded-full px-4 py-1.5 text-[10px] font-bold tracking-wider text-foreground transition-all uppercase"
                      >
                        {cat.name}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Sub-categories Section */}
            {tempCategoryId && (
              <div className="mb-6">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Select sub-categories
                </h4>
                <div className="flex flex-wrap gap-2">
                  {categories
                    .filter(c => c.parent_id === tempCategoryId)
                    .map((sub) => {
                      const isSelected = tempSubcategoryId === (sub.id || sub._id);
                      if (isSelected) {
                        return (
                          <div
                            key={sub.id || sub._id}
                            className="bg-primary/10 border-2 border-dashed border-primary rounded-full px-4 py-1.5 text-[10px] font-bold tracking-wider text-primary flex items-center gap-1.5 select-none"
                          >
                            <span className="uppercase">{sub.name}</span>
                            <button
                              type="button"
                              onClick={() => setTempSubcategoryId(null)}
                              className="bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-full w-3.5 h-3.5 flex items-center justify-center transition-colors"
                            >
                              <X className="w-2.5 h-2.5 stroke-[2.5]" />
                            </button>
                          </div>
                        );
                      }
                      return (
                        <button
                          type="button"
                          key={sub.id || sub._id}
                          onClick={() => setTempSubcategoryId(sub.id || sub._id)}
                          className="bg-secondary hover:bg-secondary/80 border border-border hover:border-primary/50 hover:text-primary rounded-full px-4 py-1.5 text-[10px] font-bold tracking-wider text-foreground transition-all uppercase"
                        >
                          {sub.name}
                        </button>
                      );
                    })}
                  {categories.filter(c => c.parent_id === tempCategoryId).length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No sub-categories found</span>
                  )}
                </div>
              </div>
            )}

            {/* Done Button */}
            <button
              type="button"
              onClick={handleSaveSelection}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl uppercase tracking-wider text-[11px] transition-colors shadow-md mt-4"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default AdminProductForm;
