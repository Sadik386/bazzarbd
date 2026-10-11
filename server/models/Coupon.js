import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discount_type: { type: String, enum: ["fixed", "percentage"], required: true },
  discount_value: { type: Number, required: true },
  min_purchase: { type: Number, default: 0 },
  usage_limit: { type: Number, default: null },
  used_count: { type: Number, default: 0 },
  expiry_date: { type: Date, required: true },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Coupon", couponSchema);
