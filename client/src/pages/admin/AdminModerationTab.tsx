import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatDate, getId } from "@/lib/format";
import type { Question, Review } from "@/types";

export function AdminModerationTab() {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: pendingReviews = [] } = useQuery<Review[]>({
    queryKey: ["admin-pending-reviews"],
    queryFn: async () => {
      const res = await api.get<{ reviews: Review[] }>("/reviews/pending?limit=50");
      return res.reviews || [];
    },
  });

  const { data: pendingQuestions = [] } = useQuery<Question[]>({
    queryKey: ["admin-pending-questions"],
    queryFn: () => api.get<Question[]>("/questions/pending"),
  });

  const handleModerateReview = async (id: string, approve: boolean) => {
    try {
      if (approve) {
        await api.put(`/reviews/${id}/moderate`, { is_moderated: true });
        toast.success("Review approved");
      } else {
        await api.delete(`/reviews/${id}`);
        toast.success("Review deleted");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-pending-reviews"] });
    } catch {
      toast.error("Moderation action failed");
    }
  };

  const handleAnswerQuestion = async (id: string) => {
    const answer = (answers[id] || "").trim();
    if (!answer) return;
    try {
      await api.put(`/questions/${id}/answer`, { answer });
      toast.success("Answer published");
      queryClient.invalidateQueries({ queryKey: ["admin-pending-questions"] });
    } catch {
      toast.error("Failed to publish answer");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews ({pendingReviews.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">All customer reviews moderated.</p>
          ) : (
            pendingReviews.map((r) => {
              const rid = getId(r);
              return (
                <div key={rid} className="space-y-2 rounded-xl border border-border p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.user_name}</span>
                      {r.is_verified_purchase && <Badge variant="success">Verified</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                  </div>
                  <div className="flex gap-0.5 text-primary">
                    {Array.from({ length: r.rating }).map((_, idx) => (
                      <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground">{r.comment}</p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => handleModerateReview(rid, true)} className="gap-1">
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleModerateReview(rid, false)}
                      className="gap-1 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Product Q&A ({pendingQuestions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unanswered product questions.</p>
          ) : (
            pendingQuestions.map((q) => {
              const qid = getId(q);
              return (
                <div key={qid} className="space-y-2.5 rounded-xl border border-border p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{q.user_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(q.createdAt)}</span>
                  </div>
                  <p className="text-foreground">{q.question}</p>
                  <div className="flex gap-2">
                    <Input
                      value={answers[qid] || ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [qid]: e.target.value }))}
                      placeholder="Write studio answer..."
                    />
                    <Button size="sm" onClick={() => handleAnswerQuestion(qid)}>
                      Publish
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
