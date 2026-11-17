import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, downloadBlob } from "@/lib/api";
import { formatBDT, formatDate } from "@/lib/format";
import type { AdminUser } from "@/types";

export function AdminCustomersTab() {
  const [sort, setSort] = useState("top_spenders");

  const { data: users = [] } = useQuery<AdminUser[]>({
    queryKey: ["admin-users", sort],
    queryFn: async () => {
      const res = await api.get<{ users: AdminUser[] }>(`/admin/users?limit=150&sort=${sort}`);
      return res.users || [];
    },
  });

  const handleExport = async () => {
    try {
      const blob = await api.getBlob("/admin/export/users");
      downloadBlob(blob, `customers-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      toast.error("Failed to export customer CSV");
    }
  };

  const columns: ColumnDef<AdminUser>[] = [
    {
      accessorKey: "display_name",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.display_name || "Customer"}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: "orderCount",
      header: "Orders",
      cell: ({ row }) => <span className="tabular-price">{row.original.orderCount}</span>,
    },
    {
      accessorKey: "totalSpent",
      header: "Total Spent",
      cell: ({ row }) => (
        <span className="tabular-price font-medium">{formatBDT(row.original.totalSpent)}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      searchPlaceholder="Search customers..."
      actions={
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top_spenders">Top spenders</SelectItem>
              <SelectItem value="most_orders">Most orders</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="name_az">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      }
    />
  );
}
