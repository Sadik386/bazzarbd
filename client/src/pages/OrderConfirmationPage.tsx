import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, Copy, FileDown } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, downloadBlob } from "@/lib/api";
import { formatBDT, formatDate, formatShippingAddress, shortOrderCode } from "@/lib/format";
import type { Order } from "@/types";

export function OrderConfirmationPage() {
  const { orderId, id } = useParams<{ orderId?: string; id?: string }>();
  const resolvedId = orderId || id;
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ["order", resolvedId],
    enabled: Boolean(resolvedId),
    queryFn: () => api.get<Order>(`/orders/${resolvedId}`),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-16">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center space-y-4">
        <h1 className="font-display text-4xl text-foreground">Order not found</h1>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Could not load this order confirmation."}
        </p>
        <Button asChild>
          <Link to="/track">Track by Order ID</Link>
        </Button>
      </div>
    );
  }

  const refCode = `#${shortOrderCode(order.id || order._id || resolvedId)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(refCode);
    setCopied(true);
    toast.success("Order reference copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadInvoice = async () => {
    if (!resolvedId) return;
    setDownloading(true);
    try {
      const blob = await api.getBlob(`/invoices/${resolvedId}`);
      downloadBlob(blob, `invoice-${shortOrderCode(resolvedId)}.pdf`);
      toast.success("Invoice PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download invoice");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span>Order confirmed</span>
            </div>
            <h1 className="font-display text-4xl text-foreground">Thank you for your order</h1>
            <p className="text-sm text-muted-foreground">
              Placed on {formatDate(order.created_at || order.createdAt)} · Save your reference code to track delivery.
            </p>
          </div>
          <Badge variant="default" className="capitalize">
            {order.status}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Order reference</p>
            <p className="tabular-price text-lg font-semibold text-foreground">{refCode}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy ID"}
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadInvoice}
              isLoading={downloading}
              className="gap-1.5"
            >
              <FileDown className="h-3.5 w-3.5" />
              PDF Invoice
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Items</p>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {(order.order_items || []).map((item, idx) => (
              <li key={item.id || item._id || idx} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">
                    {item.products?.name || item.product_name || "Garment"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.product_variants?.variant_name || item.variant_name || "Standard"} × {item.quantity}
                  </p>
                </div>
                <span className="tabular-price font-medium">
                  {formatBDT(item.unit_price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Shipping destination</p>
            <p className="mt-1 text-foreground">{formatShippingAddress(order.shipping_address)}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-muted-foreground">Total amount</p>
            <p className="tabular-price mt-1 text-2xl font-semibold text-foreground">
              {formatBDT(order.total_amount)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-border pt-5">
          <Button variant="outline" asChild>
            <Link to="/track">Track parcel status</Link>
          </Button>
          <Button asChild>
            <Link to="/products">Continue browsing</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
