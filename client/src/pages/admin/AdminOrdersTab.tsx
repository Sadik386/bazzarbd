import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Download, FileDown, PhoneCall, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, downloadBlob } from "@/lib/api";
import {
  formatBDT,
  formatDate,
  formatShippingAddress,
  getId,
  shortOrderCode,
} from "@/lib/format";
import type { Order } from "@/types";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export function AdminOrdersTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dispatchOrder, setDispatchOrder] = useState<{
    order: Order;
    courier: "steadfast" | "pathao";
  } | null>(null);
  const [courierNote, setCourierNote] = useState("");
  const [pathaoStoreId, setPathaoStoreId] = useState("");
  const [codOverride, setCodOverride] = useState("");
  const [shippingSubmitting, setShippingSubmitting] = useState(false);

  const [lookupData, setLookupData] = useState<{
    phone: string;
    totalOrders: number;
    successfulOrders: number;
  } | null>(null);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "all") qs.set("status", statusFilter);
      const res = await api.get<{ orders: Order[] }>(`/admin/orders?${qs.toString()}`);
      return res.orders || [];
    },
  });

  const { data: pathaoStores = [] } = useQuery<Array<{ store_id: number; store_name: string }>>({
    queryKey: ["pathao-stores"],
    queryFn: async () => {
      try {
        return await api.get("/admin/pathao/stores");
      } catch {
        return [];
      }
    },
  });

  const handleStatusChange = async (order: Order, nextStatus: string) => {
    const id = getId(order);
    try {
      await api.put(`/admin/orders/${id}`, {
        status: nextStatus,
        tracking_id: order.tracking_id,
        courier_name: order.courier_name,
      });
      toast.success(`Order #${shortOrderCode(id)} marked ${nextStatus}`);
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order");
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await api.getBlob("/admin/export/orders");
      downloadBlob(blob, `orders-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Orders CSV exported");
    } catch {
      toast.error("Failed to export orders CSV");
    }
  };

  const handleInvoice = async (orderId: string) => {
    try {
      const blob = await api.getBlob(`/invoices/${orderId}`);
      downloadBlob(blob, `invoice-${shortOrderCode(orderId)}.pdf`);
    } catch {
      toast.error("Could not download PDF invoice");
    }
  };

  const handlePhoneLookup = async (phone: string) => {
    try {
      const res = await api.get<{
        phone: string;
        totalOrders: number;
        successfulOrders: number;
      }>(`/admin/orders/lookup/${encodeURIComponent(phone)}`);
      setLookupData(res);
    } catch {
      toast.error("Phone lookup failed");
    }
  };

  const handleDispatchCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder) return;
    const oid = getId(dispatchOrder.order);
    setShippingSubmitting(true);
    try {
      if (dispatchOrder.courier === "steadfast") {
        await api.post(`/admin/orders/${oid}/ship-steadfast`, {
          note: courierNote || undefined,
          cod_amount: codOverride ? Number(codOverride) : undefined,
        });
        toast.success("Dispatched via Steadfast Courier");
      } else {
        await api.post(`/admin/orders/${oid}/ship-pathao`, {
          store_id: pathaoStoreId ? Number(pathaoStoreId) : undefined,
          special_instruction: courierNote || undefined,
          cod_amount: codOverride ? Number(codOverride) : undefined,
        });
        toast.success("Dispatched via Pathao Courier");
      }
      setDispatchOrder(null);
      setCourierNote("");
      setCodOverride("");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Courier dispatch failed");
    } finally {
      setShippingSubmitting(false);
    }
  };

  const columns: ColumnDef<Order>[] = [
    {
      id: "code",
      header: "Order",
      accessorFn: (row) => shortOrderCode(getId(row)),
      cell: ({ row }) => (
        <div>
          <p className="tabular-price font-medium text-foreground">
            #{shortOrderCode(getId(row.original))}
          </p>
          <p className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</p>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer & Address",
      accessorFn: (row) => `${row.phone_number} ${formatShippingAddress(row.shipping_address)}`,
      cell: ({ row }) => (
        <div className="max-w-[240px] space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="tabular-price text-xs font-medium">{row.original.phone_number}</span>
            <button
              type="button"
              onClick={() => handlePhoneLookup(row.original.phone_number)}
              title="Check customer order history"
              className="text-primary hover:underline"
            >
              <PhoneCall className="h-3 w-3" />
            </button>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {formatShippingAddress(row.original.shipping_address)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Total",
      cell: ({ row }) => (
        <div>
          <p className="tabular-price font-medium">{formatBDT(row.original.total_amount)}</p>
          <p className="text-[11px] uppercase text-muted-foreground">
            {row.original.payment_method === "cash_on_delivery" ? "COD" : "Online"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Select
          value={row.original.status}
          onValueChange={(val) => handleStatusChange(row.original, val)}
        >
          <SelectTrigger className="h-8 w-[132px] text-xs capitalize">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      id: "courier",
      header: "Courier Dispatch",
      cell: ({ row }) => {
        const o = row.original;
        if (o.courier_name && o.tracking_id) {
          return (
            <div className="text-xs">
              <Badge variant="success">{o.courier_name}</Badge>
              <p className="tabular-price mt-1 text-muted-foreground">{o.tracking_id}</p>
            </div>
          );
        }
        return (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCodOverride(
                  o.payment_method === "cash_on_delivery" ? String(Math.round(o.total_amount)) : "0"
                );
                setDispatchOrder({ order: o, courier: "steadfast" });
              }}
              className="h-7 px-2 text-xs"
            >
              <Truck className="h-3 w-3" />
              Steadfast
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCodOverride(
                  o.payment_method === "cash_on_delivery" ? String(Math.round(o.total_amount)) : "0"
                );
                setDispatchOrder({ order: o, courier: "pathao" });
              }}
              className="h-7 px-2 text-xs"
            >
              Pathao
            </Button>
          </div>
        );
      },
    },
    {
      id: "invoice",
      header: "",
      cell: ({ row }) => (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => handleInvoice(getId(row.original))}
          title="Download PDF invoice"
        >
          <FileDown className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
        </div>

        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <DataTable columns={columns} data={orders} searchPlaceholder="Search by ID, phone, address..." />

      {/* Courier Dispatch Modal */}
      <Dialog open={Boolean(dispatchOrder)} onOpenChange={(o) => !o && setDispatchOrder(null)}>
        <DialogContent>
          {dispatchOrder && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Dispatch via {dispatchOrder.courier === "steadfast" ? "Steadfast" : "Pathao"}
                </DialogTitle>
                <DialogDescription>
                  Order #{shortOrderCode(getId(dispatchOrder.order))} · {dispatchOrder.order.phone_number}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleDispatchCourier} className="space-y-4">
                {dispatchOrder.courier === "pathao" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="pathao-store">Pathao Store</Label>
                    {pathaoStores.length > 0 ? (
                      <Select value={pathaoStoreId} onValueChange={setPathaoStoreId}>
                        <SelectTrigger id="pathao-store">
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                        <SelectContent>
                          {pathaoStores.map((st) => (
                            <SelectItem key={st.store_id} value={String(st.store_id)}>
                              {st.store_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="pathao-store"
                        value={pathaoStoreId}
                        onChange={(e) => setPathaoStoreId(e.target.value)}
                        placeholder="Pathao Store ID"
                      />
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="cod-override">COD Amount (BDT)</Label>
                  <Input
                    id="cod-override"
                    type="number"
                    value={codOverride}
                    onChange={(e) => setCodOverride(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="courier-note">Delivery instruction</Label>
                  <Input
                    id="courier-note"
                    value={courierNote}
                    onChange={(e) => setCourierNote(e.target.value)}
                    placeholder="Handle with care"
                  />
                </div>

                <Button type="submit" className="w-full" isLoading={shippingSubmitting}>
                  Confirm courier booking
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Phone Reliability Modal */}
      <Dialog open={Boolean(lookupData)} onOpenChange={(o) => !o && setLookupData(null)}>
        <DialogContent className="max-w-sm">
          {lookupData && (
            <>
              <DialogHeader>
                <DialogTitle>Customer History</DialogTitle>
                <DialogDescription>{lookupData.phone}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <p className="tabular-price text-2xl font-semibold">{lookupData.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Total orders</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <p className="tabular-price text-2xl font-semibold text-success">
                    {lookupData.successfulOrders}
                  </p>
                  <p className="text-xs text-muted-foreground">Successful</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
