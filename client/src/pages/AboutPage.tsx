import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function AboutPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid items-end gap-8 border-b border-border pb-10 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <h1 className="font-display text-5xl leading-[1.05] text-foreground sm:text-6xl">
            Everyday tailoring rooted in Bengal textile craft.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            BazzarBD builds enduring wardrobe staples in Dhaka—combining breathable long-staple cotton, calm architectural proportions, and direct-to-doorstep transparency.
          </p>
        </div>
        <div className="lg:col-span-5 lg:text-right">
          <Button asChild size="lg">
            <Link to="/products">Explore current collection</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
          <img
            src="/images/cat-tshirts.webp"
            alt="Stacked combed cotton garments in natural light"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
          <img
            src="/images/hero_male.webp"
            alt="Evening hoodie lookbook in Dhaka"
            className="aspect-[4/3] w-full object-cover object-top"
          />
        </div>
      </div>

      <div className="grid gap-8 border-t border-border pt-10 md:grid-cols-3">
        <div className="space-y-2">
          <h2 className="font-display text-2xl text-foreground">Honest Fabric Weights</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every garment lists its exact GSM, yarn composition, and flat-measured chest, shoulder, and length dimensions before you add it to your bag.
          </p>
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl text-foreground">Small-Batch Milling</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Rather than seasonal overproduction, we replenish core essentials in measured batches tracked by real-time velocity and demand forecasting.
          </p>
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl text-foreground">Conversational Concierge</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Shop in English, বাংলা, or Banglish via text or live voice with an AI stylist connected directly to our inventory and order dispatch desk.
          </p>
        </div>
      </div>
    </div>
  );
}
