import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['system', 'order', 'promo'], default: 'system' },
  is_read: { type: Boolean, default: false },
  link: { type: String }
}, { timestamps: true });

notificationSchema.index({ user_id: 1, createdAt: -1 });
notificationSchema.index({ user_id: 1, is_read: 1 });

export default mongoose.model("Notification", notificationSchema);
