import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  image_url: String,
  sequence: { type: Number, default: 0 },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
}, { timestamps: true });

export default mongoose.model("Category", categorySchema);
