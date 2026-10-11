import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Package, ArrowRight, Copy, Check, FileDown } from "lucide-react";
import { api, getAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface OrderData {
  id: string;
  status: string;
  total_amount: number;
  shipping_address: Record<string, string> | null;
  guest_email: string | null;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    products: { name: string; slug: string } | null;
    product_variants: { variant_name: string } | null;
  }[];
}

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) { navigate("/"); return; }
    api.get<OrderData>(`/orders/${orderId}`)
      .then((data) => { setOrder(data); setLoading(false); })
      .catch(() => navigate("/"));
  }, [orderId, navigate]);

  const copyOrderId = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const addr = order.shipping_address;
  const orderRef = order.id.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-10">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2, stiffness: 200 }} className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">Order Confirmed</h1>
          <p className="text-muted-foreground text-sm">Thank you for your purchase! Your order is being processed.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border/20 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground tracking-wider font-medium">ORDER REFERENCE</p>
              <p className="text-lg font-bold text-primary mt-1">#{orderRef}</p>
            </div>
            <button onClick={copyOrderId} className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-primary/5" aria-label="Copy order ID">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="p-6 border-b border-border/20">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/30" />
              <span className="text-sm tracking-wider uppercase text-foreground font-medium">
                {order.status === "pending" ? "placed" : order.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Placed on {new Date(order.created_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="p-6 border-b border-border/20 space-y-4">
            <p className="text-xs text-muted-foreground tracking-wider font-medium">ITEMS</p>
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.products?.name || "Product"}</p>
                  <p className="text-xs text-muted-foreground">{item.product_variants?.variant_name || "Standard"} × {item.quantity}</p>
                </div>
                <p className="text-sm text-primary font-semibold">৳{(item.unit_price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          {addr && (
            <div className="p-6 border-b border-border/20">
              <p className="text-xs text-muted-foreground tracking-wider mb-2 font-medium">SHIPPING TO</p>
              <p className="text-sm text-foreground">{addr.firstName} {addr.lastName}</p>
              <p className="text-sm text-muted-foreground">{addr.address}, {addr.city}{addr.postalCode ? ` ${addr.postalCode}` : ""}</p>
              <p className="text-sm text-muted-foreground">{addr.country}</p>
            </div>
          )}

          <div className="p-6 flex justify-between items-center">
            <span className="text-sm text-muted-foreground font-medium">TOTAL</span>
            <span className="text-xl font-bold text-primary">৳{Number(order.total_amount).toFixed(2)}</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
          <Button
            variant="outline"
            className="tracking-wider text-xs rounded-full border-primary/30 text-primary hover:bg-primary/5"
            onClick={async () => {
              try {
                const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
                const token = getAccessToken();
                const res = await fetch(`${API_URL}/invoices/${order.id}`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) throw new Error("Failed to download");
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `invoice-${order.id.slice(0, 8).toUpperCase()}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch {
                alert("Failed to download invoice. Please try again.");
              }
            }}
          >
            <FileDown className="w-4 h-4 mr-2" /> DOWNLOAD INVOICE
          </Button>
          <Button variant="outline" asChild className="tracking-wider text-xs rounded-full border-border/30">
            <Link to="/products"><Package className="w-4 h-4 mr-2" /> CONTINUE SHOPPING</Link>
          </Button>
          <Button asChild className="tracking-wider text-xs rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Link to="/">GO HOME <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
