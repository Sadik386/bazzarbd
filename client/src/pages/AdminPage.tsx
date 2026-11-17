import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BarChart3,
  Box,
  Briefcase,
  FolderTree,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  MessageSquareMore,
  Ruler,
  Settings,
  ShoppingCart,
  Store,
  Tag,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminAnalyticsTab } from "@/pages/admin/AdminAnalyticsTab";
import { AdminCareersTab } from "@/pages/admin/AdminCareersTab";
import { AdminCategoriesTab } from "@/pages/admin/AdminCategoriesTab";
import { AdminCouponsTab } from "@/pages/admin/AdminCouponsTab";
import { AdminCustomersTab } from "@/pages/admin/AdminCustomersTab";
import { AdminInventoryTab } from "@/pages/admin/AdminInventoryTab";
import { AdminModerationTab } from "@/pages/admin/AdminModerationTab";
import { AdminOrdersTab } from "@/pages/admin/AdminOrdersTab";
import { AdminProductsTab } from "@/pages/admin/AdminProductsTab";
import { AdminSettingsTab } from "@/pages/admin/AdminSettingsTab";
import { AdminSizeChartsTab } from "@/pages/admin/AdminSizeChartsTab";
import { AdminSupportTab } from "@/pages/admin/AdminSupportTab";
import { isAdminRole, useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const ADMIN_TABS = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "orders", label: "Orders & Couriers", icon: ShoppingCart },
  { id: "products", label: "Products & AI", icon: Box },
  { id: "inventory", label: "Inventory Forecast", icon: LayoutGrid },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "size-charts", label: "Size Charts", icon: Ruler },
  { id: "customers", label: "Customers", icon: Users },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "moderation", label: "Reviews & Q&A", icon: MessageSquareMore },
  { id: "support", label: "Support Tickets", icon: LifeBuoy },
  { id: "careers", label: "Careers", icon: Briefcase },
  { id: "settings", label: "Store Settings", icon: Settings },
] as const;

type AdminTabId = (typeof ADMIN_TABS)[number]["id"];

export function AdminPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const logout = useAuthStore((s) => s.logout);

  const activeTab: AdminTabId =
    ADMIN_TABS.find((t) => t.id === tab)?.id || "analytics";

  if (!initialized) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verifying session...</p>
      </div>
    );
  }

  if (!user || !isAdminRole(user.role)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="font-display text-3xl text-foreground">Admin Access Required</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with an administrator account via the elevated portal to access operations.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button asChild>
              <Link to="/master">Admin Sign In</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Storefront</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Desktop Sidebar Rail */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border px-5 py-4">
          <Link to="/" className="block">
            <BrandMark />
          </Link>
          <div className="mt-3 flex items-center justify-between">
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            <Badge variant="default" className="text-[10px]">
              {user.role}
            </Badge>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Admin navigation">
          {ADMIN_TABS.map((item) => {
            const active = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/admin/${item.id}`)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="space-y-1.5 border-t border-border p-3">
          <Button variant="outline" size="sm" asChild className="w-full justify-start gap-2">
            <Link to="/">
              <Store className="h-4 w-4" />
              Back to storefront
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-5 py-4 lg:px-8">
          <div>
            <h1 className="font-display text-3xl text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              {ADMIN_TABS.find((t) => t.id === activeTab)?.label} · BazzarBD Operations
            </p>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Storefront</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </header>

        {/* Mobile Tab Strip */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-border bg-card px-4 py-2.5 lg:hidden">
          {ADMIN_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/admin/${item.id}`)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                item.id === activeTab
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <main className="flex-1 p-5 lg:p-8">
          {activeTab === "analytics" && <AdminAnalyticsTab />}
          {activeTab === "orders" && <AdminOrdersTab />}
          {activeTab === "products" && <AdminProductsTab />}
          {activeTab === "inventory" && <AdminInventoryTab />}
          {activeTab === "categories" && <AdminCategoriesTab />}
          {activeTab === "size-charts" && <AdminSizeChartsTab />}
          {activeTab === "customers" && <AdminCustomersTab />}
          {activeTab === "coupons" && <AdminCouponsTab />}
          {activeTab === "moderation" && <AdminModerationTab />}
          {activeTab === "support" && <AdminSupportTab />}
          {activeTab === "careers" && <AdminCareersTab />}
          {activeTab === "settings" && <AdminSettingsTab />}
        </main>
      </div>
    </div>
  );
}
