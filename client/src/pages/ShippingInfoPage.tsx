import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function ShippingInfoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-12 sm:px-6">
      <div className="space-y-2 border-b border-border pb-6">
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">Shipping & Dispatch</h1>
        <p className="text-sm text-muted-foreground">
          Nationwide parcel delivery across all 64 districts of Bangladesh via Pathao and Steadfast Courier.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
          <p className="text-xs font-medium text-primary">Inside Dhaka Metro</p>
          <p className="tabular-price font-display text-4xl text-foreground">৳60</p>
          <p className="text-sm text-muted-foreground">
            24–48 hours doorstep delivery after confirmation.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
          <p className="text-xs font-medium text-primary">Outside Dhaka (64 Districts)</p>
          <p className="tabular-price font-display text-4xl text-foreground">৳120</p>
          <p className="text-sm text-muted-foreground">
            2–4 business days to home or district hub pickup.
          </p>
        </div>
      </div>

      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <h2 className="font-display text-2xl text-foreground">Dispatch Cutoffs & Tracking</h2>
        <p>
          Orders confirmed before 3:00 PM BST (Saturday–Thursday) enter same-day packing. Once handed over to Steadfast or Pathao, your tracking reference updates automatically on the order tracking page and via SMS/email.
        </p>
        <div className="pt-2">
          <Button variant="outline" asChild>
            <Link to="/track">Track an existing parcel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
