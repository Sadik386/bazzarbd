import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminProductList from "@/components/AdminProductList";
import AdminProductForm from "@/components/AdminProductForm";
import AdminOrders from "@/components/AdminOrders";
import AdminCustomers from "@/components/AdminCustomers";
import AdminAnalytics from "@/components/AdminAnalytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, Package, Tag, ShoppingBag, Users, BarChart3, Lock, Star, Clock, Download, LayoutGrid, Briefcase, Headset, Ruler } from "lucide-react";
import { format } from "date-fns";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AdminCoupons from "@/components/AdminCoupons";
import AdminReviews from "@/components/AdminReviews";
import AdminSettings from "@/components/AdminSettings";
import AdminCategories from "@/components/AdminCategories";
import AdminSubcategories from "@/components/AdminSubcategories";
import AdminCareers from "@/components/AdminCareers";
import AdminSupport from "@/components/AdminSupport";
import AdminSizeCharts from "@/components/AdminSizeCharts";
import NotFound from "@/pages/NotFound";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { tab } = useParams();
  const activeTab = tab || "analytics";

  const [initialOrderSearch, setInitialOrderSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!tab) {
      navigate("/admin/analytics", { replace: true });
    }
  }, [tab, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const adminRoles = ['SUPPORT_AGENT', 'CONTENT_MANAGER', 'ORDER_MANAGER', 'SUPER_ADMIN'];
  const isAdmin = user && adminRoles.includes(user.role || "") && localStorage.getItem("admin_session") === "true";

  if (!user || !isAdmin) {
    // If not admin, return a 404 page so the existence of /admin is completely hidden from the public
    return <NotFound />;
  }

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setIsAdding(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsAdding(true);
  };

  const handleViewHistory = (email: string) => {
    setInitialOrderSearch(email);
    navigate("/admin/orders");
  };

  const handleExport = async (type: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5001/api"}/admin/export/${type}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-24 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary rounded-xl">
            <LayoutDashboard className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your store products, orders, and data.</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-sm font-medium text-foreground bg-card px-3 py-1.5 rounded-md border border-border shadow-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {format(currentTime, "MMM d, yyyy • h:mm:ss a")}
          </div>
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2 w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </Button>
        </div>
      </div>

      {isAdding ? (
        <AdminProductForm 
          product={editingProduct} 
          onCancel={() => setIsAdding(false)} 
          onSuccess={() => setIsAdding(false)} 
        />
      ) : (
        <Tabs value={activeTab} onValueChange={(val) => navigate(`/admin/${val}`)} className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          <TabsList data-lenis-prevent className="flex flex-row lg:flex-col justify-start h-auto w-full lg:w-64 gap-1 p-2 bg-muted/30 overflow-x-auto lg:overflow-y-auto shrink-0 no-scrollbar rounded-xl border border-border/40 lg:sticky lg:top-24 lg:max-h-[80vh]">
            <TabsTrigger value="analytics" className="justify-start gap-3 lg:w-full px-4 py-3 text-sm lg:text-base font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:bg-background">
              <BarChart3 className="w-5 h-5 shrink-0" /> Stats
            </TabsTrigger>
            <TabsTrigger value="products" className="justify-start gap-3 lg:w-full px-4 py-3 text-sm lg:text-base font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:bg-background">
              <Package className="w-5 h-5 shrink-0" /> Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="justify-start gap-3 lg:w-full px-4 py-3 text-sm lg:text-base font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:bg-background">
              <ShoppingBag className="w-5 h-5 shrink-0" /> Orders
            </TabsTrigger>
            <TabsTrigger value="customers" className="justify-start gap-3 lg:w-full px-4 py-3 text-sm lg:text-base font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:bg-background">
              <Users className="w-5 h-5 shrink-0" /> Customers
            </TabsTrigger>
            <TabsTrigger value="coupons" className="justify-start gap-3 lg:w-full px-4 py-3 text-sm lg:text-base font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:bg-background">
              <Tag className="w-5 h-5 shrink-0" /> Coupons
            </TabsTrigger>
            <TabsTrigger value="reviews" className="justify-start gap-3 lg:w-full px-4 py-3 text-sm lg:text-base font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:bg-background">
              <Star className="w-5 h-5 shrink-0" /> Reviews
            </TabsTrigger>
            <TabsTrigger value="categories" className="justify-start gap-3 lg:w-full px-4 py-3 text-sm lg:text-base font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:bg-background">
              <LayoutGrid className="w-5 h-5 shrink-0" /> Categories
            </TabsTrigger>
            <TabsTrigger value="subcategories" className="justify-start gap-3 lg:w-full px-4 py-3 text-sm lg:text-base font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:bg-background">
              <LayoutGrid className="w-5 h-5 shrink-0" /> Subcategories
            </TabsTrigger>
            <TabsTrigger value="size-charts" className="justify-start gap-3 lg:w-full px-4 py-3 text-sm lg:text-base font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:bg-background">
              <Ruler className="w-5 h-5 shrink-0" /> Size Charts
            </TabsTrigger>
            <TabsTrigger value="settings" className="justify-start gap-3 lg:w-full px-4 py-3 text-sm lg:text-base font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:bg-background">
              <LayoutDashboard className="w-5 h-5 shrink-0" /> CMS
            </TabsTrigger>
            <TabsTrigger value="support" className="justify-start gap-3 lg:w-full px-4 py-3 text-sm lg:text-base font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:bg-background">
              <Headset className="w-5 h-5 shrink-0" /> Support
            </TabsTrigger>
            <TabsTrigger value="careers" className="justify-start gap-3 lg:w-full px-4 py-3 text-sm lg:text-base font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:bg-background">
              <Briefcase className="w-5 h-5 shrink-0" /> Careers
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 min-w-0 w-full space-y-6">

          <TabsContent value="analytics" className="space-y-6">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Products Management</CardTitle>
                  <CardDescription>View, edit, and add new products to your catalog.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExport("products")} className="gap-2">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <AdminProductList 
                  onEdit={handleEditProduct} 
                  onAdd={handleAddProduct} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Orders Management</CardTitle>
                  <CardDescription>Track and update order fulfillment status.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExport("orders")} className="gap-2">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <AdminOrders initialSearch={initialOrderSearch} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Customer Directory</CardTitle>
                  <CardDescription>View customer registration data and shopping history.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExport("users")} className="gap-2">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <AdminCustomers onViewHistory={handleViewHistory} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coupons">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Coupons & Discounts</CardTitle>
                <CardDescription>Create and manage discount codes for your customers.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminCoupons />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Review Moderation</CardTitle>
                <CardDescription>Approve or reject customer reviews before they go public.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminReviews />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Category Management</CardTitle>
                <CardDescription>Organize your products by creating and managing categories.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminCategories />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subcategories">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Subcategory Management</CardTitle>
                <CardDescription>Organize your products by creating and managing nested subcategories.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminSubcategories />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>

          <TabsContent value="size-charts">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Size Chart Templates</CardTitle>
                <CardDescription>Create reusable size charts for different product types (Shirt, Pant, Cap, etc.).</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminSizeCharts />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <Card className="glass">
              <CardContent className="p-6">
                <AdminSupport />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="careers" className="space-y-6">
            <AdminCareers />
          </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
};

export default Admin;
