import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Calendar, CreditCard, Truck, Package, CheckCircle2, ArrowRight, RefreshCw, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price: number;
}

interface TrackedOrder {
  id: string;
  status: string;
  total_amount: number;
  discount_amount: number;
  shipping_cost: number;
  delivery_method: string;
  shipping_address: any;
  phone_number: string;
  payment_method: string;
  courier_name: string | null;
  tracking_id: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const statusSteps = [
  { status: "pending", label: "Order Placed", desc: "We have received your order request." },
  { status: "confirmed", label: "Confirmed", desc: "Your order has been verified and confirmed." },
  { status: "processing", label: "Processing", desc: "Your luxury essentials are being prepared." },
  { status: "shipped", label: "Shipped", desc: "Your package is on its way to you." },
  { status: "delivered", label: "Delivered", desc: "Enjoy your Thelagari wardrobe pieces!" }
];

const TrackOrder = () => {
  const [orderIdInput, setOrderIdInput] = useState("");
  const [contactInput, setContactInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderIdInput.trim() || !contactInput.trim()) {
      toast.error("Please enter both your Order ID and Phone/Email.");
      return;
    }

    setIsLoading(true);
    setOrder(null);

    try {
      const data = await api.post<TrackedOrder>("/orders/track", {
        orderId: orderIdInput.trim(),
        contact: contactInput.trim()
      });

      setOrder(data);
      toast.success("Order status retrieved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to track order. Please verify your details.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIndex = (currentStatus: string) => {
    if (currentStatus === "cancelled") return -1;
    const index = statusSteps.findIndex(step => step.status === currentStatus);
    return index !== -1 ? index : 0; // Default to first step if pending
  };

  const currentStepIdx = order ? getStepIndex(order.status) : -1;

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen pt-28 pb-20 bg-background text-foreground">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-bold tracking-[0.3em] text-[#e2c19d] uppercase mb-3"
          >
            ORDER MANAGEMENT
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight mb-4"
          >
            Track Your Order
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-muted-foreground max-w-lg mx-auto"
          >
            Enter your 24-character Order ID and the phone number or email address associated with your purchase to check live shipping progress.
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {!order ? (
            /* Gateway Input Card */
            <motion.div
              key="gateway-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card/25 border border-border/40 rounded-2xl p-6 md:p-10 max-w-lg mx-auto backdrop-blur-md shadow-xl"
            >
              <form onSubmit={handleTrack} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="order-id" className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                    Order ID
                    <span className="text-[10px] lowercase text-muted-foreground/60 italic">(24-character code)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="order-id"
                      type="text"
                      placeholder="e.g. 663aa98782bf613de4529bca"
                      value={orderIdInput}
                      onChange={(e) => setOrderIdInput(e.target.value)}
                      className="bg-background border border-border/40 rounded-xl py-3 pl-11 pr-4 w-full text-sm font-semibold tracking-wide outline-none focus:border-[#e2c19d]/60 text-foreground transition-all uppercase"
                      disabled={isLoading}
                    />
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact" className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Phone Number or Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="contact"
                      type="text"
                      placeholder="e.g. 01712345678 or customer@example.com"
                      value={contactInput}
                      onChange={(e) => setContactInput(e.target.value)}
                      className="bg-background border border-border/40 rounded-xl py-3 pl-11 pr-4 w-full text-sm font-semibold outline-none focus:border-[#e2c19d]/60 text-foreground transition-all"
                      disabled={isLoading}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#1a1a1a] dark:bg-[#e2c19d] hover:bg-black dark:hover:bg-[#d5b38d] text-white dark:text-black font-semibold text-xs py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 tracking-wider uppercase disabled:opacity-40"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Retrieving Status...
                    </>
                  ) : (
                    <>
                      Locate Order
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Secure Info Box */}
              <div className="mt-6 p-3 bg-[#f0ece9]/40 dark:bg-card/40 rounded-xl flex items-start gap-2.5 border border-border/20">
                <Info className="w-4 h-4 text-[#e2c19d] shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Order IDs are provided in your order confirmation email or SMS. If you placed the order as a guest, please use the exact guest checkout phone number.
                </p>
              </div>
            </motion.div>
          ) : (
            /* Order Tracking Results Layout */
            <motion.div
              key="results-layout"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Back to Tracking Button */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setOrder(null);
                    setOrderIdInput("");
                    setContactInput("");
                  }}
                  className="text-xs font-bold tracking-wider text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 uppercase"
                >
                  ← Track Another Order
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground uppercase font-bold">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold ${
                    order.status === "cancelled" 
                      ? "bg-red-500/10 text-red-500 border border-red-500/25" 
                      : order.status === "delivered"
                      ? "bg-green-500/10 text-green-500 border border-green-500/25"
                      : "bg-[#e2c19d]/10 text-[#e2c19d] border border-[#e2c19d]/25"
                  }`}>
                    {order.status === "pending" ? "placed" : order.status}
                  </span>
                </div>
              </div>

              {/* Step Tracking Progress Stepper */}
              {order.status === "cancelled" ? (
                <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-6 text-center">
                  <p className="text-sm font-semibold text-red-500 uppercase tracking-widest mb-1">Order Cancelled</p>
                  <p className="text-xs text-muted-foreground">This order has been cancelled. For further assistance, please contact customer support.</p>
                </div>
              ) : (
                <div className="border border-border/30 bg-card/10 rounded-2xl p-6 md:p-8 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4 relative">
                    {statusSteps.map((step, idx) => {
                      const isCompleted = idx < currentStepIdx;
                      const isActive = idx === currentStepIdx;
                      
                      return (
                        <div key={step.status} className="flex md:flex-col items-start md:items-center text-left md:text-center relative group">
                          {/* Stepper Node Bubble */}
                          <div className="flex items-center md:flex-col shrink-0 gap-3 md:gap-0">
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                              isCompleted 
                                ? "bg-[#e2c19d] border-[#e2c19d] text-black shadow-lg shadow-[#e2c19d]/20" 
                                : isActive
                                ? "bg-background border-[#e2c19d] text-[#e2c19d] ring-4 ring-[#e2c19d]/10"
                                : "bg-background border-border/60 text-muted-foreground"
                            }`}>
                              {isCompleted ? (
                                <CheckCircle2 className="w-5 h-5 stroke-[2px]" />
                              ) : (
                                <span className="text-xs font-bold">{idx + 1}</span>
                              )}
                            </div>
                          </div>

                          {/* Stepper Node Labels */}
                          <div className="ml-4 md:ml-0 md:mt-3 space-y-0.5">
                            <p className={`text-xs font-bold tracking-wide uppercase ${isActive ? "text-[#e2c19d]" : "text-foreground"}`}>
                              {step.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[150px]">
                              {step.desc}
                            </p>
                          </div>

                          {/* Desktop Stepper Connecting Line */}
                          {idx < statusSteps.length - 1 && (
                            <div className="hidden md:block absolute top-4 left-[calc(50%+16px)] right-[calc(-50%+16px)] h-[2px] bg-border/40 z-[-1]">
                              <div className="h-full bg-[#e2c19d] transition-all duration-500" style={{
                                width: isCompleted ? "100%" : "0%"
                              }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Order Meta Panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Panel 1: Order Details */}
                <div className="border border-border/20 bg-card/5 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-xs tracking-wider text-muted-foreground uppercase font-bold">Summary</h3>
                  <div className="space-y-3.5 text-xs font-medium">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Order ID</span>
                      <span className="text-foreground uppercase tracking-wider font-semibold">{order.id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Order Date</span>
                      <span className="text-foreground">{formatDate(order.created_at)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Method</span>
                      <span className="text-foreground uppercase tracking-wider text-[10px] bg-card border border-border/40 rounded px-1.5 py-0.5">{order.delivery_method}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Shipping & Contact */}
                <div className="border border-border/20 bg-card/5 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-xs tracking-wider text-muted-foreground uppercase font-bold">Delivery Destination</h3>
                  <div className="space-y-3.5 text-xs font-medium">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[#e2c19d] mt-0.5" />
                      <div className="space-y-0.5 text-foreground text-left">
                        <p className="font-semibold">{order.shipping_address?.name}</p>
                        <p>{order.shipping_address?.address}</p>
                        <p>{order.shipping_address?.city}</p>
                      </div>
                    </div>
                    <div className="border-t border-border/10 pt-2 flex justify-between items-center">
                      <span className="text-muted-foreground">Phone Number</span>
                      <span className="text-foreground font-semibold">{order.phone_number}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Financial Breakdowns */}
                <div className="border border-border/20 bg-card/5 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-xs tracking-wider text-muted-foreground uppercase font-bold">Payment Information</h3>
                  <div className="space-y-3 text-xs font-medium">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Payment Mode</span>
                      <span className="text-foreground uppercase tracking-wider font-semibold">{order.payment_method.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Shipping Cost</span>
                      <span className="text-foreground">৳{Number(order.shipping_cost).toFixed(2)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between items-center text-green-500">
                        <span>Discount Coupon</span>
                        <span>-৳{Number(order.discount_amount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-border/10 pt-2 flex justify-between items-center text-sm font-bold">
                      <span className="text-muted-foreground uppercase text-[10px]">Total Paid</span>
                      <span className="text-foreground text-[#e2c19d]">৳{Number(order.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Courier Tracking Portal Card */}
              {(order.courier_name || order.tracking_id) && (
                <div className="border border-[#e2c19d]/20 bg-[#e2c19d]/5 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold tracking-wide uppercase text-[#e2c19d] flex items-center gap-1.5">
                      <Truck className="w-4 h-4" /> Courier Consignment Dispatch
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This package is assigned to <strong className="text-foreground">{order.courier_name || "Merchant Courier"}</strong>. Consignment code is{" "}
                      <strong 
                        className="text-foreground bg-[#e2c19d]/10 px-1.5 py-0.5 rounded font-mono select-all cursor-pointer hover:bg-[#e2c19d]/20 transition-colors" 
                        title="Click to copy consignment code"
                        onClick={() => {
                          if (order.tracking_id) {
                            navigator.clipboard.writeText(order.tracking_id);
                            toast.success("Consignment code copied to clipboard!");
                          }
                        }}
                      >
                        {order.tracking_id || "Not Provided"}
                      </strong>.
                    </p>
                  </div>
                  {order.tracking_id && (
                    <a
                      href={order.courier_name?.toLowerCase().includes("steadfast") 
                        ? `https://steadfast.com.bd/tracking`
                        : order.courier_name?.toLowerCase().includes("pathao")
                        ? `https://merchant.pathao.com/tracking?consignment_id=${order.tracking_id}`
                        : "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#1a1a1a] dark:bg-[#e2c19d] hover:bg-black dark:hover:bg-[#d5b38d] text-white dark:text-black font-semibold text-[10px] tracking-wider py-2.5 px-4 rounded-lg uppercase flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                    >
                      Open Steadfast Portal
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Order Items List */}
              <div className="border border-border/20 rounded-2xl overflow-hidden bg-card/5">
                <div className="px-5 py-4 bg-[#f0ece9]/40 dark:bg-card/20 border-b border-border/20">
                  <h3 className="text-xs tracking-wider text-muted-foreground uppercase font-bold">Tracked Wardrobe Items</h3>
                </div>
                <div className="divide-y divide-border/10">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="p-5 flex justify-between items-center gap-4">
                      <div className="space-y-1 text-left">
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">{item.product_name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{item.variant_name}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-semibold text-foreground">৳{Number(item.unit_price).toFixed(2)} <span className="text-[10px] text-muted-foreground lowercase">x {item.quantity}</span></p>
                        <p className="text-[10px] text-muted-foreground font-bold mt-0.5">৳{Number(item.unit_price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TrackOrder;
