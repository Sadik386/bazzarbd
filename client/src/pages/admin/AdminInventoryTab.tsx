import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, downloadBlob } from "@/lib/api";
import { formatBDT } from "@/lib/format";
import type { InventoryForecast, InventoryItem, InventorySummary } from "@/types";

export function AdminInventoryTab() {
  const queryClient = useQueryClient();
  const [riskFilter, setRiskFilter] = useState("all");
  const [leadTimeDays, setLeadTimeDays] = useState("7");
  const [forecast, setForecast] = useState<InventoryForecast | null>(null);
  const [forecasting, setForecasting] = useState(false);

  const { data: summary } = useQuery<InventorySummary>({
    queryKey: ["inventory-summary", leadTimeDays],
    queryFn: () => api.get(`/admin/inventory/summary?leadTimeDays=${leadTimeDays}`),
  });

  const { data: analytics } = useQuery<{ items: InventoryItem[] }>({
    queryKey: ["inventory-analytics", riskFilter, leadTimeDays],
    queryFn: () =>
      api.get(
        `/admin/inventory/analytics?limit=100&status=${riskFilter}&leadTimeDays=${leadTimeDays}`
      ),
  });

  const handleAdjustStock = async (productId: string, variantId: string, newStock: number) => {
    try {
      await api.put("/admin/inventory/stock-adjust", { productId, variantId, newStock });
      toast.success("Variant stock updated");
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-analytics"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update stock");
    }
  };

  const handleExportRestock = async () => {
    try {
      const blob = await api.getBlob(`/admin/inventory/export-restock?leadTimeDays=${leadTimeDays}`);
      downloadBlob(blob, `restock-plan-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Restock sheet downloaded");
    } catch {
      toast.error("Failed to download restock CSV");
    }
  };

  const handleGenerateForecast = async () => {
    setForecasting(true);
    try {
      const res = await api.post<InventoryForecast>("/admin/inventory/ai-forecast");
      setForecast(res);
      toast.success("AI demand forecast generated");
    } catch {
      toast.error("Could not generate AI forecast");
    } finally {
      setForecasting(false);
    }
  };

  const riskBadge = (risk: InventoryItem["stockout_risk"]) => {
    if (risk === "OUT_OF_STOCK" || risk === "CRITICAL") return "destructive";
    if (risk === "MODERATE" || risk === "DEAD_STOCK") return "warning";
    if (risk === "HEALTHY") return "success";
    return "secondary";
  };

  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.category_name}</p>
        </div>
      ),
    },
    {
      accessorKey: "total_stock",
      header: "Stock / Variants",
      cell: ({ row }) => (
        <div className="space-y-1.5">
          <span className="tabular-price font-medium">{row.original.total_stock} units</span>
          <div className="flex flex-wrap gap-1.5">
            {row.original.variant_analysis.map((v) => (
              <div key={v.variant_id} className="inline-flex items-center gap-1 rounded border border-border bg-secondary/50 px-1.5 py-0.5 text-[11px]">
                <span>{v.variant_name}:</span>
                <Input
                  type="number"
                  defaultValue={v.stock_level}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (!Number.isNaN(val) && val !== v.stock_level) {
                      handleAdjustStock(row.original.id, v.variant_id, val);
                    }
                  }}
                  className="h-5 w-12 px-1 py-0 text-center text-[11px]"
                />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "daily_velocity",
      header: "Velocity (30d)",
      cell: ({ row }) => (
        <span className="tabular-price text-xs">
          {row.original.sold_30d} sold ({row.original.daily_velocity}/day)
        </span>
      ),
    },
    {
      accessorKey: "stockout_risk",
      header: "Health",
      cell: ({ row }) => (
        <Badge variant={riskBadge(row.original.stockout_risk)}>
          {row.original.stockout_risk.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "recommended_reorder_qty",
      header: "Reorder Qty",
      cell: ({ row }) => (
        <span className="tabular-price font-medium">
          {row.original.needs_reorder ? `+${row.original.recommended_reorder_qty}` : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Inventory Capital</CardTitle></CardHeader>
            <CardContent className="tabular-price text-2xl font-semibold">{formatBDT(summary.totalInventoryValue)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Urgent Stockouts</CardTitle></CardHeader>
            <CardContent className="tabular-price text-2xl font-semibold text-destructive">
              {summary.outOfStockCount + summary.criticalStockCount}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Restock Queue</CardTitle></CardHeader>
            <CardContent className="tabular-price text-2xl font-semibold">{summary.totalRestockUnits} units</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Dead Stock Capital</CardTitle></CardHeader>
            <CardContent className="tabular-price text-2xl font-semibold text-warning">{formatBDT(summary.deadStockCapital)}</CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="h-9 w-[170px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All health states</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of stock</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="MODERATE">Moderate</SelectItem>
              <SelectItem value="HEALTHY">Healthy</SelectItem>
              <SelectItem value="OVERSTOCKED">Overstocked</SelectItem>
              <SelectItem value="DEAD_STOCK">Dead stock</SelectItem>
            </SelectContent>
          </Select>

          <Select value={leadTimeDays} onValueChange={setLeadTimeDays}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7-day lead time</SelectItem>
              <SelectItem value="14">14-day lead time</SelectItem>
              <SelectItem value="21">21-day lead time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportRestock} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Restock CSV
          </Button>
          <Button size="sm" onClick={handleGenerateForecast} isLoading={forecasting} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            AI Demand Forecast
          </Button>
        </div>
      </div>

      {forecast && (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Strategic Demand Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-1">
              {forecast.highlights.map((h, i) => (
                <li key={i} className="text-foreground">• {h}</li>
              ))}
            </ul>
            <div className="grid gap-3 pt-2 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-semibold text-foreground">Seasonal Advice</p>
                <p className="mt-1 text-xs text-muted-foreground">{forecast.seasonal_advice}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-semibold text-foreground">Restock Strategy</p>
                <p className="mt-1 text-xs text-muted-foreground">{forecast.restock_strategy}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-semibold text-foreground">Clearance Strategy</p>
                <p className="mt-1 text-xs text-muted-foreground">{forecast.clearance_strategy}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={analytics?.items || []}
        searchPlaceholder="Search inventory..."
      />
    </div>
  );
}
