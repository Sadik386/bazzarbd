import { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, LayoutGrid, GripVertical, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import ImageUpload from "./ImageUpload";
import ConfirmDialog from "./ConfirmDialog";
import { cloudinaryUrl } from "@/lib/cloudinary";

// dnd-kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable table row component
const SortableRow = ({ category, onDelete, onEdit, onSequenceChange }: { category: any; onDelete: (id: string) => void; onEdit: (category: any) => void; onSequenceChange: (id: string, seq: number) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    backgroundColor: isDragging ? "hsl(var(--muted) / 0.8)" : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "shadow-lg border-primary/20" : ""}>
      <TableCell className="w-[40px]">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-muted/80 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
          title="Drag to reorder"
          style={{ touchAction: "none" }}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </TableCell>
      <TableCell className="w-[50px] pl-0">
        <div className="w-12 h-12 rounded bg-primary/10 overflow-hidden flex items-center justify-center border border-border/50 shadow-inner">
          {category.image_url ? (
            <img src={cloudinaryUrl(category.image_url)} alt={category.name} className="w-full h-full object-cover" />
          ) : (
            <LayoutGrid className="w-4 h-4 text-primary" />
          )}
        </div>
      </TableCell>
      <TableCell className="font-semibold text-foreground text-sm">{category.name}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{category.slug}</TableCell>
      <TableCell className="text-muted-foreground text-xs max-w-xs truncate">{category.description || "-"}</TableCell>
      <TableCell className="text-center w-[120px]">
        <Input
          type="number"
          value={category.sequence ?? 0}
          onChange={(e) => onSequenceChange(category.id, parseInt(e.target.value) || 0)}
          className="w-16 h-8 mx-auto text-center font-mono font-semibold"
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(category)}
            className="text-primary hover:text-primary hover:bg-primary/10"
            title="Edit Category"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(category.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete Category"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const AdminCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", description: "", image_url: "", sequence: 0 });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const editFormRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to edit form when it opens
  useEffect(() => {
    if (editingCategory && editFormRef.current) {
      setTimeout(() => {
        editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50); // small delay to allow DOM render
    }
  }, [editingCategory?._id ?? editingCategory?.id]);

  // Configure sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Press and drag 8px to activate, ensuring click elements/inputs still work
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Press and hold for 250ms to drag, so scrolling works smoothly on mobile
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await api.get<any[]>("/categories");
      // Pre-sort on initial fetch by sequence, then name
      const sorted = data.sort((a: any, b: any) => {
        if ((a.sequence ?? 0) !== (b.sequence ?? 0)) return (a.sequence ?? 0) - (b.sequence ?? 0);
        return a.name.localeCompare(b.name);
      });
      setCategories(sorted);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSlugify = () => {
    setNewCategory(prev => ({
      ...prev,
      slug: prev.name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "")
    }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/categories", newCategory);
      toast.success("Category added successfully");
      setIsAdding(false);
      setNewCategory({ name: "", slug: "", description: "", image_url: "", sequence: 0 });
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to add category");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      await api.put(`/categories/${editingCategory.id}`, {
        name: editingCategory.name,
        slug: editingCategory.slug,
        description: editingCategory.description,
        image_url: editingCategory.image_url,
        sequence: editingCategory.sequence,
      });
      toast.success("Category updated successfully");
      setEditingCategory(null);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to update category");
    }
  };

  const handleSequenceChange = async (id: string, newSeq: number) => {
    try {
      // Local first update for instantaneous UI feedback and sorting
      setCategories(prev => prev.map(c => c.id === id ? { ...c, sequence: newSeq } : c).sort((a, b) => {
        if (a.sequence !== b.sequence) return a.sequence - b.sequence;
        return a.name.localeCompare(b.name);
      }));

      await api.put(`/categories/${id}`, { sequence: newSeq });
    } catch (error: any) {
      toast.error(error.message || "Failed to update sequence");
      fetchCategories(); // Revert to backend state on error
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const parentCategories = categories.filter(c => !c.parent_id);
    const oldIndex = parentCategories.findIndex((c) => c.id === active.id);
    const newIndex = parentCategories.findIndex((c) => c.id === over.id);

    // Compute the locally re-ordered parent categories
    const reordered = arrayMove(parentCategories, oldIndex, newIndex);

    // Auto-assign clean incremental sequences based on their visual order
    const updated = reordered.map((cat, index) => ({
      ...cat,
      sequence: index + 1,
    }));

    // Recombine with subcategories to preserve full list in state
    setCategories(prev => {
      const subCategories = prev.filter(c => !!c.parent_id);
      return [...updated, ...subCategories];
    });

    try {
      // Sync reordered sequences with backend in parallel
      const promises = updated.map(cat =>
        api.put(`/categories/${cat.id}`, { sequence: cat.sequence })
      );
      await Promise.all(promises);
      toast.success("Category sequence saved successfully");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to save new category order");
      fetchCategories(); // Rollback to actual backend state
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Category deleted");
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        {!isAdding && !editingCategory && (
          <Button onClick={() => { setIsAdding(true); setEditingCategory(null); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>Add New Category</CardTitle>
            <CardDescription>Create a new product grouping.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category Name</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Hoodies"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={handleSlugify}>Slug</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    placeholder="e.g. hoodies"
                    value={newCategory.slug}
                    onChange={(e) => setNewCategory(p => ({ ...p, slug: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sequence / Sort Order</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1"
                    value={newCategory.sequence}
                    onChange={(e) => setNewCategory(p => ({ ...p, sequence: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="Short description of the category"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Category Image</Label>
                <ImageUpload
                  onUploadComplete={(url) => setNewCategory(p => ({ ...p, image_url: url }))}
                  currentImages={newCategory.image_url ? [newCategory.image_url] : []}
                  maxImages={1}
                  onDeleteImage={() => setNewCategory(p => ({ ...p, image_url: "" }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit">Save Category</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {editingCategory && (
        <Card ref={editFormRef} className="glass scroll-mt-28">
          <CardHeader>
            <CardTitle>Edit Category: {editingCategory.name}</CardTitle>
            <CardDescription>Update details for this category.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category Name</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Hoodies"
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={() => {
                      setEditingCategory(prev => ({
                        ...prev,
                        slug: prev.name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "")
                      }));
                    }}>Slug</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    placeholder="e.g. hoodies"
                    value={editingCategory.slug}
                    onChange={(e) => setEditingCategory(p => ({ ...p, slug: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sequence / Sort Order</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1"
                    value={editingCategory.sequence}
                    onChange={(e) => setEditingCategory(p => ({ ...p, sequence: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="Short description of the category"
                  value={editingCategory.description || ""}
                  onChange={(e) => setEditingCategory(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Category Image</Label>
                <ImageUpload
                  onUploadComplete={(url) => setEditingCategory(p => ({ ...p, image_url: url }))}
                  currentImages={editingCategory.image_url ? [editingCategory.image_url] : []}
                  maxImages={1}
                  onDeleteImage={() => setEditingCategory(p => ({ ...p, image_url: "" }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditingCategory(null)}>Cancel</Button>
                <Button type="submit">Update Category</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border border-border bg-card">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px] text-center">Sequence</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">Loading categories...</TableCell>
                </TableRow>
              ) : categories.filter(c => !c.parent_id).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No categories found</TableCell>
                </TableRow>
              ) : (
                <SortableContext
                  items={categories.filter(c => !c.parent_id).map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {categories.filter(c => !c.parent_id).map((category) => (
                    <SortableRow
                      key={category.id}
                      category={category}
                      onDelete={(id) => setDeleteTarget(id)}
                      onEdit={(cat) => {
                        setEditingCategory(cat);
                        setIsAdding(false);
                      }}
                      onSequenceChange={handleSequenceChange}
                    />
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Category"
        description="Are you sure? This might affect products in this category. This action cannot be undone."
        confirmLabel="Delete Category"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
};

export default AdminCategories;
