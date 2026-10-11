import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  display_name: String,
  role: { 
    type: String, 
    enum: ['USER', 'SUPPORT_AGENT', 'CONTENT_MANAGER', 'ORDER_MANAGER', 'SUPER_ADMIN'],
    default: 'USER'
  },
  refreshTokens: [String], // Array to store multiple refresh tokens for different devices
  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);
