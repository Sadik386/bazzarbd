import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Check, Lock, Tag, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatBDT } from "@/lib/format";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { cn } from "@/lib/utils";

const checkoutSchema = z.object({
  full_name: z.string().min(2, "Enter your full name"),
  guest_email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone_number: z
    .string()
    .min(10, "Enter a valid Bangladesh phone number (e.g. 017XXXXXXXX)"),
  delivery_zone: z.enum(["inside_dhaka", "outside_dhaka"]),
  city: z.string().min(2, "City or district is required"),
  area: z.string().optional(),
  address: z.string().min(5, "Street / house / road address is required"),
  notes: z.string().optional(),
  payment_method: z.enum(["cash_on_delivery", "online_payment"]),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export function CheckoutPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_amount: number;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      full_name: user?.display_name || "",
      guest_email: user?.email || "",
      phone_number: "",
      delivery_zone: "inside_dhaka",
      city: "Dhaka",
      area: "",
      address: "",
      notes: "",
      payment_method: "cash_on_delivery",
    },
  });

  const zone = watch("delivery_zone");
  const paymentMethod = watch("payment_method");
  const shippingCost = zone === "inside_dhaka" ? 60 : 120;
  const discountAmount = appliedCoupon?.discount_amount || 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center space-y-4">
        <h1 className="font-display text-4xl text-foreground">Your bag is empty</h1>
        <p className="text-sm text-muted-foreground">
          Select garments from the collection before proceeding to checkout.
        </p>
        <Button asChild>
          <Link to="/products">Browse collection</Link>
        </Button>
      </div>
    );
  }

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setValidatingCoupon(true);
    try {
      const res = await api.post<{ code: string; discount_amount: number }>("/coupons/validate", {
        code,
        amount: subtotal,
      });
      setAppliedCoupon({ code: res.code, discount_amount: res.discount_amount });
      toast.success(`Coupon ${res.code} applied (-${formatBDT(res.discount_amount)})`);
    } catch (err) {
      setAppliedCoupon(null);
      toast.error(err instanceof Error ? err.message : "Invalid coupon code");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const onSubmit = async (values: CheckoutFormValues) => {
    try {
      const [firstName, ...restName] = values.full_name.trim().split(/\s+/);
      const lastName = restName.join(" ");

      const payload = {
        items: items.map((item) => ({
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity,
          product_name: item.name,
          variant_name: item.variantName,
        })),
        total_amount: finalTotal,
        discount_amount: discountAmount,
        shipping_cost: shippingCost,
        coupon_code: appliedCoupon?.code || undefined,
        guest_email: user ? undefined : values.guest_email || undefined,
        phone_number: values.phone_number.trim(),
        payment_method: values.payment_method,
        shipping_address: {
          full_name: values.full_name.trim(),
          firstName,
          lastName,
          address: values.address.trim(),
          area: values.area?.trim() || "",
          city: values.city.trim(),
          delivery_zone: values.delivery_zone,
          notes: values.notes?.trim() || "",
        },
      };

      const res = await api.post<{ id: string }>("/orders", payload);
      clearCart();
      toast.success("Order placed successfully");
      navigate(`/order/${res.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete order");
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-border pb-6">
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">Checkout</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Complete your delivery details below. Orders inside Dhaka dispatch within 24–48 hours.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-10 lg:grid-cols-12 lg:items-start">
        {/* Left: 3 Editorial Steps */}
        <div className="space-y-8 lg:col-span-7">
          {/* Step 1: Contact */}
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-2xl text-foreground">1. Recipient Contact</h2>
              {user && <Badge variant="secondary">Signed in as {user.email}</Badge>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" placeholder="Tariq Mahmud" {...register("full_name")} />
                {errors.full_name && (
                  <p className="text-xs text-destructive">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone_number">Mobile number (Bangladesh)</Label>
                <Input id="phone_number" placeholder="01712345678" {...register("phone_number")} />
                {errors.phone_number && (
                  <p className="text-xs text-destructive">{errors.phone_number.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guest_email">Email for receipt (optional)</Label>
                <Input
                  id="guest_email"
                  type="email"
                  placeholder="tariq@example.com"
                  {...register("guest_email")}
                />
                {errors.guest_email && (
                  <p className="text-xs text-destructive">{errors.guest_email.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Step 2: Delivery Zone & Address */}
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="border-b border-border pb-3 font-display text-2xl text-foreground">
              2. Delivery Address
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setValue("delivery_zone", "inside_dhaka");
                  setValue("city", "Dhaka");
                }}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 text-left transition-all",
                  zone === "inside_dhaka"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-foreground/30"
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">Inside Dhaka</p>
                  <p className="text-xs text-muted-foreground">24–48 hours courier</p>
                </div>
                <span className="tabular-price text-sm font-semibold">৳60</span>
              </button>

              <button
                type="button"
                onClick={() => setValue("delivery_zone", "outside_dhaka")}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 text-left transition-all",
                  zone === "outside_dhaka"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-foreground/30"
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">Outside Dhaka</p>
                  <p className="text-xs text-muted-foreground">2–4 days · 64 districts</p>
                </div>
                <span className="tabular-price text-sm font-semibold">৳120</span>
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="city">City / District</Label>
                <Input id="city" placeholder="Dhaka" {...register("city")} />
                {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="area">Area / Thana</Label>
                <Input id="area" placeholder="Banani / Mirpur / Dhanmondi" {...register("area")} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Full street address</Label>
                <Textarea
                  id="address"
                  rows={2}
                  placeholder="House, Road, Block, Flat number..."
                  {...register("address")}
                />
                {errors.address && (
                  <p className="text-xs text-destructive">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Delivery instructions (optional)</Label>
                <Input id="notes" placeholder="Call upon arrival at main gate" {...register("notes")} />
              </div>
            </div>
          </section>

          {/* Step 3: Payment Method */}
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="border-b border-border pb-3 font-display text-2xl text-foreground">
              3. Payment Method
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setValue("payment_method", "cash_on_delivery")}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 text-left transition-all",
                  paymentMethod === "cash_on_delivery"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-foreground/30"
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">Cash on Delivery</p>
                  <p className="text-xs text-muted-foreground">Pay rider upon receiving parcel</p>
                </div>
                {paymentMethod === "cash_on_delivery" && <Check className="h-4 w-4 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => setValue("payment_method", "online_payment")}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 text-left transition-all",
                  paymentMethod === "online_payment"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-foreground/30"
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">bKash / Nagad / Online</p>
                  <p className="text-xs text-muted-foreground">Verified digital transfer</p>
                </div>
                {paymentMethod === "online_payment" && <Check className="h-4 w-4 text-primary" />}
              </button>
            </div>
          </section>
        </div>

        {/* Right: Sticky Summary */}
        <aside className="space-y-5 rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24 lg:col-span-5">
          <h2 className="border-b border-border pb-3 font-display text-2xl text-foreground">
            Order Summary
          </h2>

          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={`${item.productId}-${item.variantId}`} className="flex items-center gap-3 py-3">
                <img
                  src={item.imageUrl || "/images/cat-tshirts.webp"}
                  alt={item.name}
                  className="h-14 w-12 shrink-0 rounded-md border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.variantName} × {item.quantity}
                  </p>
                </div>
                <span className="tabular-price text-sm font-medium">
                  {formatBDT(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          {/* Coupon Code */}
          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="coupon-code">Promo or studio coupon</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="coupon-code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter code"
                  className="pl-9 uppercase"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleApplyCoupon}
                isLoading={validatingCoupon}
              >
                Apply
              </Button>
            </div>
            {appliedCoupon && (
              <p className="text-xs font-medium text-success">
                Applied {appliedCoupon.code} (−{formatBDT(appliedCoupon.discount_amount)})
              </p>
            )}
          </div>

          <div className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-price">{formatBDT(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery ({zone === "inside_dhaka" ? "Dhaka" : "Nationwide"})</span>
              <span className="tabular-price">{formatBDT(shippingCost)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-success">
                <span>Coupon discount</span>
                <span className="tabular-price">−{formatBDT(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-foreground">
              <span>Total payable</span>
              <span className="tabular-price text-lg">{formatBDT(finalTotal)}</span>
            </div>
          </div>

          <Button type="submit" size="xl" className="w-full" isLoading={isSubmitting}>
            <Lock className="h-4 w-4" />
            Confirm order
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Truck className="h-3.5 w-3.5" />
            Atomic stock reservation & instant order confirmation
          </p>
        </aside>
      </form>
    </div>
  );
}
