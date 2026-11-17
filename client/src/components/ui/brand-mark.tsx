import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  compact?: boolean;
}

export function BrandMark({ className, compact = false }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <svg
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7 shrink-0"
        aria-hidden="true"
      >
        <rect x="1.5" y="1.5" width="25" height="25" rx="6" className="stroke-foreground/85" strokeWidth="1.4" />
        <path
          d="M8.5 9.5H15.2C17.2 9.5 18.6 10.7 18.6 12.4C18.6 13.7 17.8 14.6 16.5 15C18.1 15.4 19.2 16.6 19.2 18.2C19.2 20.1 17.6 21.4 15.4 21.4H8.5V9.5Z"
          className="stroke-primary"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <line x1="8.5" y1="15.1" x2="15.8" y2="15.1" className="stroke-primary" strokeWidth="1.4" />
      </svg>
      {!compact && (
        <span className="font-display text-2xl leading-none tracking-tight text-foreground">
          BazzarBD
        </span>
      )}
    </span>
  );
}
