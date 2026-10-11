import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, ChevronRight, ShoppingBag, FileDown } from "lucide-react";
import { api, getAccessToken } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface PaginatedOrders {
  orders: OrderRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const Orders = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [pagination, setPagination] = useState<PaginatedOrders["pagination"] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    setLoading(true);
    api.get<PaginatedOrders>(`/orders/my-orders?page=${page}&limit=10`)
      .then((res) => {
        setOrders(res.orders);
        setPagination(res.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate, page]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs tracking-[0.3em] text-primary mb-2 font-semibold">ACCOUNT</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-foreground">Order History</h1>
        </motion.div>

        {orders.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-card border border-border/20 flex items-center justify-center">
              <ShoppingBag className="w-7 h-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground">NO ORDERS YET</p>
            <Button variant="outline" asChild className="tracking-wider text-xs rounded-full border-border/30">
              <Link to="/products">BROWSE PRODUCTS</Link>
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => {
              const ref = order.id.slice(0, 8).toUpperCase();
              const itemCount = order.order_items.reduce((s, oi) => s + oi.quantity, 0);
              const itemNames = order.order_items.map((oi) => oi.products?.name || "Product").slice(0, 3).join(", ");
              return (
                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/order/${order.id}`} className="block bg-card border border-border/20 rounded-xl p-5 hover:border-primary/30 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-bold text-foreground">#{ref}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground truncate max-w-[300px]">{itemNames}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary uppercase font-medium">
                            {order.status === "pending" ? "placed" : order.status}
                          </span>
                          <span className="text-xs text-muted-foreground">{itemCount} item{itemCount !== 1 ? "s" : ""} · {new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">৳{Number(order.total_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
                          const token = getAccessToken();
                          fetch(`${API_URL}/invoices/${order.id}`, {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                          })
                            .then((res) => {
                              if (!res.ok) throw new Error();
                              return res.blob();
                            })
                            .then((blob) => {
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `invoice-${ref}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(url);
                            })
                            .catch(() => alert("Failed to download invoice"));
                        }}
                        className="text-[10px] tracking-wider text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
                      >
                        <FileDown className="w-3 h-3" /> INVOICE
                      </button>
                    </div>
                  </Link>
                </motion.div>
              );
            })}

            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="rounded-full border-border/30 text-xs tracking-wider"
                >
                  PREVIOUS
                </Button>
                <span className="text-xs font-medium text-muted-foreground">
                  PAGE {page} OF {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.pages}
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  className="rounded-full border-border/30 text-xs tracking-wider"
                >
                  NEXT
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
