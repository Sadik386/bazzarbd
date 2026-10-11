import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingCart,
  Search,
  Menu,
  X,
  User,
  LogOut,
  ClipboardList,
  LayoutDashboard,
  Sun,
  Moon,
  Bell,
} from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ProductSearch from "@/components/ProductSearch";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useProducts";

const Header = () => {
  const { totalItems, openCart } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const { data: dbCategories } = useCategories();
  const isAdminDashboard = location.pathname.startsWith("/admin");
  const isAdmin =
    user &&
    [
      "SUPPORT_AGENT",
      "CONTENT_MANAGER",
      "ORDER_MANAGER",
      "SUPER_ADMIN",
    ].includes(user.role || "");

  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const threshold = 10; // Scroll difference threshold in pixels

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // If near the top, always show the header
      if (currentScrollY < 80) {
        setVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      // Check scroll difference
      const diff = Math.abs(currentScrollY - lastScrollY);
      if (diff < threshold) return;

      if (currentScrollY > lastScrollY) {
        // Scrolling down -> hide
        setVisible(false);
      } else {
        // Scrolling up -> show
        setVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const dynamicCategories =
    dbCategories && dbCategories.length > 0
      ? dbCategories
          .filter((c) => !c.parent_id)
          .map((c) => ({
            label: c.name,
            to: `/products?category=${c.slug}`,
          }))
      : [
          { label: "T-Shirts", to: "/products?category=t-shirts" },
          { label: "Hoodies", to: "/products?category=hoodies" },
          { label: "Pants", to: "/products?category=pants" },
          { label: "Jackets", to: "/products?category=jackets" },
        ];

  const menuLinks: { label: string; to: string; className?: string }[] = [
    { label: "New Arrivals", to: "/products?status=new" },
    { label: "Best Sellers", to: "/products?status=featured" },
    ...dynamicCategories,
    { label: "Support Centre", to: "/support" },
  ];

  const mobileMenuLinks = [
    { label: "New Arrivals", to: "/products?status=new" },
    { label: "Best Sellers", to: "/products?status=featured" },
    ...dynamicCategories,
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col w-full">
      <motion.header
        className="w-full bg-background border-b border-border/50"
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: visible ? 0 : "-100%", opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
        style={{ willChange: 'transform' }}
      >
        {/* Main Header Bar */}
        <div className="container mx-auto px-4 lg:px-8 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 text-foreground/60 rounded-full hover:bg-primary/5 transition-colors"
              aria-label="Toggle Menu"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            <Link
              to="/"
              className="hover:opacity-80 transition-opacity flex items-center h-14 sm:h-20 md:h-24 w-auto"
            >
              <img
                src={
                  theme === "light"
                    ? "/images/logo-light.webp"
                    : "/images/logo-dark.webp"
                }
                alt="Thelagari Logo"
                width="150"
                height="60"
                className="h-full w-auto object-contain transition-all duration-300"
              />
            </Link>
          </div>

          {/* Icon Actions */}
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="relative group">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2.5 text-foreground/60 hover:text-primary transition-colors rounded-full hover:bg-primary/5"
                aria-label="Search"
              >
                <Search className="w-[18px] h-[18px] stroke-[1.5px]" />
              </button>
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl">
                Search
              </span>
            </div>

            {/* <NotificationsDropdown /> */}

            {user ? (
              <>
                {isAdmin && (
                  <div className="relative group">
                    <Link
                      to="/admin"
                      className="p-2.5 text-foreground/60 hover:text-primary transition-colors rounded-full hover:bg-primary/5 flex items-center"
                      aria-label="Admin Dashboard"
                    >
                      <LayoutDashboard className="w-[18px] h-[18px] stroke-[1.5px]" />
                    </Link>
                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl">
                      Dashboard
                    </span>
                  </div>
                )}
                <div className="relative group">
                  <Link
                    to="/orders"
                    className="p-2.5 text-foreground/60 hover:text-primary transition-colors rounded-full hover:bg-primary/5 flex items-center"
                    aria-label="Orders"
                  >
                    <ClipboardList className="w-[18px] h-[18px] stroke-[1.5px]" />
                  </Link>
                  <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl">
                    Orders
                  </span>
                </div>
                <div className="relative group">
                  <button
                    onClick={handleSignOut}
                    className="p-2.5 text-foreground/60 hover:text-primary transition-colors rounded-full hover:bg-primary/5"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-[18px] h-[18px] stroke-[1.5px]" />
                  </button>
                  <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl">
                    Logout
                  </span>
                </div>
              </>
            ) : (
              <div className="relative group">
                <Link
                  to="/auth"
                  className="p-2.5 text-foreground/60 hover:text-primary transition-colors hidden sm:flex items-center gap-2 rounded-full hover:bg-primary/5"
                >
                  <User className="w-[18px] h-[18px] stroke-[1.5px]" />
                  <span className="text-[12px] font-medium tracking-wide">
                    Sign in
                  </span>
                </Link>
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl">
                  Sign In
                </span>
              </div>
            )}

            <div className="relative group">
              <Link
                to="/wishlist"
                className="p-2.5 text-foreground/60 hover:text-primary transition-colors hidden sm:block rounded-full hover:bg-primary/5"
                aria-label="Wishlist"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="none"
                    viewBox="0 0 18 18"
                    className="stroke-[1.5px] stroke-current"
                  >
                    <path d="m9 16.2-1.16-1.036C3.72 11.5 1 9.082 1 6.116 1 3.7 2.936 1.8 5.4 1.8A4.83 4.83 0 0 1 9 3.44a4.83 4.83 0 0 1 3.6-1.64c2.464 0 4.4 1.9 4.4 4.316 0 2.966-2.72 5.383-6.84 9.056z"></path>
                  </svg>
                </motion.div>
              </Link>
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl">
                Wishlist
              </span>
            </div>

            <div className="relative group">
              <button
                onClick={openCart}
                className="relative p-2.5 text-foreground/60 hover:text-primary transition-colors rounded-full hover:bg-primary/5"
                aria-label="Shopping Cart"
              >
                <ShoppingCart className="w-[18px] h-[18px] stroke-[1.5px]" />
                {totalItems > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shadow-lg shadow-primary/30">
                    {totalItems}
                  </span>
                )}
              </button>
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl">
                Cart
              </span>
            </div>

            <div className="relative group">
              <button
                onClick={toggleTheme}
                className="p-2.5 text-foreground/60 hover:text-primary transition-colors rounded-full hover:bg-primary/5 flex items-center"
                aria-label="Toggle Theme"
              >
                {theme === "light" ? (
                  <Moon className="w-[18px] h-[18px] stroke-[1.5px]" />
                ) : (
                  <Sun className="w-[18px] h-[18px] stroke-[1.5px]" />
                )}
              </button>
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl">
                {theme === "light" ? "Dark Mode" : "Light Mode"}
              </span>
            </div>
          </div>
        </div>
      </motion.header>
      <ProductSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-background/50 backdrop-blur-md z-[100]"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-full sm:w-[400px] bg-background border-r border-border/50 shadow-2xl z-[101] flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-border/30">
                <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-50">
                  Categories
                </p>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 ring-1 ring-border rounded-full text-foreground/60 hover:text-primary hover:ring-primary/30 transition-all animate-hover"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Drawer Body */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-6" data-lenis-prevent="true">
                <div className="space-y-2">
                  {mobileMenuLinks.map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className="block text-2xl font-medium tracking-tight hover:text-primary transition-colors py-2 border-b border-border/30"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-border/30 space-y-4">
                {!user ? (
                  <Link
                    to="/auth"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-center gap-3 text-lg font-medium py-3 px-6 bg-primary/10 text-primary rounded-full border border-primary/20 hover:bg-primary/20 transition-all"
                  >
                    <User className="w-5 h-5" /> Sign in
                  </Link>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 py-2 px-3 bg-primary/5 rounded-xl border border-primary/10">
                      <User className="w-5 h-5 text-primary" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-muted-foreground">
                          Logged in as
                        </span>
                        <span className="text-sm font-semibold truncate text-foreground">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setSidebarOpen(false)}
                        className="block text-lg font-medium text-primary hover:underline text-center"
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleSignOut();
                        setSidebarOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 text-sm font-bold tracking-widest text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-full transition-all uppercase"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Theme Toggle (Bottom Right) - OUTSIDE Header for proper scrolling */}
      {isAdminDashboard && (
        <div className="fixed bottom-8 right-6 z-[100] group flex items-center gap-3">
          <span className="px-3 py-1.5 bg-foreground text-background text-[10px] font-bold rounded-full opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 shadow-2xl pointer-events-none">
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
          <button
            onClick={toggleTheme}
            className="p-4 bg-background border border-border shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-2xl text-foreground/70 hover:text-primary hover:border-primary/50 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-6 h-6" />
            ) : (
              <Moon className="w-6 h-6 text-slate-700" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Header;
