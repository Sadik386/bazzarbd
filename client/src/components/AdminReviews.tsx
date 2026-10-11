import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Star } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

const AdminReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>(`/reviews/pending?page=${page}&limit=20`);
      setReviews(data.reviews);
      setPagination(data.pagination);
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch pending reviews", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [page]);

  const handleModerate = async (id: string, is_moderated: boolean) => {
    try {
      await api.put(`/reviews/${id}/moderate`, { is_moderated });
      toast({ title: is_moderated ? "Approved" : "Rejected", description: "Review status updated" });
      fetchReviews();
    } catch (err) {
      toast({ title: "Error", description: "Action failed", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/reviews/${id}`);
      toast({ title: "Deleted", description: "Review removed" });
      fetchReviews();
    } catch (err) {
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/20 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-[10px] uppercase tracking-widest">User</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Rating</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Comment</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Date</TableHead>
              <TableHead className="text-[10px] uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">No pending reviews</TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review._id}>
                  <TableCell className="font-medium">{review.user_name}</TableCell>
                  <TableCell>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "fill-current" : ""}`} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md truncate">{review.comment}</TableCell>
                  <TableCell>{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" onClick={() => handleModerate(review._id, true)} className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => setDeleteTarget(review._id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
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
            SHOWING {((page - 1) * 20) + 1} - {Math.min(page * 20, pagination.total)} OF {pagination.total} REVIEWS
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Review"
        description="Are you sure you want to delete this review? This action cannot be undone."
        confirmLabel="Delete Review"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
};

export default AdminReviews;
