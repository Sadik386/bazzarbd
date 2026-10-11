import mongoose from "mongoose";

const sizeRowSchema = new mongoose.Schema({
  size: { type: String, required: true },       // e.g. "M", "L", "XL", "2XL"
  values_inch: [{ type: String }],               // e.g. ["41", "27.25", "24.25"]
  values_cm: [{ type: String }],                 // e.g. ["104", "69.2", "61.6"]
}, { _id: false });

const sizeChartSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },   // e.g. "Shirt", "Pant", "Cap"
  columns: [{ type: String }],                              // e.g. ["Size", "Chest Round", "Length", "Sleeve"]
  rows: [sizeRowSchema],
  deviation_note: { type: String, default: "Expected Deviation < 3%" },
}, { timestamps: true });

export default mongoose.model("SizeChart", sizeChartSchema);
