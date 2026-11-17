import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Eye, PackageCheck, ShoppingBag, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatBDT, getId, getProductTotalStock } from "@/lib/format";
import type { AdminAnalytics, AdminStats } from "@/types";

export function AdminAnalyticsTab() {
  const { data: analytics, isLoading: loadingAnalytics } = useQuery<AdminAnalytics>({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get("/admin/analytics"),
  });

  const { data: stats, isLoading: loadingStats } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats"),
  });

  if (loadingAnalytics || loadingStats) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const kpis = [
    {
      label: "Gross Revenue",
      value: formatBDT(analytics?.totalRevenue ?? stats?.totals?.revenue ?? 0),
      sub: `30d: ${formatBDT(stats?.totals?.recentRevenue ?? 0)}`,
      icon: TrendingUp,
    },
    {
      label: "Total Orders",
      value: String(analytics?.totalOrders ?? stats?.totals?.orders ?? 0),
      sub: `${analytics?.completedOrders ?? 0} delivered`,
      icon: ShoppingBag,
    },
    {
      label: "Dispatch Rate",
      value: `${analytics?.dispatchRate ?? 100}%`,
      sub: "Shipped + delivered share",
      icon: PackageCheck,
    },
    {
      label: "Unique Visitors",
      value: String(analytics?.uniqueVisitors ?? 0),
      sub: `Today: ${stats?.totals?.todayVisitors ?? 0}`,
      icon: Eye,
    },
  ];

  const chartData = analytics?.revenueChart || [];
  const lowStock = stats?.lowStockProducts || [];
  const statusRows = stats?.ordersByStatus || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="tabular-price text-2xl font-semibold text-foreground">{kpi.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>7-Day Revenue Trajectory</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No order revenue recorded in the last 7 days.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E0D8" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(val: number) => [formatBDT(val), "Revenue"]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E3E0D8",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="amount" fill="#2D4A3E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {statusRows.map((row) => (
                  <li key={row._id} className="flex items-center justify-between py-2.5">
                    <span className="capitalize text-foreground">{row._id}</span>
                    <Badge variant="secondary" className="tabular-price">
                      {row.count}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {lowStock.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <CardTitle>Low Stock Watchlist (≤ 5 units)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {lowStock.map((p) => (
                <li key={getId(p)} className="flex items-center justify-between py-2.5">
                  <span className="font-medium text-foreground">{p.name}</span>
                  <Badge variant="warning" className="tabular-price">
                    {getProductTotalStock(p)} total left
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
