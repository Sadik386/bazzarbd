import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, downloadBlob } from "@/lib/api";
import { formatBDT, formatDate, getId, shortOrderCode } from "@/lib/format";
import { useAuthStore } from "@/stores/authStore";
import type { Order, PaginationInfo } from "@/types";

export function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ orders: Order[]; pagination: PaginationInfo }>({
    queryKey: ["my-orders", page],
    enabled: Boolean(user),
    queryFn: () => api.get(`/orders/my-orders?page=${page}&limit=8`),
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
        <h1 className="font-display text-4xl text-foreground">Sign in to view orders</h1>
        <p className="text-sm text-muted-foreground">
          Or use public order tracking with your Order ID and phone number.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/track">Track an order</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleInvoice = async (orderId: string) => {
    try {
      const blob = await api.getBlob(`/invoices/${orderId}`);
      downloadBlob(blob, `invoice-${shortOrderCode(orderId)}.pdf`);
      toast.success("Invoice downloaded");
    } catch {
      toast.error("Could not download invoice");
    }
  };

  const orders = data?.orders || [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6">
      <div className="border-b border-border pb-5">
        <h1 className="font-display text-4xl text-foreground">Order History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review previous dispatches and download official PDF invoices.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <Package className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="font-display text-2xl">No orders placed yet</h2>
          <p className="text-sm text-muted-foreground">
            Your confirmed orders and invoices will appear here.
          </p>
          <Button asChild className="mt-2">
            <Link to="/products">Explore collection</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const oid = getId(order);
            return (
              <div key={oid} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="tabular-price font-semibold text-foreground">
                      #{shortOrderCode(oid)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.created_at || order.createdAt)}
                    </span>
                    <Badge variant={order.status === "cancelled" ? "destructive" : "default"} className="capitalize">
                      {order.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="tabular-price text-base font-semibold text-foreground">
                      {formatBDT(order.total_amount)}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleInvoice(oid)} className="gap-1.5">
                      <FileDown className="h-3.5 w-3.5" />
                      Invoice
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/order/${oid}`}>Details</Link>
                    </Button>
                  </div>
                </div>

                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {(order.order_items || []).map((item, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>
                        {item.products?.name || item.product_name || "Item"} ·{" "}
                        {item.product_variants?.variant_name || item.variant_name} × {item.quantity}
                      </span>
                      <span className="tabular-price text-foreground">
                        {formatBDT(item.unit_price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="tabular-price text-xs text-muted-foreground">
                Page {page} of {data.pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
