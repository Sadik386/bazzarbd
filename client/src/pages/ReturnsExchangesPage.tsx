import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function ReturnsExchangesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <div className="space-y-2 border-b border-border pb-6">
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">Returns & Exchanges</h1>
        <p className="text-sm text-muted-foreground">
          Simple 7-day size exchanges and defective-item replacements.
        </p>
      </div>

      <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="font-display text-2xl text-foreground">Eligibility Window</h2>
          <p>
            Garments may be exchanged within 7 days of delivery provided they remain unworn, unwashed, and include original hangtags and packaging.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-foreground">Damaged or Incorrect Parcel</h2>
          <p>
            If an incorrect size, color, or manufacturing flaw arrives, BazzarBD covers round-trip courier pickup at zero cost to you.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl text-foreground">How to Request an Exchange</h2>
          <p>
            Open a support ticket with your 6-character Order ID and preferred replacement size, and our care team will schedule pickup within 24 hours.
          </p>
        </section>

        <div className="pt-2">
          <Button asChild>
            <Link to="/support">Request an exchange</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
