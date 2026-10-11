import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  variant_name: { type: String, required: true },
  price_modifier: { type: Number, default: 0 },
  sku: String,
  stock_level: { type: Number, default: 0 },
});

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt_text: String,
  display_order: { type: Number, default: 0 },
});

const productSchema = new mongoose.Schema({
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  base_price: { type: Number, required: true },
  traditional_price: { type: Number },
  short_description: String,
  long_description: String,
  tech_specs: { type: mongoose.Schema.Types.Mixed, default: {} },
  is_featured: { type: Boolean, default: false },
  is_recommended: { type: Boolean, default: false },
  rating_override: { type: Number, default: null },
  review_count_override: { type: Number, default: null },
  activity: [String],
  product_variants: [variantSchema],
  product_images: [imageSchema],
  size_chart_id: { type: mongoose.Schema.Types.ObjectId, ref: "SizeChart", default: null },
}, { timestamps: true });

productSchema.index({ category_id: 1 });
productSchema.index({ is_featured: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: "text", short_description: "text", long_description: "text" });

export default mongoose.model("Product", productSchema);
