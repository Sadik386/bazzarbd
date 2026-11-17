import { BrandMark } from "@/components/ui/brand-mark";
import { BRAND } from "@/lib/format";

export function VacationPage({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-16">
      <div className="max-w-lg space-y-6 rounded-2xl border border-border bg-card p-10 text-center">
        <div className="flex justify-center">
          <BrandMark />
        </div>
        <h1 className="font-display text-4xl text-foreground">Atelier Temporarily Paused</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {message ||
            "We are taking a short seasonal break to prepare our next woven batch. Online ordering will resume shortly."}
        </p>
        <p className="text-xs text-muted-foreground">Urgent inquiries: {BRAND.supportEmail}</p>
      </div>
    </div>
  );
}
