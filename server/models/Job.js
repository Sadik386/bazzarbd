import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, required: true }, // e.g. "Tech", "Operations", "Sales", "Marketing"
  location: { type: String, required: true }, // e.g. "Dhaka, Bangladesh", "Remote", "Hybrid"
  type: { type: String, required: true }, // e.g. "Full-time", "Part-time", "Internship"
  description: { type: String, required: true }, // Detailed markdown or text description
  requirements: { type: String, required: true }, // Detailed markdown or text requirements
  salaryRange: { type: String }, // e.g. "৳30,000 - ৳50,000" or "Negotiable"
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Job", jobSchema);
