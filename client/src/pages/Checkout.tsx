import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Package, CreditCard, ClipboardList } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const FieldInput = ({ label, field, value, onChange, placeholder, type = "text", error }: {
  label: string; field: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; error?: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs tracking-wider text-muted-foreground font-medium">{label}</Label>
    <Input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-card border-border/30 text-sm rounded-xl text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 ${error ? "border-destructive" : ""}`}
    />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

const shippingSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().email("Invalid email address").max(255),
  address: z.string().trim().min(1, "Address is required").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
  phone: z.string().trim().regex(/^(?:\+8801|01)[3-9]\d{8}$/, "Enter a valid Bangladesh phone number"),
});

const paymentSchema = z.object({
  cardName: z.string().trim().min(1, "Name on card is required").max(100),
  cardNumber: z.string().trim().regex(/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/, "Enter a valid 16-digit card number"),
  expiry: z.string().trim().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Use MM/YY format"),
  cvc: z.string().trim().regex(/^\d{3,4}$/, "Enter a valid CVC"),
});

type ShippingData = z.infer<typeof shippingSchema>;
type PaymentData = z.infer<typeof paymentSchema>;

const steps = [
  { id: 0, label: "SHIPPING", icon: Package },
  { id: 1, label: "PAYMENT", icon: CreditCard },
  { id: 2, label: "REVIEW", icon: ClipboardList },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_amount: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash_on_delivery" | "online_payment">("cash_on_delivery");
  const [deliveryOptions, setDeliveryOptions] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchDeliveryOptions = async () => {
      try {
        const res = await api.get("/settings/delivery_options");
        if (res && Array.isArray(res)) {
          setDeliveryOptions(res);
          setSelectedMethod(res[0]); // Default to first option
        }
      } catch (err) {
        console.error("Failed to fetch delivery options");
      }
    };
    fetchDeliveryOptions();
  }, []);

  const [shipping, setShipping] = useState<ShippingData>({
    firstName: "", lastName: "", email: user?.email || "",
    address: "", city: "", country: "",
    phone: "",
  });

  useEffect(() => {
    if (user?.email) {
      setShipping((prev) => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const [payment, setPayment] = useState<PaymentData>({
    cardName: "", cardNumber: "", expiry: "", cvc: "",
  });

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">YOUR CART IS EMPTY</p>
        <Button variant="outline" onClick={() => navigate("/products")} className="tracking-wider rounded-full border-border/30 hover:border-primary/30">
          <ArrowLeft className="w-4 h-4 mr-2" /> BROWSE PRODUCTS
        </Button>
      </div>
    );
  }

  const applyCoupon = async () => {
    if (!couponCode) return;
    setValidatingCoupon(true);
    try {
      const res = await api.post("/coupons/validate", {
        code: couponCode,
        amount: totalPrice
      });
      setAppliedCoupon(res);
      toast({ title: "Coupon applied!", description: `৳${res.discount_amount} discount added.` });
    } catch (err: any) {
      toast({ 
        title: "Invalid coupon", 
        description: err.response?.data?.error || "Failed to validate coupon", 
        variant: "destructive" 
      });
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const validateStep = () => {
    setErrors({});
    if (step === 0) {
      const result = shippingSchema.safeParse(shipping);
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.errors.forEach((e) => { errs[e.path[0] as string] = e.message; });
        setErrors(errs);
        return false;
      }
    }
    if (step === 1 && paymentMethod === "online_payment") {
      const result = paymentSchema.safeParse(payment);
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.errors.forEach((e) => { errs[e.path[0] as string] = e.message; });
        setErrors(errs);
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 2));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const placeOrder = async () => {
    setSubmitting(true);
    try {
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant.id,
        quantity: item.quantity,
        unit_price: item.product.basePrice + item.variant.priceModifier,
        product_name: item.product.name,
        variant_name: item.variant.name,
      }));

      const finalAmount = totalPrice - (appliedCoupon?.discount_amount || 0);

      const order = await api.post<{ id: string }>("/orders", {
        items: orderItems,
        total_amount: finalAmount + (selectedMethod?.cost || 0),
        discount_amount: appliedCoupon?.discount_amount || 0,
        shipping_cost: selectedMethod?.cost || 0,
        delivery_method: selectedMethod?.name || "Standard",
        coupon_code: appliedCoupon?.code || null,
        shipping_address: {
          firstName: shipping.firstName,
          lastName: shipping.lastName,
          address: shipping.address,
          city: shipping.city,
          country: shipping.country,
          email: shipping.email,
        },
        guest_email: user ? null : shipping.email,
        phone_number: shipping.phone,
        payment_method: paymentMethod
      });

      clearCart();
      toast({ title: "Order placed!", description: `Order #${order.id.slice(0, 8).toUpperCase()} confirmed.` });
      navigate(`/order/${order.id}`);
    } catch (err: any) {
      toast({ title: "Order failed", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const updateShipping = (field: keyof ShippingData, value: string) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const updatePayment = (field: keyof PaymentData, value: string) => {
    setPayment((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs tracking-[0.3em] text-primary mb-2 font-semibold">CHECKOUT</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-foreground">Complete Your Order</h1>
        </motion.div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-10 max-w-md">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                step > i ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                : step === i ? "border-primary text-primary bg-primary/10"
                : "border-border/30 text-muted-foreground"
              }`}>
                {step > i ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] tracking-wider hidden sm:inline font-medium ${
                step >= i ? "text-foreground" : "text-muted-foreground"
              }`}>{s.label}</span>
              {i < steps.length - 1 && <div className={`w-8 md:w-16 h-px mx-1 ${step > i ? "bg-primary" : "bg-border/30"}`} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="shipping" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-card border border-border/20 rounded-2xl p-6 space-y-5">
                  <h2 className="text-sm font-bold tracking-wider text-foreground">SHIPPING INFORMATION</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldInput label="FIRST NAME" field="firstName" value={shipping.firstName} onChange={(v) => updateShipping("firstName", v)} placeholder="John" error={errors.firstName} />
                    <FieldInput label="LAST NAME" field="lastName" value={shipping.lastName} onChange={(v) => updateShipping("lastName", v)} placeholder="Doe" error={errors.lastName} />
                  </div>
                  <FieldInput label="EMAIL" field="email" value={shipping.email} onChange={(v) => updateShipping("email", v)} placeholder="john@example.com" type="email" error={errors.email} />
                  <FieldInput label="ADDRESS" field="address" value={shipping.address} onChange={(v) => updateShipping("address", v)} placeholder="123 Main Street" error={errors.address} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldInput label="CITY" field="city" value={shipping.city} onChange={(v) => updateShipping("city", v)} placeholder="Berlin" error={errors.city} />
                    <FieldInput label="COUNTRY" field="country" value={shipping.country} onChange={(v) => updateShipping("country", v)} placeholder="Germany" error={errors.country} />
                  </div>
                  <FieldInput label="PHONE NUMBER (BD)" field="phone" value={shipping.phone} onChange={(v) => updateShipping("phone", v)} placeholder="017XXXXXXXX" error={errors.phone} />
                  
                  {deliveryOptions.length > 0 && (
                    <div className="pt-4 space-y-3">
                      <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Delivery Method</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {deliveryOptions.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedMethod(opt)}
                            className={`p-4 rounded-xl border-2 text-left transition-all flex justify-between items-center ${
                              selectedMethod?.name === opt.name 
                                ? "border-primary bg-primary/5 shadow-md" 
                                : "border-border/20 hover:border-primary/20 bg-card"
                            }`}
                          >
                            <div className="space-y-1">
                              <p className={`text-xs font-bold uppercase tracking-wider ${selectedMethod?.name === opt.name ? "text-foreground" : "text-muted-foreground"}`}>
                                {opt.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 italic">Standard delivery time applies</p>
                            </div>
                            <p className="text-sm font-black text-primary">৳{opt.cost}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-card border border-border/20 rounded-2xl p-6 space-y-6">
                  <h2 className="text-sm font-bold tracking-wider text-foreground">PAYMENT METHOD</h2>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div
                      className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-primary bg-primary/5 shadow-lg shadow-primary/5"
                    >
                      <Package className="w-8 h-8 mb-3 text-primary" />
                      <span className="text-[11px] font-bold tracking-widest uppercase text-foreground">Cash on Delivery</span>
                      <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-tighter">Pay when you receive your order</p>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {paymentMethod === "online_payment" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-4 overflow-hidden"
                      >
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-4 items-center">
                           <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                             <Check className="w-5 h-5 text-primary" />
                           </div>
                           <div>
                             <p className="text-xs font-bold text-foreground">SECURE REDIRECT</p>
                             <p className="text-[10px] text-muted-foreground">You will be redirected to SSLCommerz to complete your payment.</p>
                           </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 px-2 italic">Supports: bKash, Rocket, Nagad, Visa, Mastercard, and more.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-card border border-border/20 rounded-2xl p-6 space-y-6">
                  <h2 className="text-sm font-bold tracking-wider text-foreground">ORDER REVIEW</h2>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground tracking-wider font-medium">SHIPPING TO</p>
                    <p className="text-sm text-foreground">{shipping.firstName} {shipping.lastName}</p>
                    <p className="text-sm text-muted-foreground">{shipping.address}, {shipping.city}</p>
                    <p className="text-sm text-muted-foreground">{shipping.country}</p>
                    <p className="text-sm text-muted-foreground">{shipping.email}</p>
                    <p className="text-sm text-muted-foreground">{shipping.phone}</p>
                  </div>

                  <div className="border-t border-border/20 pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground tracking-wider font-medium uppercase">Payment Method</p>
                    <div className="flex items-center gap-2 text-sm text-foreground font-semibold">
                      {paymentMethod === "cash_on_delivery" ? (
                        <><Package className="w-4 h-4 text-primary" /> CASH ON DELIVERY</>
                      ) : (
                        <><div className="w-4 h-4 rounded-sm bg-white p-0.5"><img src="https://www.sslcommerz.com/wp-content/uploads/2021/01/SSLCommerz-Logo.png" className="w-full h-full object-contain" /></div> ONLINE VIA SSLCOMMERZ</>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border/20 pt-4 space-y-3">
                    <p className="text-xs text-muted-foreground tracking-wider font-medium">ITEMS</p>
                    {items.map((item) => {
                      const price = item.product.basePrice + item.variant.priceModifier;
                      return (
                        <div key={`${item.product.id}-${item.variant.id}`} className="flex justify-between text-sm">
                          <span className="text-foreground/80">{item.product.name} — {item.variant.name} ×{item.quantity}</span>
                          <span className="text-primary font-semibold">৳{(price * item.quantity).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={step === 0 ? () => navigate(-1) : back} className="tracking-wider text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" /> {step === 0 ? "BACK" : "PREVIOUS"}
              </Button>
              {step < 2 ? (
                <Button onClick={next} className="tracking-wider text-xs rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                  CONTINUE <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={placeOrder} disabled={submitting} className="tracking-wider text-xs rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                  {submitting ? "PROCESSING..." : "PLACE ORDER"} {!submitting && <Check className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card border border-border/20 rounded-2xl p-6 sticky top-28 space-y-4">
              <h3 className="text-sm font-bold tracking-wider text-foreground">ORDER SUMMARY</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map((item) => {
                  const price = item.product.basePrice + item.variant.priceModifier;
                  return (
                    <div key={`${item.product.id}-${item.variant.id}`} className="flex justify-between items-start text-sm">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate text-foreground">{item.product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.variant.name} ×{item.quantity}</p>
                      </div>
                      <p className="text-xs text-primary flex-shrink-0 ml-2 font-semibold">৳{(price * item.quantity).toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2 pt-2 border-t border-border/20">
                <Label className="text-[10px] tracking-wider text-muted-foreground font-medium uppercase">Coupon Code</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="ENTER CODE" 
                    value={couponCode} 
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="h-9 text-xs rounded-lg uppercase"
                    disabled={!!appliedCoupon}
                  />
                  <Button 
                    size="sm" 
                    onClick={applyCoupon} 
                    disabled={validatingCoupon || !couponCode || !!appliedCoupon}
                    className="h-9 text-[10px] tracking-tighter"
                  >
                    {validatingCoupon ? "..." : appliedCoupon ? "APPLIED" : "APPLY"}
                  </Button>
                </div>
                {appliedCoupon && (
                  <p className="text-[10px] text-primary font-medium">
                    SAVED ৳{appliedCoupon.discount_amount} WITH "{appliedCoupon.code}"
                    <button onClick={() => setAppliedCoupon(null)} className="ml-2 text-muted-foreground hover:text-foreground">REMOVE</button>
                  </p>
                )}
              </div>
              <div className="border-t border-border/20 pt-4 space-y-2">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>SUBTOTAL</span>
                  <span>৳{totalPrice.toFixed(0)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-xs text-primary">
                    <span>DISCOUNT</span>
                    <span>-৳{appliedCoupon.discount_amount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>DELIVERY ({selectedMethod?.name || "Standard"})</span>
                  <span>৳{(selectedMethod?.cost || 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-muted-foreground font-medium uppercase">Total</span>
                  <span className="text-xl font-bold text-primary">৳{(totalPrice + (selectedMethod?.cost || 0) - (appliedCoupon?.discount_amount || 0)).toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
