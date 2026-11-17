import { lazy, Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { CartDrawer } from "@/components/CartDrawer";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { SearchCommand } from "@/components/SearchCommand";
import { useVacationMode } from "@/hooks/useCatalog";
import { api } from "@/lib/api";
import { VacationPage } from "@/pages/VacationPage";
import { useConciergeStore } from "@/stores/conciergeStore";

const AiConciergeDrawer = lazy(() =>
  import("@/components/AiConciergeDrawer").then((m) => ({ default: m.AiConciergeDrawer }))
);

export function AppShell() {
  const location = useLocation();
  const setPageContext = useConciergeStore((s) => s.setPageContext);
  const { data: vacation } = useVacationMode();

  const isAdminRoute =
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/master");

  // Scroll to top & sync live pathname to AI/Voice concierge context
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    const isProductPage =
      location.pathname.startsWith("/product/") || location.pathname.startsWith("/products/");
    setPageContext({
      pathname: location.pathname,
      ...(isProductPage ? {} : { product: null }),
    });
  }, [location.pathname, setPageContext]);

  // Track unique daily storefront visit once per browser session
  useEffect(() => {
    if (isAdminRoute) return;
    const key = "bazzarbd_visit_tracked";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    api.post("/auth/track-visit").catch(() => {});
  }, [isAdminRoute]);

  if (vacation?.enabled && !isAdminRoute) {
    return <VacationPage message={vacation.message} />;
  }

  if (isAdminRoute) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navbar />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <SearchCommand />
      <Suspense fallback={null}>
        <AiConciergeDrawer />
      </Suspense>
    </div>
  );
}
