import { useState } from "react";
import { CheckCircle2, PackageCheck, Search, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatBDT, formatDate, formatShippingAddress, shortOrderCode } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

const STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;

export function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<Order>("/orders/track", {
        orderId: orderId.trim().replace(/^ORD-/i, ""),
        contact: contact.trim(),
      });
      setOrder(res);
    } catch (err) {
      setOrder(null);
      toast.error(err instanceof Error ? err.message : "Could not locate order");
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = order
    ? STEPS.indexOf((order.status?.toLowerCase() as (typeof STEPS)[number]) || "pending")
    : -1;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12 sm:px-6">
      <div className="space-y-2 border-b border-border pb-6">
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">Track Your Parcel</h1>
        <p className="text-sm text-muted-foreground">
          Enter the 6-character code (or full Order ID) along with your phone number or email.
        </p>
      </div>

      <form onSubmit={handleTrack} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="track-id">Order ID / Short Code</Label>
            <Input
              id="track-id"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="e.g. A1B2C3 or 24-char ID"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="track-contact">Phone number or email</Label>
            <Input
              id="track-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="01712345678"
              required
            />
          </div>
        </div>
        <Button type="submit" isLoading={loading} className="gap-2">
          <Search className="h-4 w-4" />
          Check status
        </Button>
      </form>

      {order && (
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="text-xs text-muted-foreground">Order reference</p>
              <p className="tabular-price text-xl font-semibold text-foreground">
                #{shortOrderCode(order.id || order._id)}
              </p>
              <p className="text-xs text-muted-foreground">
                Placed {formatDate(order.created_at || order.createdAt)}
              </p>
            </div>

            <div className="text-right">
              <Badge variant={order.status === "cancelled" ? "destructive" : "success"} className="capitalize">
                {order.status}
              </Badge>
              {order.courier_name && (
                <p className="mt-1.5 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                  <Truck className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {order.courier_name}
                    {order.tracking_id ? ` · ${order.tracking_id}` : ""}
                  </span>
                </p>
              )}
            </div>
          </div>

          {order.status !== "cancelled" && (
            <div className="grid grid-cols-5 gap-2">
              {STEPS.map((step, idx) => {
                const done = idx <= currentIdx;
                return (
                  <div key={step} className="space-y-2 text-center">
                    <div
                      className={cn(
                        "mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs transition-colors",
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary text-muted-foreground"
                      )}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />}
                    </div>
                    <p className={cn("text-[11px] capitalize", done ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {step}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-4 text-sm">
            {(order.order_items || []).map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-muted-foreground">
                  {item.product_name} ({item.variant_name}) × {item.quantity}
                </span>
                <span className="tabular-price font-medium">{formatBDT(item.unit_price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-3 font-semibold text-foreground">
              <span>Total</span>
              <span className="tabular-price">{formatBDT(order.total_amount)}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Delivery address: {formatShippingAddress(order.shipping_address)}
          </p>
        </div>
      )}
    </div>
  );
}
