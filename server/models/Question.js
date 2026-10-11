import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user_name: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, default: "" },
  is_answered: { type: Boolean, default: false },
  is_moderated: { type: Boolean, default: false },
}, { timestamps: true });

questionSchema.index({ product_id: 1, is_moderated: 1 });

export default mongoose.model("Question", questionSchema);
