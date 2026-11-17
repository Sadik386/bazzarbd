import { useMemo, useState } from "react";
import { Briefcase, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobs } from "@/hooks/useCatalog";
import { BRAND, getId } from "@/lib/format";
import type { Job } from "@/types";

export function CareersPage() {
  const { data: jobs = [], isLoading } = useJobs();
  const [department, setDepartment] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const departments = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => j.department && set.add(j.department));
    return ["all", ...Array.from(set)];
  }, [jobs]);

  const filtered = useMemo(
    () => (department === "all" ? jobs : jobs.filter((j) => j.department === department)),
    [jobs, department]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6">
      <div className="space-y-3 border-b border-border pb-6">
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">Careers at BazzarBD</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Join our textile sourcing, product engineering, and operations team building thoughtful South-Asian commerce in Dhaka.
        </p>
      </div>

      {departments.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {departments.map((dep) => (
            <button
              key={dep}
              type="button"
              onClick={() => setDepartment(dep)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                department === dep
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-foreground/30"
              }`}
            >
              {dep === "all" ? "All departments" : dep}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-2">
          <Briefcase className="mx-auto h-7 w-7 text-muted-foreground" />
          <h2 className="font-display text-2xl">No open roles right now</h2>
          <p className="text-sm text-muted-foreground">
            Send a general introduction to {BRAND.supportEmail}.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {filtered.map((job) => (
            <div
              key={getId(job)}
              className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">{job.title}</h2>
                  <Badge variant="secondary">{job.department}</Badge>
                  <Badge variant="outline">{job.type}</Badge>
                </div>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{job.location}</span>
                  {job.salaryRange && <span>· {job.salaryRange}</span>}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedJob(job)}>
                View role
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-xl">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedJob.title}</DialogTitle>
                <DialogDescription>
                  {selectedJob.department} · {selectedJob.location} · {selectedJob.type}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] space-y-4 overflow-y-auto text-sm leading-relaxed text-foreground/90">
                <div>
                  <p className="mb-1 text-xs font-semibold text-foreground">About the role</p>
                  <p className="whitespace-pre-line text-muted-foreground">{selectedJob.description}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-foreground">Requirements</p>
                  <p className="whitespace-pre-line text-muted-foreground">{selectedJob.requirements}</p>
                </div>
                {selectedJob.salaryRange && (
                  <p className="text-xs font-medium text-foreground">
                    Compensation: {selectedJob.salaryRange}
                  </p>
                )}
              </div>
              <div className="flex justify-end pt-2">
                <Button asChild>
                  <a href={`mailto:${BRAND.supportEmail}?subject=Application: ${encodeURIComponent(selectedJob.title)}`}>
                    Apply via email
                  </a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
