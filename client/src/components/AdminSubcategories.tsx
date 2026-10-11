import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, LayoutGrid, GripVertical, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
const SortableRow = ({
  subcategory,
  parentCategories,
  onDelete,
  onEdit,
  onSequenceChange
}: {
  subcategory: any;
  parentCategories: any[];
  onDelete: (id: string) => void;
  onEdit: (subcategory: any) => void;
  onSequenceChange: (id: string, seq: number) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subcategory.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    backgroundColor: isDragging ? "hsl(var(--muted) / 0.8)" : undefined,
  };

  const parentName = parentCategories.find(c => c.id === subcategory.parent_id)?.name || "Unknown";

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
          {subcategory.image_url ? (
            <img src={cloudinaryUrl(subcategory.image_url)} alt={subcategory.name} className="w-full h-full object-cover" />
          ) : (
            <LayoutGrid className="w-4 h-4 text-primary" />
          )}
        </div>
      </TableCell>
      <TableCell className="font-semibold text-foreground text-sm">{subcategory.name}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{subcategory.slug}</TableCell>
      <TableCell className="text-sm">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary">
          {parentName}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs max-w-xs truncate">{subcategory.description || "-"}</TableCell>
      <TableCell className="text-center w-[120px]">
        <Input
          type="number"
          value={subcategory.sequence ?? 0}
          onChange={(e) => onSequenceChange(subcategory.id, parseInt(e.target.value) || 0)}
          className="w-16 h-8 mx-auto text-center font-mono font-semibold"
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(subcategory)}
            className="text-primary hover:text-primary hover:bg-primary/10"
            title="Edit Subcategory"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(subcategory.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete Subcategory"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const AdminSubcategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<any | null>(null);

  const [newSubcategory, setNewSubcategory] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    sequence: 0,
    parent_id: ""
  });

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Configure sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
      setCategories(data);
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

  const parentCategories = categories.filter(c => !c.parent_id);
  const subcategories = categories
    .filter(c => !!c.parent_id)
    .sort((a, b) => {
      if ((a.sequence ?? 0) !== (b.sequence ?? 0)) return (a.sequence ?? 0) - (b.sequence ?? 0);
      return a.name.localeCompare(b.name);
    });

  const handleSlugify = () => {
    setNewSubcategory(prev => ({
      ...prev,
      slug: prev.name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "")
    }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcategory.parent_id) {
      toast.error("Please select a parent category");
      return;
    }
    try {
      await api.post("/categories", newSubcategory);
      toast.success("Subcategory added successfully");
      setIsAdding(false);
      setNewSubcategory({ name: "", slug: "", description: "", image_url: "", sequence: 0, parent_id: "" });
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to add subcategory");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubcategory) return;
    if (!editingSubcategory.parent_id) {
      toast.error("Please select a parent category");
      return;
    }
    try {
      await api.put(`/categories/${editingSubcategory.id}`, {
        name: editingSubcategory.name,
        slug: editingSubcategory.slug,
        description: editingSubcategory.description,
        image_url: editingSubcategory.image_url,
        sequence: editingSubcategory.sequence,
        parent_id: editingSubcategory.parent_id,
      });
      toast.success("Subcategory updated successfully");
      setEditingSubcategory(null);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to update subcategory");
    }
  };

  const handleSequenceChange = async (id: string, newSeq: number) => {
    try {
      // Local first update
      setCategories(prev => prev.map(c => c.id === id ? { ...c, sequence: newSeq } : c));
      await api.put(`/categories/${id}`, { sequence: newSeq });
    } catch (error: any) {
      toast.error(error.message || "Failed to update sequence");
      fetchCategories();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = subcategories.findIndex((c) => c.id === active.id);
    const newIndex = subcategories.findIndex((c) => c.id === over.id);

    // Compute the locally re-ordered subcategory array
    const reordered = arrayMove(subcategories, oldIndex, newIndex);

    // Auto-assign sequence values
    const updated = reordered.map((sub, index) => ({
      ...sub,
      sequence: index + 1,
    }));

    // Update categories state locally
    setCategories(prev => {
      const parentList = prev.filter(c => !c.parent_id);
      return [...parentList, ...updated];
    });

    try {
      const promises = updated.map(sub =>
        api.put(`/categories/${sub.id}`, { sequence: sub.sequence })
      );
      await Promise.all(promises);
      toast.success("Subcategory order saved successfully");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to save new order");
      fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Subcategory deleted successfully");
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete subcategory");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        {!isAdding && !editingSubcategory && (
          <Button onClick={() => { setIsAdding(true); setEditingSubcategory(null); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Subcategory
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>Add New Subcategory</CardTitle>
            <CardDescription>Create a nested subcategory linked to a main category.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parent Category</Label>
                  <Select
                    value={newSubcategory.parent_id}
                    onValueChange={(val) => setNewSubcategory(p => ({ ...p, parent_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Parent Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sequence / Sort Order</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1"
                    value={newSubcategory.sequence}
                    onChange={(e) => setNewSubcategory(p => ({ ...p, sequence: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subcategory Name</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Cargo Pants"
                      value={newSubcategory.name}
                      onChange={(e) => setNewSubcategory(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={handleSlugify}>Slug</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    placeholder="e.g. cargo-pants"
                    value={newSubcategory.slug}
                    onChange={(e) => setNewSubcategory(p => ({ ...p, slug: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="Short description of the subcategory"
                  value={newSubcategory.description}
                  onChange={(e) => setNewSubcategory(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Subcategory Image (Optional - will fallback to parent category image if empty)</Label>
                <ImageUpload
                  onUploadComplete={(url) => setNewSubcategory(p => ({ ...p, image_url: url }))}
                  currentImages={newSubcategory.image_url ? [newSubcategory.image_url] : []}
                  maxImages={1}
                  onDeleteImage={() => setNewSubcategory(p => ({ ...p, image_url: "" }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit">Save Subcategory</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {editingSubcategory && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>Edit Subcategory: {editingSubcategory.name}</CardTitle>
            <CardDescription>Update details for this subcategory.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parent Category</Label>
                  <Select
                    value={editingSubcategory.parent_id}
                    onValueChange={(val) => setEditingSubcategory(p => ({ ...p, parent_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Parent Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sequence / Sort Order</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1"
                    value={editingSubcategory.sequence}
                    onChange={(e) => setEditingSubcategory(p => ({ ...p, sequence: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subcategory Name</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Cargo Pants"
                      value={editingSubcategory.name}
                      onChange={(e) => setEditingSubcategory(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={() => {
                      setEditingSubcategory(prev => ({
                        ...prev,
                        slug: prev.name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "")
                      }));
                    }}>Slug</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    placeholder="e.g. cargo-pants"
                    value={editingSubcategory.slug}
                    onChange={(e) => setEditingSubcategory(p => ({ ...p, slug: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="Short description of the subcategory"
                  value={editingSubcategory.description || ""}
                  onChange={(e) => setEditingSubcategory(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Subcategory Image (Optional - will fallback to parent category image if empty)</Label>
                <ImageUpload
                  onUploadComplete={(url) => setEditingSubcategory(p => ({ ...p, image_url: url }))}
                  currentImages={editingSubcategory.image_url ? [editingSubcategory.image_url] : []}
                  maxImages={1}
                  onDeleteImage={() => setEditingSubcategory(p => ({ ...p, image_url: "" }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditingSubcategory(null)}>Cancel</Button>
                <Button type="submit">Update Subcategory</Button>
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
                <TableHead>Parent Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px] text-center">Sequence</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">Loading subcategories...</TableCell>
                </TableRow>
              ) : subcategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No subcategories found</TableCell>
                </TableRow>
              ) : (
                <SortableContext
                  items={subcategories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {subcategories.map((sub) => (
                    <SortableRow
                      key={sub.id}
                      subcategory={sub}
                      parentCategories={parentCategories}
                      onDelete={(id) => setDeleteTarget(id)}
                      onEdit={(item) => {
                        setEditingSubcategory(item);
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
        title="Delete Subcategory"
        description="Are you sure? This might affect products categorized in this subcategory. This action cannot be undone."
        confirmLabel="Delete Subcategory"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
};

export default AdminSubcategories;
