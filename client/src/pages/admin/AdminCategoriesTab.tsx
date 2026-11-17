import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCatalog";
import { api } from "@/lib/api";
import { getId, getImageUrl, slugify } from "@/lib/format";
import type { Category } from "@/types";

function SortableCategoryRow({
  cat,
  parentName,
  onDelete,
}: {
  cat: Category;
  parentName?: string;
  onDelete: (id: string) => void;
}) {
  const id = getId(cat);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="cursor-grab text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {cat.image_url && (
          <img
            src={getImageUrl(cat.image_url)}
            alt={cat.name}
            className="h-10 w-10 rounded-lg border border-border object-cover"
          />
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{cat.name}</span>
            {parentName && <Badge variant="secondary">Sub of {parentName}</Badge>}
          </div>
          <p className="font-mono text-xs text-muted-foreground">/{cat.slug}</p>
        </div>
      </div>

      <Button size="icon" variant="ghost" onClick={() => onDelete(id)} aria-label="Delete category">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function AdminCategoriesTab() {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("none");
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/categories", {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        description: description.trim() || undefined,
        parent_id: parentId === "none" ? null : parentId,
        image_url: images[0] || undefined,
        sequence: categories.length,
      });
      toast.success("Category created");
      setName("");
      setSlug("");
      setDescription("");
      setParentId("none");
      setImages([]);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Category removed");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch {
      toast.error("Failed to remove category");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => getId(c) === active.id);
    const newIndex = categories.findIndex((c) => getId(c) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categories, oldIndex, newIndex);
    queryClient.setQueryData(["categories"], reordered);

    try {
      await Promise.all(
        reordered.map((cat, idx) => api.put(`/categories/${getId(cat)}`, { sequence: idx }))
      );
      toast.success("Category sequence saved");
    } catch {
      toast.error("Failed to persist category sequence");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  };

  const categoryNameMap = new Map(categories.map((c) => [getId(c), c.name]));

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Create Category or Subcategory</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="Linen Shirts"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Parent Category (optional for subcategory)</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Top-level category</SelectItem>
                  {categories
                    .filter((c) => !c.parent_id)
                    .map((c) => (
                      <SelectItem key={getId(c)} value={getId(c)}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Input
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <ImageDropzone
              urls={images}
              onChange={setImages}
              multiple={false}
              label="Optional category cover"
            />

            <Button type="submit" className="w-full gap-1.5" isLoading={saving}>
              <Plus className="h-4 w-4" />
              Add category
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3 lg:col-span-7">
        <p className="text-xs text-muted-foreground">
          Drag handles to reorder storefront category sequence ({categories.length} total).
        </p>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => getId(c))} strategy={verticalListSortingStrategy}>
            <div className="space-y-2.5">
              {categories.map((cat) => (
                <SortableCategoryRow
                  key={getId(cat)}
                  cat={cat}
                  parentName={cat.parent_id ? categoryNameMap.get(cat.parent_id) : undefined}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
