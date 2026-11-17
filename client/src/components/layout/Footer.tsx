import { Link } from "react-router-dom";
import { BrandMark } from "@/components/ui/brand-mark";
import { BRAND } from "@/lib/format";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-[1360px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="space-y-3 md:col-span-5">
            <BrandMark />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Thoughtfully tailored apparel and everyday essentials designed in Dhaka. Combed Bengal cotton, transparent pricing in BDT, and nationwide doorstep delivery.
            </p>
            <p className="text-xs text-muted-foreground">
              {BRAND.city} · {BRAND.supportEmail}
            </p>
          </div>

          <div className="space-y-3 md:col-span-2">
            <p className="text-xs font-semibold text-foreground">Shop</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/products" className="hover:text-primary">All pieces</Link></li>
              <li><Link to="/wishlist" className="hover:text-primary">Saved wishlist</Link></li>
              <li><Link to="/checkout" className="hover:text-primary">Checkout</Link></li>
            </ul>
          </div>

          <div className="space-y-3 md:col-span-3">
            <p className="text-xs font-semibold text-foreground">Customer Care</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/track" className="hover:text-primary">Track an order</Link></li>
              <li><Link to="/orders" className="hover:text-primary">Order history & invoices</Link></li>
              <li><Link to="/shipping-info" className="hover:text-primary">Shipping & courier info</Link></li>
              <li><Link to="/returns-exchanges" className="hover:text-primary">Returns & exchanges</Link></li>
              <li><Link to="/support" className="hover:text-primary">Contact support</Link></li>
            </ul>
          </div>

          <div className="space-y-3 md:col-span-2">
            <p className="text-xs font-semibold text-foreground">Atelier</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-primary">Our story</Link></li>
              <li><Link to="/careers" className="hover:text-primary">Careers</Link></li>
              <li><Link to="/master" className="hover:text-primary">Admin portal</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} BazzarBD. Tailored in Bangladesh.</p>
          <p>Cash on Delivery · Pathao & Steadfast Courier Dispatch</p>
        </div>
      </div>
    </footer>
  );
}
