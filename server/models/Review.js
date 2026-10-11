import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user_name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  is_moderated: { type: Boolean, default: false },
  is_verified_purchase: { type: Boolean, default: false },
}, { timestamps: true });

reviewSchema.index({ product_id: 1, is_moderated: 1 });

export default mongoose.model("Review", reviewSchema);
