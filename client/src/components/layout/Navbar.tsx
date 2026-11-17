import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Heart,
  LogOut,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  User as UserIcon,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import { isAdminRole, useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { useConciergeStore } from "@/stores/conciergeStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/products", label: "Collection" },
  { to: "/track", label: "Track Order" },
  { to: "/about", label: "Atelier" },
  { to: "/support", label: "Support" },
];

export function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = isAdminRole(user?.role);

  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const setCartOpen = useCartStore((s) => s.setOpen);

  const wishlistCount = useWishlistStore((s) => s.items.length);
  const setSearchOpen = useConciergeStore((s) => s.setSearchOpen);
  const setConciergeOpen = useConciergeStore((s) => s.setOpen);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Brand & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground md:hidden"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <Link to="/" className="shrink-0 focus:outline-none">
            <BrandMark />
          </Link>
        </div>

        {/* Center: Clean Desktop Navigation */}
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-foreground/75"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: Utility Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search catalog"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Search</span>
            <kbd className="hidden rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] lg:inline">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setConciergeOpen(true)}
            aria-label="Open AI Concierge"
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary sm:inline-flex"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="hidden xl:inline">Concierge</span>
          </button>

          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:border-foreground/30"
          >
            <Heart className="h-4 w-4" />
            {wishlistCount > 0 && (
              <span className="tabular-price absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {wishlistCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link
                to="/orders"
                aria-label="My Orders"
                title="My Orders"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:border-foreground/30"
              >
                <Package className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Orders</span>
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  aria-label="Admin Dashboard"
                  title="Admin Workspace"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/15"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Admin</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Button variant="outline" size="sm" asChild className="hidden h-9 sm:inline-flex">
              <Link to="/auth">
                <UserIcon className="h-3.5 w-3.5" />
                <span>Sign in</span>
              </Link>
            </Button>
          )}

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label="Open shopping bag"
            className="relative inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-primary"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="tabular-price">{cartCount}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden">
          <nav className="flex flex-col space-y-1">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setConciergeOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-primary hover:bg-secondary"
            >
              <Sparkles className="h-4 w-4" />
              Atelier Concierge
            </button>

            <div className="my-2 border-t border-border pt-2">
              {user ? (
                <>
                  <Link
                    to="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    My Orders
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-secondary"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-secondary"
                >
                  Sign in / Create account
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
