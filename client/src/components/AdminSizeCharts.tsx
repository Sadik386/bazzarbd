import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, X, Ruler } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "./ConfirmDialog";

interface SizeRow {
  size: string;
  values_inch: string[];
  values_cm: string[];
}

interface SizeChart {
  id?: string;
  _id?: string;
  name: string;
  columns: string[];
  rows: SizeRow[];
  deviation_note: string;
}

const AdminSizeCharts = () => {
  const [charts, setCharts] = useState<SizeChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingChart, setEditingChart] = useState<SizeChart | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [previewUnit, setPreviewUnit] = useState<"inch" | "cm">("inch");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDeviation, setFormDeviation] = useState("Expected Deviation < 3%");
  const [formColumns, setFormColumns] = useState<string[]>(["Chest Round", "Length", "Sleeve"]);
  const [formRows, setFormRows] = useState<SizeRow[]>([
    { size: "M", values_inch: ["", "", ""], values_cm: ["", "", ""] },
  ]);

  const fetchCharts = async () => {
    try {
      setLoading(true);
      const data = await api.get<SizeChart[]>("/admin/size-charts");
      setCharts(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load size charts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharts();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormDeviation("Expected Deviation < 3%");
    setFormColumns(["Chest Round", "Length", "Sleeve"]);
    setFormRows([{ size: "M", values_inch: ["", "", ""], values_cm: ["", "", ""] }]);
  };

  const startEditing = (chart: SizeChart) => {
    setEditingChart(chart);
    setFormName(chart.name);
    setFormDeviation(chart.deviation_note || "Expected Deviation < 3%");
    // Columns in the DB include "Size" as the first column, but we manage it separately
    const cols = chart.columns.length > 0 && chart.columns[0] === "Size" 
      ? chart.columns.slice(1) 
      : chart.columns;
    setFormColumns(cols);
    setFormRows(chart.rows.map(r => ({
      size: r.size,
      values_inch: [...r.values_inch],
      values_cm: [...r.values_cm],
    })));
    setIsAdding(false);
  };

  const startAdding = () => {
    resetForm();
    setEditingChart(null);
    setIsAdding(true);
  };

  const addColumn = () => {
    setFormColumns([...formColumns, ""]);
    setFormRows(formRows.map(r => ({
      ...r,
      values_inch: [...r.values_inch, ""],
      values_cm: [...r.values_cm, ""],
    })));
  };

  const removeColumn = (colIdx: number) => {
    if (formColumns.length <= 1) return;
    setFormColumns(formColumns.filter((_, i) => i !== colIdx));
    setFormRows(formRows.map(r => ({
      ...r,
      values_inch: r.values_inch.filter((_, i) => i !== colIdx),
      values_cm: r.values_cm.filter((_, i) => i !== colIdx),
    })));
  };

  const updateColumn = (colIdx: number, value: string) => {
    const newCols = [...formColumns];
    newCols[colIdx] = value;
    setFormColumns(newCols);
  };

  const addRow = () => {
    setFormRows([...formRows, {
      size: "",
      values_inch: formColumns.map(() => ""),
      values_cm: formColumns.map(() => ""),
    }]);
  };

  const removeRow = (rowIdx: number) => {
    if (formRows.length <= 1) return;
    setFormRows(formRows.filter((_, i) => i !== rowIdx));
  };

  const updateRowSize = (rowIdx: number, value: string) => {
    const newRows = [...formRows];
    newRows[rowIdx] = { ...newRows[rowIdx], size: value };
    setFormRows(newRows);
  };

  const updateRowValue = (rowIdx: number, colIdx: number, unit: "inch" | "cm", value: string) => {
    const newRows = [...formRows];
    const row = { ...newRows[rowIdx] };
    if (unit === "inch") {
      const arr = [...row.values_inch];
      arr[colIdx] = value;
      row.values_inch = arr;
    } else {
      const arr = [...row.values_cm];
      arr[colIdx] = value;
      row.values_cm = arr;
    }
    newRows[rowIdx] = row;
    setFormRows(newRows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return toast.error("Please enter a chart name");
    if (formColumns.some(c => !c.trim())) return toast.error("All column headers must be filled");
    if (formRows.some(r => !r.size.trim())) return toast.error("All size names must be filled");

    const payload = {
      name: formName.trim(),
      columns: ["Size", ...formColumns.map(c => c.trim())],
      rows: formRows.map(r => ({
        size: r.size.trim(),
        values_inch: r.values_inch,
        values_cm: r.values_cm,
      })),
      deviation_note: formDeviation.trim(),
    };

    try {
      if (editingChart) {
        await api.put(`/admin/size-charts/${editingChart.id || editingChart._id}`, payload);
        toast.success("Size chart updated successfully");
        setEditingChart(null);
      } else {
        await api.post("/admin/size-charts", payload);
        toast.success("Size chart created successfully");
        setIsAdding(false);
      }
      resetForm();
      fetchCharts();
    } catch (error: any) {
      toast.error(error.message || "Failed to save size chart");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/size-charts/${id}`);
      toast.success("Size chart deleted");
      fetchCharts();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete size chart");
    } finally {
      setDeleteTarget(null);
    }
  };

  const isFormOpen = isAdding || !!editingChart;

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        {!isFormOpen && (
          <Button onClick={startAdding} className="gap-2">
            <Plus className="w-4 h-4" /> Add Size Chart
          </Button>
        )}
      </div>

      {isFormOpen && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>{editingChart ? `Edit: ${editingChart.name}` : "Create New Size Chart"}</CardTitle>
            <CardDescription>
              Define the measurement columns and fill in INCH and CM values for each size.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chart Name (e.g. Shirt, Pant, Cap)</Label>
                  <Input
                    placeholder="e.g. Shirt"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deviation Note</Label>
                  <Input
                    placeholder="e.g. Expected Deviation < 3%"
                    value={formDeviation}
                    onChange={(e) => setFormDeviation(e.target.value)}
                  />
                </div>
              </div>

              {/* Column Headers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Measurement Columns
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addColumn} className="gap-1">
                    <Plus className="w-3 h-3" /> Add Column
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                    Size (auto)
                  </div>
                  {formColumns.map((col, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Input
                        className="w-36 h-9 text-xs"
                        placeholder={`Column ${i + 2}`}
                        value={col}
                        onChange={(e) => updateColumn(i, e.target.value)}
                      />
                      {formColumns.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeColumn(i)}
                          className="h-8 w-8 text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Size Rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Size Rows (INCH & CM)
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1">
                    <Plus className="w-3 h-3" /> Add Size
                  </Button>
                </div>
                
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-left text-xs font-bold tracking-wider text-muted-foreground w-20">Size</th>
                        {formColumns.map((col, i) => (
                          <th key={i} className="px-3 py-2 text-center text-xs font-bold tracking-wider text-muted-foreground" colSpan={2}>
                            {col || `Column ${i + 2}`}
                            <div className="flex justify-center gap-1 mt-1">
                              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">INCH</span>
                              <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">CM</span>
                            </div>
                          </th>
                        ))}
                        <th className="px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-border/50 last:border-0">
                          <td className="px-3 py-2">
                            <Input
                              className="w-16 h-8 text-xs font-bold text-center"
                              placeholder="M"
                              value={row.size}
                              onChange={(e) => updateRowSize(rowIdx, e.target.value)}
                            />
                          </td>
                          {formColumns.map((_, colIdx) => (
                            <td key={colIdx} className="px-1 py-2" colSpan={2}>
                              <div className="flex gap-1">
                                <Input
                                  className="w-16 h-8 text-xs text-center"
                                  placeholder="Inch"
                                  value={row.values_inch[colIdx] || ""}
                                  onChange={(e) => updateRowValue(rowIdx, colIdx, "inch", e.target.value)}
                                />
                                <Input
                                  className="w-16 h-8 text-xs text-center bg-blue-500/5 border-blue-500/20"
                                  placeholder="CM"
                                  value={row.values_cm[colIdx] || ""}
                                  onChange={(e) => updateRowValue(rowIdx, colIdx, "cm", e.target.value)}
                                />
                              </div>
                            </td>
                          ))}
                          <td className="px-2 py-2">
                            {formRows.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeRow(rowIdx)}
                                className="h-7 w-7 text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Live Preview */}
              {formRows.length > 0 && formRows[0].size && (
                <div className="space-y-3 border-t border-border/40 pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                      Live Preview
                    </Label>
                    <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setPreviewUnit("inch")}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${previewUnit === "inch" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                      >
                        INCH
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewUnit("cm")}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${previewUnit === "cm" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                      >
                        CM
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Size chart - In {previewUnit === "inch" ? "inches" : "centimeters"} ({formDeviation})
                  </p>
                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="px-4 py-3 text-left text-xs font-bold">Size</th>
                          {formColumns.map((col, i) => (
                            <th key={i} className="px-4 py-3 text-left text-xs font-bold">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {formRows.filter(r => r.size).map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-secondary/20" : ""}>
                            <td className="px-4 py-3 font-medium text-sm">{row.size}</td>
                            {(previewUnit === "inch" ? row.values_inch : row.values_cm).map((v, j) => (
                              <td key={j} className="px-4 py-3 text-sm text-muted-foreground">{v || "—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingChart(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingChart ? "Update Size Chart" : "Save Size Chart"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Size Charts List */}
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Columns</TableHead>
              <TableHead>Sizes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">Loading size charts...</TableCell>
              </TableRow>
            ) : charts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  No size charts created yet. Add your first one above.
                </TableCell>
              </TableRow>
            ) : (
              charts.map((chart) => (
                <TableRow key={chart.id || chart._id}>
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-primary" />
                      {chart.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {chart.columns.join(", ")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {chart.rows.map((r, i) => (
                        <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                          {r.size}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(chart)}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(chart.id || chart._id || "")}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                      >
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Size Chart"
        description="Are you sure? Products using this chart will have their size chart unlinked. This action cannot be undone."
        confirmLabel="Delete Size Chart"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
};

export default AdminSizeCharts;
