import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Send, Clock, CheckCircle, XCircle, MessageSquare, ChevronDown, ChevronUp, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Reply {
  message: string;
  repliedBy: string;
  createdAt: string;
}

interface Ticket {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "replied" | "closed";
  replies: Reply[];
  createdAt: string;
}

const statusConfig = {
  open: { label: "Open", icon: Clock, color: "bg-amber-100 text-amber-700 border-amber-200" },
  replied: { label: "Replied", icon: CheckCircle, color: "bg-blue-100 text-blue-700 border-blue-200" },
  closed: { label: "Closed", icon: XCircle, color: "bg-gray-100 text-gray-500 border-gray-200" },
};

const AdminSupport = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const fetchTickets = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await api.get<{ tickets: Ticket[]; pagination: any }>(
        `/support/tickets?status=${statusFilter}&page=${page}&limit=15`
      );
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleReply = async (ticketId: string) => {
    const msg = replyText[ticketId]?.trim();
    if (!msg) return;

    setSendingReply(ticketId);
    try {
      await api.post(`/support/tickets/${ticketId}/reply`, { message: msg });
      toast({ title: "Reply Sent!", description: "The customer has been notified via email." });
      setReplyText(prev => ({ ...prev, [ticketId]: "" }));
      fetchTickets(pagination.page);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to send reply." });
    } finally {
      setSendingReply(null);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await api.put(`/support/tickets/${ticketId}/status`, { status: newStatus });
      toast({ title: "Status Updated" });
      fetchTickets(pagination.page);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    try {
      await api.delete(`/support/tickets/${ticketId}`);
      toast({ title: "Ticket Deleted" });
      fetchTickets(pagination.page);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const statusCounts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6" /> Support Centre
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {pagination.total} total ticket{pagination.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchTickets(pagination.page)} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "open", "replied", "closed"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize"
          >
            {s === "all" ? "All" : statusConfig[s as keyof typeof statusConfig].label}
          </Button>
        ))}
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No tickets found</p>
          <p className="text-sm">Customer messages will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const config = statusConfig[ticket.status];
            const StatusIcon = config.icon;
            const isExpanded = expandedTicket === ticket._id;

            return (
              <Card key={ticket._id} className="border shadow-sm overflow-hidden transition-all hover:shadow-md">
                {/* Ticket Header */}
                <div
                  className="flex items-start sm:items-center justify-between p-4 cursor-pointer gap-3"
                  onClick={() => setExpandedTicket(isExpanded ? null : ticket._id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
                        <StatusIcon className="w-3 h-3" /> {config.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ticket.createdAt), "MMM d, yyyy • h:mm a")}
                      </span>
                      {ticket.replies.length > 0 && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {ticket.replies.length} {ticket.replies.length === 1 ? "reply" : "replies"}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base truncate">{ticket.subject || "No Subject"}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      From: <span className="font-medium text-foreground">{ticket.name}</span> &lt;{ticket.email}&gt;
                    </p>
                  </div>
                  <div className="shrink-0">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <CardContent className="border-t pt-4 space-y-4">
                    {/* Customer Message */}
                    <div className="bg-muted/40 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {ticket.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{ticket.name}</p>
                          <p className="text-xs text-muted-foreground">{ticket.email}</p>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
                    </div>

                    {/* Previous Replies */}
                    {ticket.replies.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Replies</p>
                        {ticket.replies.map((reply, i) => (
                          <div key={i} className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">A</div>
                              <div>
                                <p className="text-sm font-medium">{reply.repliedBy}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(reply.createdAt), "MMM d, yyyy • h:mm a")}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Box */}
                    {ticket.status !== "closed" && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Write a Reply</p>
                        <Textarea
                          value={replyText[ticket._id] || ""}
                          onChange={(e) => setReplyText(prev => ({ ...prev, [ticket._id]: e.target.value }))}
                          placeholder="Type your reply here... This will be emailed to the customer."
                          rows={4}
                          className="resize-none rounded-xl"
                        />
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleReply(ticket._id)}
                              disabled={sendingReply === ticket._id || !replyText[ticket._id]?.trim()}
                              className="gap-2"
                            >
                              {sendingReply === ticket._id ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4" /> Send Reply
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(ticket._id, "closed")}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Close Ticket
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(ticket._id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Closed ticket actions */}
                    {ticket.status === "closed" && (
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(ticket._id, "open")}
                        >
                          Reopen Ticket
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(ticket._id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => fetchTickets(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.pages}
            onClick={() => fetchTickets(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
