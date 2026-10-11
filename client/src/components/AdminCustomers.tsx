import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Mail, ShoppingBag, Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

const SORT_OPTIONS = [
  { value: "top_spenders", label: "Top Spenders" },
  { value: "most_orders", label: "Most Orders" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name_az", label: "Name A → Z" },
  { value: "name_za", label: "Name Z → A" },
];

const AdminCustomers = ({ onViewHistory }: { onViewHistory?: (email: string) => void }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("top_spenders");

  const filteredCustomers = customers.filter(c => 
    (c.display_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
    (c.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchCustomers();
  }, [page, sortBy]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>(`/admin/users?page=${page}&limit=20&sort=${sortBy}`);
      setCustomers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search customers by name or email..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground whitespace-nowrap">Sort:</span>
          <Select value={sortBy} onValueChange={(val) => { setSortBy(val); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-md border border-border bg-card">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead>Total Spent</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10">Loading customers...</TableCell>
            </TableRow>
          ) : filteredCustomers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                {searchTerm ? "No customers found matching your search" : "No customers found"}
              </TableCell>
            </TableRow>
          ) : (
            filteredCustomers.map((customer) => (
              <TableRow key={customer._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{customer.display_name?.charAt(0) || customer.email.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{customer.display_name || "N/A"}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {customer.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs">{format(new Date(customer.createdAt), "MMM d, yyyy, h:mm a")}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3 text-muted-foreground" />
                    <span>{customer.orderCount}</span>
                  </div>
                </TableCell>
                <TableCell className="font-semibold text-emerald-500">
                  ৳{(customer.totalSpent || 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onViewHistory && onViewHistory(customer.email)}>
                    View History
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-xs text-muted-foreground font-medium">
            SHOWING {((page - 1) * 20) + 1} - {Math.min(page * 20, pagination.total)} OF {pagination.total} CUSTOMERS
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-8 text-[10px] tracking-wider rounded-lg border-border/40"
            >
              PREVIOUS
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.pages}
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              className="h-8 text-[10px] tracking-wider rounded-lg border-border/40"
            >
              NEXT
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
