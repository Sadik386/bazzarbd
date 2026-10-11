import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit2, Trash2, Briefcase, MapPin, Layers, ToggleLeft, ToggleRight } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

interface Job {
  _id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string;
  salaryRange?: string;
  is_active: boolean;
}

const AdminCareers = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [requirements, setRequirements] = useState<string>("");
  const [salaryRange, setSalaryRange] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  const { toast } = useToast();

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/jobs?all=true");
      if (res && Array.isArray(res)) {
        setJobs(res);
      }
    } catch (err) {
      console.error("Failed to fetch admin jobs:", err);
      toast({ title: "Failed to load job listings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const openCreateDialog = () => {
    setSelectedJob(null);
    setTitle("");
    setDepartment("Tech");
    setLocation("Dhaka, Bangladesh");
    setType("Full-time");
    setDescription("");
    setRequirements("");
    setSalaryRange("");
    setIsActive(true);
    setIsDialogOpen(true);
  };

  const openEditDialog = (job: Job) => {
    setSelectedJob(job);
    setTitle(job.title);
    setDepartment(job.department);
    setLocation(job.location);
    setType(job.type);
    setDescription(job.description);
    setRequirements(job.requirements);
    setSalaryRange(job.salaryRange || "");
    setIsActive(job.is_active);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !department || !location || !type || !description || !requirements) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const payload = {
      title,
      department,
      location,
      type,
      description,
      requirements,
      salaryRange,
      is_active: isActive
    };

    try {
      if (selectedJob) {
        // Update
        await api.put(`/jobs/${selectedJob._id}`, payload);
        toast({ title: "Job listing updated successfully" });
      } else {
        // Create
        await api.post("/jobs", payload);
        toast({ title: "Job vacancy published successfully" });
      }
      setIsDialogOpen(false);
      fetchJobs();
    } catch (err: any) {
      toast({ title: err.message || "Failed to save job listing", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/jobs/${id}`);
      toast({ title: "Job listing deleted" });
      fetchJobs();
    } catch (err: any) {
      toast({ title: err.message || "Failed to delete job listing", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleActiveStatus = async (job: Job) => {
    try {
      const updated = { ...job, is_active: !job.is_active };
      await api.put(`/jobs/${job._id}`, updated);
      toast({ title: `Listing ${!job.is_active ? "activated" : "deactivated"}` });
      fetchJobs();
    } catch (err: any) {
      toast({ title: "Failed to toggle status", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Career Postings
            </CardTitle>
            <p className="text-[10px] text-muted-foreground mt-1">Manage public job openings, requirements, and applications.</p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2 text-xs bg-primary hover:bg-primary/90 rounded-xl h-10 font-bold">
            <Plus className="w-4 h-4" /> CREATE NEW VACANCY
          </Button>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="space-y-4 py-8">
              <div className="h-4 bg-muted rounded-full w-full animate-pulse" />
              <div className="h-4 bg-muted rounded-full w-full animate-pulse" />
              <div className="h-4 bg-muted rounded-full w-full animate-pulse" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/20 rounded-xl">
              <Briefcase className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">No vacancies published yet. Start by publishing your first job opening!</p>
            </div>
          ) : (
            <div className="border border-border/20 rounded-xl overflow-hidden bg-muted/10">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold tracking-wider uppercase">Title / Department</TableHead>
                    <TableHead className="text-[10px] font-bold tracking-wider uppercase">Location / Type</TableHead>
                    <TableHead className="text-[10px] font-bold tracking-wider uppercase">Salary</TableHead>
                    <TableHead className="text-[10px] font-bold tracking-wider uppercase text-center">Status</TableHead>
                    <TableHead className="text-[10px] font-bold tracking-wider uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job._id} className="hover:bg-muted/20">
                      <TableCell className="py-4">
                        <div className="font-semibold text-sm text-foreground">{job.title}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5 flex items-center gap-1">
                          <Layers className="w-3 h-3" /> {job.department}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="text-xs text-foreground/80 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {job.location}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{job.type}</div>
                      </TableCell>
                      <TableCell className="py-4 text-xs font-medium text-foreground">
                        {job.salaryRange || "Negotiable"}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <button 
                          onClick={() => toggleActiveStatus(job)}
                          className="focus:outline-none transition-transform active:scale-95 inline-block"
                        >
                          {job.is_active ? (
                            <div className="flex items-center gap-1 text-xs text-emerald-500 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                              <ToggleRight className="w-4 h-4" /> Active
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold bg-muted/20 border border-border px-2 py-1 rounded-full">
                              <ToggleLeft className="w-4 h-4" /> Inactive
                            </div>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditDialog(job)}
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDeleteTarget(job._id)}
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Vacancy Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-background border border-border/30 rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-wide">
              {selectedJob ? `Edit vacancy: ${selectedJob.title}` : "Publish new job vacancy"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Job Title *</Label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Senior Fashion Designer" 
                  className="rounded-xl"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Department *</Label>
                <select 
                  value={department} 
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-10 px-3 bg-muted/20 border border-border/30 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 text-foreground"
                >
                  <option value="Tech">Tech / Engineering</option>
                  <option value="Operations">Operations / Warehouse</option>
                  <option value="Sales">Sales / Business Development</option>
                  <option value="Marketing">Marketing / Creative</option>
                  <option value="Design">Design & Styling</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Location *</Label>
                <Input 
                  value={location} 
                  onChange={(e) => setLocation(e.target.value)} 
                  placeholder="e.g. Dhaka, Bangladesh" 
                  className="rounded-xl"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Job Type *</Label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-10 px-3 bg-muted/20 border border-border/30 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 text-foreground"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Salary Range</Label>
                <Input 
                  value={salaryRange} 
                  onChange={(e) => setSalaryRange(e.target.value)} 
                  placeholder="e.g. ৳40,000 - ৳60,000" 
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Role Description *</Label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Describe key responsibilities and expectations..." 
                className="w-full h-32 p-3 bg-muted/20 border border-border/30 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 text-foreground resize-y"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Requirements & Skills *</Label>
              <textarea 
                value={requirements} 
                onChange={(e) => setRequirements(e.target.value)} 
                placeholder="List required experience, qualifications, and core tools..." 
                className="w-full h-32 p-3 bg-muted/20 border border-border/30 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 text-foreground resize-y"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input 
                id="active" 
                type="checkbox" 
                checked={isActive} 
                onChange={(e) => setIsActive(e.target.checked)} 
                className="w-4 h-4 text-primary bg-muted rounded border-border/30 focus:ring-primary"
              />
              <Label htmlFor="active" className="text-xs font-bold text-foreground">Make this vacancy visible immediately</Label>
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)} 
                className="rounded-xl h-11"
              >
                CANCEL
              </Button>
              <Button 
                type="submit" 
                className="rounded-xl h-11 bg-primary text-primary-foreground font-bold"
              >
                {selectedJob ? "SAVE CHANGES" : "PUBLISH VACANCY"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Job Posting"
        description="Are you sure you want to permanently delete this job posting? This action cannot be undone."
        confirmLabel="Delete Posting"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
};

export default AdminCareers;
