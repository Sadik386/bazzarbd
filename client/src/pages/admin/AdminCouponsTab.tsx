import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatBDT, formatDate, getId } from "@/lib/format";
import type { Coupon } from "@/types";

export function AdminCouponsTab() {
  const queryClient = useQueryClient();
  const { data: coupons = [] } = useQuery<Coupon[]>({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const res = await api.get<Coupon[] | { coupons: Coupon[] }>("/coupons");
      return Array.isArray(res) ? res : res.coupons || [];
    },
  });

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("10");
  const [minPurchase, setMinPurchase] = useState("500");
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date(Date.now() + 30 * 86400_000);
    return d.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/coupons", {
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_purchase: Number(minPurchase) || 0,
        expiry_date: new Date(expiryDate).toISOString(),
        is_active: true,
      });
      toast.success("Coupon created");
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/coupons/${id}`);
      toast.success("Coupon deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch {
      toast.error("Could not delete coupon");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Create Promo Code</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cp-code">Code</Label>
              <Input
                id="cp-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="DHAKA15"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={discountType}
                  onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (BDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-val">Value</Label>
                <Input
                  id="cp-val"
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cp-min">Min order (BDT)</Label>
                <Input
                  id="cp-min"
                  type="number"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-exp">Expiry date</Label>
                <Input
                  id="cp-exp"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full gap-1.5" isLoading={saving}>
              <Plus className="h-4 w-4" />
              Create coupon
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle>Configured Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No promo codes yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {coupons.map((c) => (
                <li key={getId(c)} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-foreground">{c.code}</span>
                      <Badge variant={c.is_active ? "success" : "secondary"}>
                        {c.discount_type === "percentage"
                          ? `${c.discount_value}% off`
                          : `${formatBDT(c.discount_value)} off`}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Min {formatBDT(c.min_purchase || 0)} · Expires {formatDate(c.expiry_date)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(getId(c))}
                    aria-label="Delete coupon"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
