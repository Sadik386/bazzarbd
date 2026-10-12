import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
import mongoose from "mongoose";
import User from "../models/User.js";

const ADMIN_EMAIL = "admin@thelagari.com";
const ADMIN_PASSWORD = "Admin@2026";
const ADMIN_NAME = "Super Admin";

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Check if user already exists
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`User ${ADMIN_EMAIL} already exists with role: ${existing.role}`);
      // Update role to SUPER_ADMIN if not already
      if (existing.role !== "SUPER_ADMIN") {
        existing.role = "SUPER_ADMIN";
        await existing.save();
        console.log("Role updated to SUPER_ADMIN");
      }
      // Reset password
      existing.password = ADMIN_PASSWORD;
      await existing.save();
      console.log("Password reset successfully");
    } else {
      // Create new admin user
      const admin = new User({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        display_name: ADMIN_NAME,
        role: "SUPER_ADMIN",
      });
      await admin.save();
      console.log("Admin user created successfully!");
    }

    console.log("\n=================================");
    console.log("  Admin Credentials");
    console.log("=================================");
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log("=================================\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

createAdmin();
