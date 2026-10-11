import mongoose from "mongoose";

const visitSchema = new mongoose.Schema({
  ip_address: { type: String, required: true },
  date: { type: String, required: true } // YYYY-MM-DD format
}, { timestamps: true });

// High-performance unique daily visitor compound index
visitSchema.index({ ip_address: 1, date: 1 }, { unique: true });

export default mongoose.model("Visit", visitSchema);
