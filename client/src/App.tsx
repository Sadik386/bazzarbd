import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/pages/HomePage";
import { ProductsPage } from "@/pages/ProductsPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { OrderConfirmationPage } from "@/pages/OrderConfirmationPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { TrackOrderPage } from "@/pages/TrackOrderPage";
import { WishlistPage } from "@/pages/WishlistPage";
import { AuthPage } from "@/pages/AuthPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { SupportPage } from "@/pages/SupportPage";
import { CareersPage } from "@/pages/CareersPage";
import { AboutPage } from "@/pages/AboutPage";
import { ShippingInfoPage } from "@/pages/ShippingInfoPage";
import { ReturnsExchangesPage } from "@/pages/ReturnsExchangesPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";

const AdminPage = lazy(() =>
  import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function SessionInitializer() {
  const checkSession = useAuthStore((s) => s.checkSession);
  const user = useAuthStore((s) => s.user);
  const syncFromServer = useCartStore((s) => s.syncFromServer);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (user) {
      syncFromServer();
    }
  }, [user, syncFromServer]);

  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SessionInitializer />
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center bg-background">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          }
        >
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/categories/:categoryGroup" element={<ProductsPage />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/products/:slug" element={<ProductDetailPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/order/:orderId" element={<OrderConfirmationPage />} />
              <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
              <Route path="/track" element={<TrackOrderPage />} />
              <Route path="/track-order" element={<Navigate to="/track" replace />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/master" element={<AuthPage adminMode />} />
              <Route path="/admin/login" element={<Navigate to="/master" replace />} />
              <Route path="/admin-login" element={<Navigate to="/master" replace />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/:tab" element={<AdminPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/shipping-info" element={<ShippingInfoPage />} />
              <Route path="/returns-exchanges" element={<ReturnsExchangesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
