import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { getId } from "@/lib/format";
import type { SizeChart } from "@/types";

export function AdminSizeChartsTab() {
  const queryClient = useQueryClient();
  const { data: charts = [] } = useQuery<SizeChart[]>({
    queryKey: ["admin-size-charts"],
    queryFn: () => api.get("/admin/size-charts"),
  });

  const [name, setName] = useState("");
  const [columnsInput, setColumnsInput] = useState("Size, Chest, Length");
  const [rowsInput, setRowsInput] = useState("M | 40, 27 | 101.6, 68.5\nL | 42, 28 | 106.7, 71.1");
  const [deviationNote, setDeviationNote] = useState("Expected Deviation < 3%");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const columns = columnsInput
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const rows = rowsInput
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const [sizePart, inchPart = "", cmPart = ""] = line.split("|").map((s) => s.trim());
          return {
            size: sizePart,
            values_inch: inchPart.split(",").map((s) => s.trim()).filter(Boolean),
            values_cm: cmPart.split(",").map((s) => s.trim()).filter(Boolean),
          };
        });

      await api.post("/admin/size-charts", {
        name: name.trim(),
        columns,
        rows,
        deviation_note: deviationNote.trim(),
      });
      toast.success("Size chart created");
      setName("");
      queryClient.invalidateQueries({ queryKey: ["admin-size-charts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save size chart");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/size-charts/${id}`);
      toast.success("Size chart deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-size-charts"] });
    } catch {
      toast.error("Could not delete size chart");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>New Size Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sc-name">Chart name</Label>
              <Input
                id="sc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Oversized Tee"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sc-cols">Columns (comma separated)</Label>
              <Input
                id="sc-cols"
                value={columnsInput}
                onChange={(e) => setColumnsInput(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sc-rows">Rows (Size | inch values | cm values)</Label>
              <textarea
                id="sc-rows"
                rows={4}
                value={rowsInput}
                onChange={(e) => setRowsInput(e.target.value)}
                className="w-full rounded-lg border border-input bg-card p-3 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sc-note">Deviation note</Label>
              <Input
                id="sc-note"
                value={deviationNote}
                onChange={(e) => setDeviationNote(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full gap-1.5" isLoading={saving}>
              <Plus className="h-4 w-4" />
              Save size chart
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4 lg:col-span-7">
        {charts.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No size charts configured yet.
          </Card>
        ) : (
          charts.map((sc) => (
            <Card key={getId(sc)}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>{sc.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{sc.deviation_note}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(getId(sc))}
                  aria-label="Delete size chart"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      {sc.columns.map((c, idx) => (
                        <th key={idx} className="py-2 pr-4 font-medium">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sc.rows.map((r, rIdx) => (
                      <tr key={rIdx}>
                        <td className="py-2 pr-4 font-medium">{r.size}</td>
                        {r.values_inch.map((v, vIdx) => (
                          <td key={vIdx} className="tabular-price py-2 pr-4 text-muted-foreground">
                            {v}″ ({r.values_cm[vIdx] || "—"} cm)
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
