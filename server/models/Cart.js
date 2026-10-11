import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variant_id: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1, min: 1 },
  // Denormalized for fast display without joins
  product_name: String,
  variant_name: String,
  base_price: Number,
  price_modifier: { type: Number, default: 0 },
  product_image: String,
  slug: String,
});

const cartSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  items: [cartItemSchema],
}, { timestamps: true });

export default mongoose.model("Cart", cartSchema);
