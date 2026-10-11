import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Eye, ExternalLink, Search, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { api, getAccessToken } from "@/lib/api";
import { cloudinaryUrl } from "@/lib/cloudinary";

const AdminOrders = ({ initialSearch = "" }: { initialSearch?: string }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [phoneSearch, setPhoneSearch] = useState("");
  const [phoneResult, setPhoneResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // View Order Details Modal State
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);

  // Courier Dispatch States
  const [dispatchOrder, setDispatchOrder] = useState<any>(null);
  const [courierType, setCourierType] = useState<"steadfast" | "pathao" | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [codAmount, setCodAmount] = useState<number>(0);

  // Pathao States
  const [pathaoStores, setPathaoStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [weight, setWeight] = useState("0.5");
  const [quantity, setQuantity] = useState("1");
  const [instructions, setInstructions] = useState("Handle with care. যদি কাস্টমার পণ্য গ্রহণ না করেন, তাহলে Pathao-এর ডেলিভারি চার্জ আপনাকে বহন করতে হবে। পণ্য ফেরত আসলেও ডেলিভারি চার্জ মওকুফ হবে না। If product is not taken by customer — delivery charge still applies.");

  useEffect(() => {
    fetchOrders();
  }, [page, perPage, statusFilter]);

  useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);

  // Fetch status counts from stats endpoint
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const data = await api.get<any>("/admin/stats");
        const counts: Record<string, number> = { all: 0 };
        (data.ordersByStatus || []).forEach((s: any) => {
          counts[s._id] = s.count;
          counts.all = (counts.all || 0) + s.count;
        });
        setStatusCounts(counts);
      } catch (e) {
        // silently fail — counts are optional
      }
    };
    fetchCounts();
  }, []);

  // Debounced server-side search: re-fetch when searchTerm changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchOrders(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchOrders = async (search?: string) => {
    try {
      setLoading(true);
      const searchParam = (search ?? searchTerm) ? `&search=${encodeURIComponent(search ?? searchTerm)}` : "";
      const statusParam = statusFilter && statusFilter !== "all" ? `&status=${statusFilter}` : "";
      const data = await api.get<any>(`/admin/orders?page=${page}&limit=${perPage}${searchParam}${statusParam}`);
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders;

  // Detect duplicate pending orders: same phone number + same calendar day
  const duplicateOrderIds = (() => {
    const keyMap = new Map<string, string[]>(); // key → [orderId, ...]
    orders.forEach((o) => {
      if (o.status !== "pending" || !o.phone_number) return;
      const day = new Date(o.createdAt).toISOString().slice(0, 10); // YYYY-MM-DD
      const key = `${o.phone_number}__${day}`;
      if (!keyMap.has(key)) keyMap.set(key, []);
      keyMap.get(key)!.push(o._id);
    });
    const ids = new Set<string>();
    keyMap.forEach((orderIds) => {
      if (orderIds.length >= 2) orderIds.forEach((id) => ids.add(id));
    });
    return ids;
  })();

  const updateOrderStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/admin/orders/${id}`, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update order status");
    }
  };
  const downloadInvoice = async (orderId: string, orderRef: string) => {
    try {
      const token = getAccessToken();
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
      const res = await fetch(`${API_URL}/invoices/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error("Failed to fetch invoice PDF");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${orderRef}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice PDF downloaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to download invoice receipt");
    }
  };




  const lookupByPhone = async () => {
    if (!phoneSearch) return;
    setLookupLoading(true);
    try {
      const data = await api.get<any>(`/admin/orders/lookup/${phoneSearch}`);
      setPhoneResult(data);
      setSearchTerm(phoneSearch); // Auto-filter the list
    } catch (error) {
      toast.error("Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  };

  // Courier Actions
  const fetchPathaoStores = async () => {
    try {
      const data = await api.get<any[]>("/admin/pathao/stores");
      setPathaoStores(data || []);
      if (data && data.length > 0) {
        setSelectedStore(data[0].store_id.toString());
      }
    } catch (e) {
      console.warn("Unable to load stores - fallback will be used");
    }
  };

  const handleSteadfastDispatch = async (orderId: string) => {
    try {
      setIsDispatching(true);
      const res = await api.post<any>(`/admin/orders/${orderId}/ship-steadfast`, {
        note: instructions,
        cod_amount: codAmount
      });
      toast.success(res.message || "Order sent to Steadfast Courier successfully!");
      setCourierType(null);
      setDispatchOrder(null);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to dispatch via Steadfast");
    } finally {
      setIsDispatching(false);
    }
  };

  const handlePathaoDispatch = async () => {
    if (!dispatchOrder) return;

    try {
      setIsDispatching(true);
      const res = await api.post<any>(`/admin/orders/${dispatchOrder._id}/ship-pathao`, {
        store_id: selectedStore ? parseInt(selectedStore) : undefined,
        item_weight: parseFloat(weight),
        item_quantity: parseInt(quantity),
        special_instruction: instructions,
        cod_amount: codAmount
      });
      toast.success(res.message || "Order sent to Pathao Courier successfully!");
      setCourierType(null);
      setDispatchOrder(null);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to dispatch via Pathao");
    } finally {
      setIsDispatching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Placed</Badge>;
      case "confirmed": return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Confirmed</Badge>;
      case "processing": return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">Processing</Badge>;
      case "shipped": return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Shipped</Badge>;
      case "delivered": return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Delivered</Badge>;
      case "cancelled": return <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">

      {/* Status Filter Pills */}
      {(() => {
        const statuses = [
          { key: "all",        label: "All",         color: "bg-muted/60 text-foreground border-border hover:bg-muted" },
          { key: "pending",    label: "Placed",      color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20" },
          { key: "confirmed",  label: "Confirmed",   color: "bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20" },
          { key: "processing", label: "Processing",  color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/20" },
          { key: "shipped",    label: "Shipped",     color: "bg-purple-500/10 text-purple-600 border-purple-500/30 hover:bg-purple-500/20" },
          { key: "delivered",  label: "Delivered",   color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20" },
          { key: "cancelled",  label: "Cancelled",   color: "bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500/20" },
        ];
        return (
          <div className="flex flex-wrap gap-2">
            {statuses.map(({ key, label, color }) => {
              const isActive = statusFilter === key;
              const count = statusCounts[key];
              return (
                <button
                  key={key}
                  id={`order-filter-${key}`}
                  onClick={() => { setStatusFilter(key); setPage(1); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "ring-2 ring-offset-1 ring-primary/50 shadow-sm " + color
                      : color
                  }`}
                >
                  {label}
                  {count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-foreground/15" : "bg-foreground/10"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search orders by ID, Name, Email, or Tracking..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto items-center bg-muted/50 p-1 rounded-lg border border-border">
          <Input 
            placeholder="Lookup by Phone..." 
            className="h-8 w-40 text-xs"
            value={phoneSearch}
            onChange={(e) => setPhoneSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookupByPhone()}
          />
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-8 text-xs px-3" 
            onClick={lookupByPhone}
            disabled={lookupLoading}
          >
            {lookupLoading ? "..." : "Check"}
          </Button>
          {phoneResult && (
            <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-right-2 duration-300">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                {phoneResult.successfulOrders} Successful
              </Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {setPhoneResult(null); setPhoneSearch("");}}>
                <span className="text-[10px]">×</span>
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="rounded-md border border-border bg-card">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice / Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10">Loading orders...</TableCell>
            </TableRow>
          ) : filteredOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                {searchTerm ? "No orders found matching your search" : "No orders found"}
              </TableCell>
            </TableRow>
          ) : (
            filteredOrders.map((order) => {
              const isDuplicate = duplicateOrderIds.has(order._id);
              return (
              <TableRow key={order._id} className={isDuplicate ? "border-l-2 border-l-amber-500 bg-amber-500/[0.04]" : ""}>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-foreground">INV-{order._id.slice(0, 8).toUpperCase()}</span>
                      {isDuplicate && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse">
                          ⚠ DUP
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground">ID: #{order._id.slice(-8).toUpperCase()}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{order.user_id?.display_name || order.shipping_address?.full_name || "Guest"}</span>
                    <span className="text-xs text-muted-foreground">{order.user_id?.email || order.guest_email}</span>
                    {order.phone_number && (
                      <span
                        className="text-[11px] text-[#e2c19d] font-mono font-bold mt-0.5 cursor-pointer hover:underline hover:text-[#f0d4b0] transition-colors"
                        title="Click to search all orders for this number"
                        onClick={() => {
                          setSearchTerm(order.phone_number);
                          setPage(1);
                          navigator.clipboard.writeText(order.phone_number).catch(() => {});
                          toast.info(`Searching orders for ${order.phone_number}`);
                        }}
                      >
                        {order.phone_number}
                      </span>
                    )}
                    {isDuplicate && (
                      <span className="text-[9px] text-amber-500 font-semibold mt-0.5">⚠ Same-day duplicate pending</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs">{format(new Date(order.createdAt), "MMM d, yyyy, h:mm a")}</TableCell>
                <TableCell className="font-semibold">৳{order.total_amount.toFixed(2)}</TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <div className="flex flex-col gap-1">
                      <Select defaultValue={order.status} onValueChange={(val) => updateOrderStatus(order._id, val)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Placed</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      {order.tracking_id ? (
                        <div className="flex flex-col gap-0.5 mt-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              order.courier_name?.toLowerCase().includes("steadfast") ? "bg-sky-500" : 
                              order.courier_name?.toLowerCase().includes("pathao") ? "bg-emerald-500" : "bg-primary"
                            }`} />
                            <span className="text-[10px] font-bold tracking-wider uppercase text-foreground">
                              {order.courier_name || "Courier"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span 
                              className="text-[9px] font-mono bg-muted/60 px-1.5 py-0.5 rounded text-foreground/80 select-all cursor-pointer hover:bg-muted/80 transition-colors"
                              title="Click to copy tracking ID"
                              onClick={() => {
                                navigator.clipboard.writeText(order.tracking_id);
                                toast.success("Tracking ID copied to clipboard!");
                              }}
                            >
                              {order.tracking_id}
                            </span>
                            <a 
                              href={
                                order.courier_name?.toLowerCase().includes("steadfast")
                                  ? `https://steadfast.com.bd/tracking`
                                  : order.courier_name?.toLowerCase().includes("pathao")
                                  ? `https://merchant.pathao.com/tracking`
                                  : "#"
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ) : (order.status !== "cancelled" && order.status !== "delivered") ? (
                        <div className="flex gap-1 mt-1 justify-between w-full">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-5 text-[9px] px-1 bg-sky-500/10 text-sky-600 border-sky-500/20 hover:bg-sky-500/20 hover:text-sky-700 transition-all font-semibold uppercase tracking-widest flex-1"
                            onClick={() => {
                              setDispatchOrder(order);
                              setCourierType("steadfast");
                              setCodAmount(order.payment_method === "cash_on_delivery" ? Math.round(order.total_amount) : 0);
                            }}
                          >
                            Steadfast
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-5 text-[9px] px-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-700 transition-all font-semibold uppercase tracking-widest flex-1"
                            onClick={() => {
                              setDispatchOrder(order);
                              setCourierType("pathao");
                              setCodAmount(order.payment_method === "cash_on_delivery" ? Math.round(order.total_amount) : 0);
                              fetchPathaoStores();
                            }}
                          >
                            Pathao
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => downloadInvoice(order._id, order._id.slice(0, 8).toUpperCase())}
                      title="Download Invoice PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setSelectedOrderDetails(order)}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-xs text-muted-foreground font-medium">
            SHOWING {pagination.total === 0 ? 0 : ((page - 1) * perPage) + 1} - {Math.min(page * perPage, pagination.total)} OF {pagination.total} ORDERS
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">Per Page:</span>
              <Select
                value={String(perPage)}
                onValueChange={(val) => {
                  setPerPage(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger id="orders-per-page" className="h-8 w-[70px] text-xs border-border/40 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-8 text-[10px] tracking-wider rounded-lg border-border/40"
              >
                PREVIOUS
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pagination.pages}
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                className="h-8 text-[10px] tracking-wider rounded-lg border-border/40"
              >
                NEXT
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Courier Dispatch Dialog */}
      {dispatchOrder && courierType && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg p-6 bg-card border border-border/80 rounded-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 modal-scrollbar" data-lenis-prevent="true">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                  {courierType === "steadfast" ? (
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
                  ) : (
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                  Dispatch via {courierType === "steadfast" ? "Steadfast Courier" : "Pathao Courier"}
                </h3>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono">
                  Order ID: #{dispatchOrder._id.slice(-8).toUpperCase()}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full border border-border/50 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setDispatchOrder(null);
                  setCourierType(null);
                }}
              >
                <span className="text-sm font-semibold">×</span>
              </Button>
            </div>

            {/* Recipient Overview */}
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border/40 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Customer Name</p>
                <p className="font-medium mt-0.5">{dispatchOrder.shipping_address?.full_name || `${dispatchOrder.shipping_address?.firstName || ""} ${dispatchOrder.shipping_address?.lastName || ""}`.trim()}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Contact Phone</p>
                <p className="font-medium mt-0.5">{dispatchOrder.phone_number}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Delivery Address</p>
                <p className="font-medium mt-0.5">{dispatchOrder.shipping_address?.address}, {dispatchOrder.shipping_address?.city}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Payment Method</p>
                <p className="font-semibold text-primary mt-0.5 uppercase tracking-wider">
                  {dispatchOrder.payment_method === "cash_on_delivery" ? "Cash on Delivery" : "Online Payment"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Amount to Collect (COD)</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-bold text-foreground">৳</span>
                  <Input
                    type="number"
                    min={0}
                    value={codAmount}
                    onChange={(e) => setCodAmount(parseInt(e.target.value) || 0)}
                    className="h-7 w-24 text-xs px-2 font-bold border-amber-500/60 focus-visible:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {courierType === "steadfast" ? (
              // Steadfast Simple Confirmation Form
              <div className="space-y-4">
                <div className="bg-sky-500/10 border border-sky-500/20 p-3 rounded-lg text-xs text-sky-700 space-y-1">
                  <p className="font-bold">Ready for Steadfast Delivery Service</p>
                  <p className="text-[11px] opacity-90">
                    This order will be automatically booked with Steadfast. The generated tracking ID and consignment details will be retrieved and assigned to the order instantly.
                  </p>
                </div>
                
                {/* Special Instructions */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Special Instructions / Note</label>
                  <Input 
                    value={instructions} 
                    onChange={(e) => setInstructions(e.target.value)} 
                    placeholder="e.g. Call before delivery, Handle with care"
                    className="text-xs h-9" 
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setDispatchOrder(null);
                      setCourierType(null);
                    }}
                    disabled={isDispatching}
                  >
                    CANCEL
                  </Button>
                  <Button
                    className="flex-1 bg-sky-600 text-white hover:bg-sky-700 text-xs font-semibold"
                    onClick={() => handleSteadfastDispatch(dispatchOrder._id)}
                    disabled={isDispatching}
                  >
                    {isDispatching ? "DISPATCHING..." : "DISPATCH NOW"}
                  </Button>
                </div>
              </div>
            ) : (
              // Pathao Simple Confirmation Form (like Steadfast)
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-xs text-emerald-700 space-y-1">
                  <p className="font-bold">Ready for Pathao Delivery Service</p>
                  <p className="text-[11px] opacity-90">
                    This order will be automatically booked with Pathao. Pathao's automated address-to-location mapping system will resolve the delivery city, zone, and area.
                  </p>
                </div>

                {/* Store select — only if multiple stores */}
                {pathaoStores.length > 1 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Select Store</label>
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                      <SelectTrigger className="w-full text-xs h-9">
                        <SelectValue placeholder="Select Store" />
                      </SelectTrigger>
                      <SelectContent>
                        {pathaoStores.map(store => (
                          <SelectItem key={store.store_id} value={store.store_id.toString()}>
                            {store.store_name} ({store.store_address})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Weight / Quantity */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Weight (KG)</label>
                    <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="text-xs h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Quantity</label>
                    <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="text-xs h-9" />
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Special Instructions</label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => { setDispatchOrder(null); setCourierType(null); }}
                    disabled={isDispatching}
                  >
                    CANCEL
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
                    onClick={handlePathaoDispatch}
                    disabled={isDispatching}
                  >
                    {isDispatching ? "DISPATCHING..." : "DISPATCH VIA PATHAO"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Order Details View Modal */}
      {selectedOrderDetails && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl p-6 bg-card border border-border/80 rounded-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 text-left modal-scrollbar" data-lenis-prevent="true">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Order Details
                </h3>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono flex flex-wrap gap-x-4 gap-y-1">
                  <span>ID: #{selectedOrderDetails._id}</span>
                  <span className="text-foreground font-bold font-sans normal-case">Invoice: INV-{selectedOrderDetails._id.slice(0, 8).toUpperCase()}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-[10px] tracking-wider rounded-lg border-border/50 uppercase font-semibold flex items-center gap-1.5"
                  onClick={() => downloadInvoice(selectedOrderDetails._id, selectedOrderDetails._id.slice(0, 8).toUpperCase())}
                >
                  <FileDown className="w-3.5 h-3.5" /> Receipt
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full border border-border/50 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedOrderDetails(null)}
                >
                  <span className="text-sm font-semibold">×</span>
                </Button>
              </div>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Customer and Delivery Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Customer Info</h4>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/40 space-y-1">
                    <p><span className="text-muted-foreground font-semibold">Name:</span> <strong className="text-foreground">{selectedOrderDetails.shipping_address?.full_name || selectedOrderDetails.shipping_address?.name || "Guest"}</strong></p>
                    <p><span className="text-muted-foreground font-semibold">Email:</span> <strong className="text-foreground">{selectedOrderDetails.user_id?.email || selectedOrderDetails.guest_email || "N/A"}</strong></p>
                    <p><span className="text-muted-foreground font-semibold">Phone:</span> <strong className="text-foreground">{selectedOrderDetails.phone_number || "N/A"}</strong></p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Shipping Address</h4>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/40 space-y-1">
                    <p className="font-medium text-foreground">{selectedOrderDetails.shipping_address?.address}</p>
                    <p className="text-muted-foreground">{selectedOrderDetails.shipping_address?.city}</p>
                  </div>
                </div>
              </div>

              {/* Order Status and Payment Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Order Status</h4>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/40 flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Status:</span>
                    {getStatusBadge(selectedOrderDetails.status)}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Payment Summary</h4>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/40 space-y-1.5 font-medium">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Method:</span>
                      <span className="text-foreground uppercase tracking-wider text-[10px]">{selectedOrderDetails.payment_method?.replace(/_/g, " ") || "COD"}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span className="text-foreground">৳{Math.round(selectedOrderDetails.total_amount - (selectedOrderDetails.shipping_cost || 0) + (selectedOrderDetails.discount_amount || 0))}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Shipping:</span>
                      <span className="text-foreground">৳{selectedOrderDetails.shipping_cost || 0}</span>
                    </div>
                    {selectedOrderDetails.discount_amount > 0 && (
                      <div className="flex justify-between text-green-500">
                        <span>Discount:</span>
                        <span>-৳{selectedOrderDetails.discount_amount}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border/40 pt-1.5 text-sm font-bold">
                      <span className="text-foreground uppercase text-[10px] tracking-wider">Total:</span>
                      <span className="text-foreground">৳{Math.round(selectedOrderDetails.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Ordered Items</h4>
              <div className="border border-border/40 rounded-lg overflow-hidden bg-muted/10 divide-y divide-border/20">
                {selectedOrderDetails.order_items?.map((item: any) => {
                  const productImage = item.product_id?.product_images?.[0]?.url || "/placeholder.svg";
                  return (
                    <div key={item._id} className="p-3 flex justify-between items-center gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg border border-border/40 overflow-hidden bg-muted flex-shrink-0">
                          <img 
                            src={cloudinaryUrl(productImage)} 
                            alt={item.product_name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{item.product_name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">{item.variant_name || "Standard"}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-foreground">৳{Math.round(item.unit_price)} × {item.quantity}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">৳{Math.round(item.unit_price * item.quantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courier Info if assigned */}
            {selectedOrderDetails.tracking_id && (
              <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                <div className="text-left">
                  <p className="font-bold text-sky-700 uppercase tracking-wide">Fulfillment Information</p>
                  <p className="text-[11px] text-sky-600/90 mt-0.5">
                    Assigned to <strong>{selectedOrderDetails.courier_name || "Courier"}</strong> under tracking ID <strong>{selectedOrderDetails.tracking_id}</strong>.
                  </p>
                </div>
                <a
                  href={selectedOrderDetails.courier_name?.toLowerCase().includes("steadfast") 
                    ? "https://steadfast.com.bd/tracking"
                    : selectedOrderDetails.courier_name?.toLowerCase().includes("pathao")
                    ? "https://merchant.pathao.com/tracking"
                    : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-sky-600 text-white hover:bg-sky-700 font-semibold text-[10px] tracking-wider py-2 px-3 rounded-lg uppercase flex items-center gap-1 transition-colors shrink-0"
                >
                  Track Consignment
                </a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminOrders;
