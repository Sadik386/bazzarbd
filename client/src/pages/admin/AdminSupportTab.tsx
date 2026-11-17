import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatDate, getId } from "@/lib/format";
import type { SupportTicket } from "@/types";

export function AdminSupportTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const { data: tickets = [] } = useQuery<SupportTicket[]>({
    queryKey: ["admin-tickets", statusFilter],
    queryFn: async () => {
      const res = await api.get<{ tickets: SupportTicket[] }>(
        `/support/tickets?status=${statusFilter}&limit=50`
      );
      return res.tickets || [];
    },
  });

  const handleReply = async (id: string) => {
    const message = (replies[id] || "").trim();
    if (!message) return;
    setSendingId(id);
    try {
      await api.post(`/support/tickets/${id}/reply`, { message });
      toast.success("Email reply sent to customer");
      setReplies((prev) => ({ ...prev, [id]: "" }));
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reply");
    } finally {
      setSendingId(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.put(`/support/tickets/${id}/status`, { status });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    } catch {
      toast.error("Failed to update ticket status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/support/tickets/${id}`);
      toast.success("Ticket deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    } catch {
      toast.error("Failed to delete ticket");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tickets.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No support tickets in this view.
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => {
            const tid = getId(t);
            return (
              <Card key={tid}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{t.subject || "Support Request"}</CardTitle>
                      <Badge
                        variant={
                          t.status === "open"
                            ? "warning"
                            : t.status === "replied"
                              ? "success"
                              : "secondary"
                        }
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.name} ({t.email}) · {formatDate(t.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={t.status} onValueChange={(v) => handleStatusChange(tid, v)}>
                      <SelectTrigger className="h-8 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="replied">Replied</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(tid)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-sm">
                  <p className="rounded-lg border border-border bg-secondary/40 p-3.5 text-foreground/90">
                    {t.message}
                  </p>

                  {t.replies?.length > 0 && (
                    <div className="space-y-2 border-l-2 border-primary/40 pl-3.5">
                      {t.replies.map((r, i) => (
                        <div key={r._id || i} className="text-xs">
                          <span className="font-medium text-foreground">{r.repliedBy}</span>{" "}
                          <span className="text-muted-foreground">({formatDate(r.createdAt)})</span>
                          <p className="mt-0.5 text-sm text-foreground/90">{r.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <Textarea
                      rows={2}
                      value={replies[tid] || ""}
                      onChange={(e) => setReplies((prev) => ({ ...prev, [tid]: e.target.value }))}
                      placeholder="Write email reply..."
                    />
                    <Button
                      onClick={() => handleReply(tid)}
                      isLoading={sendingId === tid}
                      className="shrink-0 gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Reply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
