import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartSidebar from "@/components/CartSidebar";
import AnimatedRoutes from "./components/AnimatedRoutes";
import SmoothScroll from "./components/SmoothScroll";
import ScrollToTop from "./components/ScrollToTop";
import { api } from "@/lib/api";
import Vacation from "@/pages/Vacation";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const [vacationSettings, setVacationSettings] = useState<{ enabled: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkVacationMode = async () => {
      try {
        const res = await api.get<any>("/settings/vacation_mode");
        console.log("[AppContent] Vacation mode setting fetched:", res);
        if (res) {
          setVacationSettings(res);
        } else {
          setVacationSettings({ enabled: false, message: "" });
        }
      } catch (err) {
        console.error("Failed to fetch vacation mode status:", err);
      } finally {
        setLoading(false);
      }
    };
    checkVacationMode();
  }, [location.pathname]);

  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/master");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (vacationSettings?.enabled && !isAdminRoute) {
    return <Vacation message={vacationSettings.message} />;
  }

  return (
    <>
      <ScrollToTop />
      <Header />
      <CartSidebar />
      <main id="main-content" className="flex-1 flex flex-col">
        <AnimatedRoutes />
      </main>
      <Footer />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <SmoothScroll>
                <Toaster />
                <Sonner />
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AppContent />
                </BrowserRouter>
              </SmoothScroll>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
