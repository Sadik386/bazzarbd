import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Briefcase, MapPin, Clock, ArrowRight, X, Sparkles, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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

const Careers = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // Application form states
  const [applyMode, setApplyMode] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [portfolio, setPortfolio] = useState<string>("");
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  const { toast } = useToast();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get("/jobs");
        if (res && Array.isArray(res)) {
          setJobs(res);
        }
      } catch (err) {
        console.error("Failed to load jobs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const departments = ["All", ...Array.from(new Set(jobs.map(j => j.department)))];

  const filteredJobs = selectedDept === "All" 
    ? jobs 
    : jobs.filter(j => j.department === selectedDept);

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setAppliedSuccess(true);
      toast({ title: "Application Sent Successfully!" });
    }, 1500);
  };

  const closeDrawer = () => {
    setSelectedJob(null);
    setApplyMode(false);
    setAppliedSuccess(false);
    setFullName("");
    setEmail("");
    setPortfolio("");
    setCoverLetter("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Editorial Hero Section */}
      <section className="relative h-[65vh] flex items-center justify-center overflow-hidden border-b border-border/20">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000&auto=format&fit=crop" 
            alt="Office workspace" 
            className="w-full h-full object-cover brightness-[0.35] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
        </div>
        
        <div className="container relative z-10 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-[0.25em] uppercase mb-6">
              Careers at Thelagari
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6">
              Shape the Future of <br/><span className="text-primary italic font-medium">Luxury Essentials</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
              We are a collective of designers, builders, and storytellers re-imagining direct-to-consumer premium craftsmanship.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filter & Jobs Section */}
      <section className="py-24 container mx-auto px-4 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 pb-8 border-b border-border/20">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Open Positions</h2>
            <p className="text-sm text-muted-foreground mt-1">Explore current vacancies across our Dhaka headquarters & remote teams.</p>
          </div>
          
          {/* Department Filter Pills */}
          <div className="flex flex-wrap gap-2.5">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-4 py-2 text-xs font-semibold rounded-full tracking-wider uppercase border transition-all ${
                  selectedDept === dept
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/15"
                    : "bg-card text-muted-foreground border-border/40 hover:border-primary/35 hover:text-foreground"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Vacancy Cards List */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-card/50 rounded-2xl border border-border/20 animate-pulse" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-20 bg-muted/10 border border-dashed border-border/30 rounded-3xl">
            <Briefcase className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">No openings available</h3>
            <p className="text-sm text-muted-foreground mt-1">We don't have active roles in this department right now. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job, idx) => (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group p-6 md:p-8 bg-card border border-border/30 hover:border-primary/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-2.5 py-1 bg-primary/5 border border-primary/10 rounded-lg text-primary text-[10px] font-bold uppercase tracking-wider">
                      {job.department}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" /> {job.type}
                    </span>
                  </div>
                  
                  <h3 className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {job.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                    {job.salaryRange && <span className="text-foreground/80 font-semibold">{job.salaryRange}</span>}
                  </div>
                </div>
                
                <Button 
                  onClick={() => setSelectedJob(job)} 
                  variant="outline" 
                  className="rounded-xl border-border/50 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary shrink-0 transition-all gap-1.5 text-xs font-semibold px-5 h-11"
                >
                  VIEW DETAILS <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Slide-over Bespoke Drawer */}
      <AnimatePresence>
        {selectedJob && createPortal(
          <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Slide Sheet Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="relative w-full max-w-2xl bg-background border-l border-border/30 h-full flex flex-col shadow-2xl z-10"
            >
              {/* Drawer Header */}
              <div className="p-6 md:p-8 border-b border-border/20 flex justify-between items-center bg-card">
                <div>
                  <span className="px-2.5 py-1 bg-primary/5 border border-primary/10 rounded-lg text-primary text-[10px] font-bold uppercase tracking-wider">
                    {selectedJob.department}
                  </span>
                  <h2 className="text-2xl font-bold mt-2 text-foreground">{selectedJob.title}</h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={closeDrawer} 
                  className="rounded-full w-10 h-10 border border-border/30 hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 font-sans">
                {appliedSuccess ? (
                  /* Success State Overlay */
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20 space-y-6"
                  >
                    <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/5">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-foreground">Application Submitted</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        Thank you for applying, {fullName}! Our recruitment team will review your portfolio and be in touch soon.
                      </p>
                    </div>
                    <Button onClick={closeDrawer} className="rounded-full px-8 h-12 font-bold bg-primary hover:bg-primary/90 text-sm">
                      CLOSE DOOR
                    </Button>
                  </motion.div>
                ) : applyMode ? (
                  /* Job Application Form */
                  <motion.form 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleApplySubmit} 
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="fullname" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Full Name *</Label>
                      <Input 
                        id="fullname" 
                        required 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        placeholder="John Doe" 
                        className="rounded-xl border-border/40 h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Email Address *</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        required 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="johndoe@example.com" 
                        className="rounded-xl border-border/40 h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolio" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Portfolio or Resume Link</Label>
                      <Input 
                        id="portfolio" 
                        type="url" 
                        value={portfolio} 
                        onChange={(e) => setPortfolio(e.target.value)} 
                        placeholder="https://behance.net/johndoe or Google Drive URL" 
                        className="rounded-xl border-border/40 h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coverletter" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Cover Letter / Note</Label>
                      <textarea 
                        id="coverletter" 
                        value={coverLetter} 
                        onChange={(e) => setCoverLetter(e.target.value)} 
                        placeholder="Tell us why you are excited about Thelagari..." 
                        className="w-full h-36 p-4 bg-card border border-border/40 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 text-foreground resize-y"
                      />
                    </div>
                    
                    <div className="pt-4 flex gap-4">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setApplyMode(false)} 
                        className="rounded-xl font-bold flex-1 border border-border/40 h-12"
                      >
                        BACK TO DETAILS
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={submitting}
                        className="rounded-xl font-bold flex-1 bg-primary text-primary-foreground h-12 gap-1.5 hover:bg-primary/95"
                      >
                        {submitting ? "SUBMITTING..." : "SUBMIT APPLICATION"} <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.form>
                ) : (
                  /* Job Details Markdown View */
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-8"
                  >
                    <div className="flex flex-wrap gap-6 p-4 bg-muted/20 border border-border/20 rounded-xl text-sm">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Location</span>
                        <span className="font-semibold text-foreground flex items-center gap-1"><MapPin className="w-4 h-4 text-primary" /> {selectedJob.location}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Job Type</span>
                        <span className="font-semibold text-foreground flex items-center gap-1"><Clock className="w-4 h-4 text-primary" /> {selectedJob.type}</span>
                      </div>
                      {selectedJob.salaryRange && (
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Salary Range</span>
                          <span className="font-semibold text-foreground">{selectedJob.salaryRange}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground border-b border-border/10 pb-2">Role Overview</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-light">
                        {selectedJob.description}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground border-b border-border/10 pb-2">Requirements & Qualifications</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-light">
                        {selectedJob.requirements}
                      </p>
                    </div>

                    <div className="pt-6 border-t border-border/20">
                      <Button 
                        onClick={() => setApplyMode(true)} 
                        className="w-full rounded-xl h-14 bg-primary text-primary-foreground font-bold text-sm tracking-wider gap-2 shadow-lg shadow-primary/10"
                      >
                        APPLY FOR THIS ROLE <Sparkles className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
};

export default Careers;
