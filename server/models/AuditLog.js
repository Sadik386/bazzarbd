import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admin_email: { type: String, required: true },
  action: { type: String, required: true }, // e.g., 'DELETE_PRODUCT', 'UPDATE_PRICE', 'LOGIN_FAILED'
  details: { type: mongoose.Schema.Types.Mixed },
  target_id: { type: String }, // ID of the entity being modified (product, order, etc.)
  ip_address: { type: String },
  user_agent: { type: String },
}, { timestamps: true });

export default mongoose.model("AuditLog", auditLogSchema);
