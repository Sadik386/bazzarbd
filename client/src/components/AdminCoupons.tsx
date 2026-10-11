import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Percent, Tag } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_type: "fixed",
    discount_value: 0,
    min_purchase: 0,
    expiry_date: "",
  });

  const fetchCoupons = async () => {
    try {
      const data = await api.get("/coupons");
      setCoupons(data);
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch coupons", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/coupons", newCoupon);
      toast({ title: "Success", description: "Coupon created successfully" });
      setNewCoupon({ code: "", discount_type: "fixed", discount_value: 0, min_purchase: 0, expiry_date: "" });
      fetchCoupons();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || "Failed to create coupon", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/coupons/${id}`);
      toast({ title: "Deleted", description: "Coupon removed" });
      fetchCoupons();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete coupon", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-6 bg-primary/5 rounded-2xl items-end border border-primary/10">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest">Code</Label>
          <Input 
            placeholder="EID2024" 
            value={newCoupon.code} 
            onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
            className="uppercase"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest">Type</Label>
          <select 
            className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm"
            value={newCoupon.discount_type}
            onChange={(e) => setNewCoupon({...newCoupon, discount_type: e.target.value})}
          >
            <option value="fixed">Fixed (৳)</option>
            <option value="percentage">Percentage (%)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest">Value</Label>
          <Input 
            type="number" 
            value={newCoupon.discount_value} 
            onChange={(e) => setNewCoupon({...newCoupon, discount_value: Number(e.target.value)})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest">Expiry</Label>
          <Input 
            type="date" 
            value={newCoupon.expiry_date} 
            onChange={(e) => setNewCoupon({...newCoupon, expiry_date: e.target.value})}
            required
          />
        </div>
        <Button type="submit" className="w-full gap-2">
          <Plus className="w-4 h-4" /> Create
        </Button>
      </form>

      <div className="rounded-xl border border-border/20 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">Code</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Discount</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Usage</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Expiry</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon._id}>
                <TableCell className="font-bold">{coupon.code}</TableCell>
                <TableCell>
                  {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `৳${coupon.discount_value}`}
                </TableCell>
                <TableCell>{coupon.used_count} / {coupon.usage_limit || "∞"}</TableCell>
                <TableCell>{new Date(coupon.expiry_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(coupon._id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Coupon"
        description="Are you sure you want to delete this coupon? This action cannot be undone."
        confirmLabel="Delete Coupon"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
};

export default AdminCoupons;
