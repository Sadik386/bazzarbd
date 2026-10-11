import { lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./PageTransition";

// Robust lazy wrapper that automatically recovers and reloads the page if a chunk is missing (e.g. after a new deployment)
const lazyWithRetry = (componentImport: () => Promise<any>) => {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Dynamic chunk loading failed. Triggering auto-reload for latest assets...", error);
      window.location.reload();
      return { default: () => null };
    }
  });
};

// Lazy load pages for better performance
const Index = lazyWithRetry(() => import("@/pages/Index"));
const Products = lazyWithRetry(() => import("@/pages/Products"));
const ProductDetail = lazyWithRetry(() => import("@/pages/ProductDetail"));
const Checkout = lazyWithRetry(() => import("@/pages/Checkout"));
const Orders = lazyWithRetry(() => import("@/pages/Orders"));
const OrderConfirmation = lazyWithRetry(() => import("@/pages/OrderConfirmation"));
const Auth = lazyWithRetry(() => import("@/pages/Auth"));
const ResetPassword = lazyWithRetry(() => import("@/pages/ResetPassword"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));
const Admin = lazyWithRetry(() => import("@/pages/Admin"));
const Wishlist = lazyWithRetry(() => import("@/pages/Wishlist"));
const Support = lazyWithRetry(() => import("@/pages/Support"));
const About = lazyWithRetry(() => import("@/pages/About"));
const AdminLogin = lazyWithRetry(() => import("@/pages/AdminLogin"));
const Careers = lazyWithRetry(() => import("@/pages/Careers"));
const ShippingInfo = lazyWithRetry(() => import("@/pages/ShippingInfo"));
const ReturnsExchanges = lazyWithRetry(() => import("@/pages/ReturnsExchanges"));
const TrackOrder = lazyWithRetry(() => import("@/pages/TrackOrder"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);





const AnimatedRoutes = () => {
  const location = useLocation();

  // Group all admin sub-tab paths under a single key to prevent unmounting and re-animating the whole dashboard frame on tab change
  const getRouteKey = (pathname: string) => {
    if (pathname.startsWith("/admin")) {
      return "/admin";
    }
    return pathname;
  };

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={getRouteKey(location.pathname)}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/products" element={<PageTransition><Products /></PageTransition>} />
        <Route path="/products/categories/:categoryGroup" element={<PageTransition><Products /></PageTransition>} />
        <Route path="/product/:slug" element={<PageTransition><ProductDetail /></PageTransition>} />
        <Route path="/wishlist" element={<PageTransition><Wishlist /></PageTransition>} />
        <Route path="/checkout" element={<PageTransition><Checkout /></PageTransition>} />
        <Route path="/orders" element={<PageTransition><Orders /></PageTransition>} />
        <Route path="/order/:orderId" element={<PageTransition><OrderConfirmation /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/reset-password/:token" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/master" element={<PageTransition><AdminLogin /></PageTransition>} />
        <Route path="/admin-login" element={<Navigate to="/master" replace />} />
        <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
        <Route path="/admin/:tab" element={<PageTransition><Admin /></PageTransition>} />
        <Route path="/support" element={<PageTransition><Support /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/careers" element={<PageTransition><Careers /></PageTransition>} />
        <Route path="/shipping-info" element={<PageTransition><ShippingInfo /></PageTransition>} />
        <Route path="/returns-exchanges" element={<PageTransition><ReturnsExchanges /></PageTransition>} />
        <Route path="/track" element={<PageTransition><TrackOrder /></PageTransition>} />
        <Route path="/track-order" element={<Navigate to="/track" replace />} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />



      </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
