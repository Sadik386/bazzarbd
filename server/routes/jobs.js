import { Router } from "express";
import Job from "../models/Job.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

// GET all jobs
// Public: returns only active jobs.
// Admin (all=true): returns all jobs (including inactive ones).
router.get("/", async (req, res) => {
  try {
    const showAll = req.query.all === "true";
    
    // Check if they want all jobs, verify they are admin
    let query = { is_active: true };
    if (showAll && req.user) {
      const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
      if (adminEmails.includes(req.user.email)) {
        query = {}; // No filter, return all jobs for admin view
      }
    }
    
    const jobs = await Job.find(query).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single job details (Public)
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job posting not found" });
    }
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create job posting (Admin Only)
router.post("/", adminAuth, async (req, res) => {
  try {
    const { title, department, location, type, description, requirements, salaryRange, is_active } = req.body;
    
    const newJob = new Job({
      title,
      department,
      location,
      type,
      description,
      requirements,
      salaryRange,
      is_active: is_active !== undefined ? is_active : true
    });

    const savedJob = await newJob.save();
    res.status(201).json(savedJob);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update job posting (Admin Only)
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { title, department, location, type, description, requirements, salaryRange, is_active } = req.body;
    
    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      {
        title,
        department,
        location,
        type,
        description,
        requirements,
        salaryRange,
        is_active
      },
      { new: true, runValidators: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ error: "Job posting not found" });
    }

    res.json(updatedJob);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE job posting (Admin Only)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const deletedJob = await Job.findByIdAndDelete(req.params.id);
    if (!deletedJob) {
      return res.status(404).json({ error: "Job posting not found" });
    }
    res.json({ message: "Job posting successfully deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
