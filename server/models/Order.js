import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variant_id: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unit_price: { type: Number, required: true },
  product_name: String,
  variant_name: String,
});

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  guest_email: String,
  status: {
    type: String,
    enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  total_amount: { type: Number, required: true },
  discount_amount: { type: Number, default: 0 },
  shipping_cost: { type: Number, default: 0 },
  delivery_method: { type: String, default: "Standard" },
  coupon_code: String,
  shipping_address: mongoose.Schema.Types.Mixed,
  phone_number: { type: String, required: true },
  order_items: [orderItemSchema],
  payment_method: { type: String, enum: ["cash_on_delivery", "online_payment"], default: "cash_on_delivery" },
  courier_name: { type: String, default: null },
  tracking_id: { type: String, default: null },
}, { timestamps: true });

orderSchema.index({ user_id: 1 });

export default mongoose.model("Order", orderSchema);
