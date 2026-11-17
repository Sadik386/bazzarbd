import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-28 text-center space-y-4">
      <p className="tabular-price text-xs font-medium text-muted-foreground">404</p>
      <h1 className="font-display text-5xl text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The link you followed may have moved or been archived.
      </p>
      <div className="flex justify-center gap-3 pt-2">
        <Button asChild>
          <Link to="/">Return home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/products">Browse collection</Link>
        </Button>
      </div>
    </div>
  );
}
