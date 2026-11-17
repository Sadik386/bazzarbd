import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getId } from "@/lib/format";
import type { Job } from "@/types";

export function AdminCareersTab() {
  const queryClient = useQueryClient();
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["admin-jobs"],
    queryFn: () => api.get("/jobs?all=true"),
  });

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Operations");
  const [location, setLocation] = useState("Dhaka, Bangladesh");
  const [type, setType] = useState("Full-time");
  const [salaryRange, setSalaryRange] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/jobs", {
        title: title.trim(),
        department: department.trim(),
        location: location.trim(),
        type: type.trim(),
        salaryRange: salaryRange.trim() || undefined,
        description: description.trim(),
        requirements: requirements.trim(),
        is_active: isActive,
      });
      toast.success("Job posting published");
      setTitle("");
      setDescription("");
      setRequirements("");
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish role");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (job: Job) => {
    try {
      await api.put(`/jobs/${getId(job)}`, { ...job, is_active: !job.is_active });
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    } catch {
      toast.error("Failed to toggle job visibility");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/jobs/${id}`);
      toast.success("Job posting deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    } catch {
      toast.error("Failed to delete role");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>New Role Posting</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="job-title">Title</Label>
              <Input
                id="job-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Garment Merchandising Lead"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="job-dept">Department</Label>
                <Input
                  id="job-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="job-type">Type</Label>
                <Input
                  id="job-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="job-loc">Location</Label>
                <Input
                  id="job-loc"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="job-sal">Salary range</Label>
                <Input
                  id="job-sal"
                  value={salaryRange}
                  onChange={(e) => setSalaryRange(e.target.value)}
                  placeholder="৳40,000 – ৳60,000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-desc">Description</Label>
              <Textarea
                id="job-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-req">Requirements</Label>
              <Textarea
                id="job-req"
                rows={3}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
              <span>Active immediately</span>
            </label>

            <Button type="submit" className="w-full gap-1.5" isLoading={saving}>
              <Plus className="h-4 w-4" />
              Post role
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle>Job Openings ({jobs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No job postings yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {jobs.map((job) => (
                <li key={getId(job)} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{job.title}</span>
                      <Badge variant={job.is_active ? "success" : "secondary"}>
                        {job.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {job.department} · {job.location} · {job.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => handleToggleActive(job)}>
                      {job.is_active ? "Pause" : "Activate"}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(getId(job))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
