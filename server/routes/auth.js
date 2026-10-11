import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import Visit from "../models/Visit.js";
import { sendResetPasswordEmail } from "../utils/notifications.js";

const router = Router();

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role || 'USER' },
    process.env.JWT_SECRET,
    { expiresIn: "15m" } // Short-lived access token
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" } // Long-lived refresh token
  );
};

const sendTokens = (res, user, statusCode = 200) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Set refresh token in HttpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(statusCode).json({
    token: accessToken, // Access token still sent to client for Bearer auth
    user: { 
      id: user._id, 
      email: user.email, 
      display_name: user.display_name,
      role: user.role || 'USER'
    },
  });
};

router.post("/signup", async (req, res) => {
  try {
    const { email, password, display_name } = req.body;
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: "Email already registered" });

    const user = await User.create({ email, password, display_name });
    sendTokens(res, user, 201);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, isAdminLogin } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "INCORRECT PASSWORD OR EMAIL" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: "INCORRECT PASSWORD OR EMAIL" });

    // Handle Admin Elevation and Restriction
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];
    const isEmailAdmin = adminEmails.includes(email.toLowerCase());
    
    console.log(`[Auth] Login attempt: ${email}, isEmailAdmin: ${isEmailAdmin}, currentRole: ${user.role}`);

    // Automatically elevate to SUPER_ADMIN if email is in ADMIN_EMAILS
    if (isEmailAdmin && (!user.role || user.role === 'USER')) {
      console.log(`[Auth] Elevating ${email} to SUPER_ADMIN`);
      user.role = 'SUPER_ADMIN';
      await user.save();
    }

    if (isEmailAdmin && !isAdminLogin) {
      return res.status(401).json({ error: "INCORRECT PASSWORD OR EMAIL" });
    }

    if (isAdminLogin && !isEmailAdmin && user.role === 'USER') {
       return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }

    sendTokens(res, user);
  } catch (err) {
    console.error(`[Auth Error] ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

import { verifyIdToken } from "../utils/firebase.js";

router.post("/google-login", async (req, res) => {
  try {
    const { idToken } = req.body;
    let payload;
    
    // Verify token with Firebase
    try {
      payload = await verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    // Fallback if verification is skipped in dev mode
    // In production, payload would be the decoded token
    const email = (payload?.email || req.body.email)?.toLowerCase();
    const name = payload?.name || req.body.display_name || "Google User";

    if (!email) return res.status(400).json({ error: "Email is required" });

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if doesn't exist
      // Random password for social accounts
      const randomPassword = crypto.randomBytes(16).toString("hex");
      user = await User.create({
        email,
        password: randomPassword,
        display_name: name,
        is_social: true // You might want to add this field to User model
      });
    }

    sendTokens(res, user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = Date.now() + 600000; // 10 minutes

    await user.save();
    const clientUrl = req.headers.origin || process.env.CLIENT_URL || "http://localhost:8080";
    await sendResetPasswordEmail(user, resetToken, clientUrl);

    res.json({ message: "YOU WILL RECEIVE A RESET LINK SHORTLY" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/reset-password/:token", async (req, res) => {
  try {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ error: "Token is invalid or has expired" });

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password has been reset successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/refresh-token", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    const accessToken = generateAccessToken(user);
    res.json({ token: accessToken });
  } catch (err) {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
});

router.get("/me", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ 
    id: user._id, 
    email: user.email, 
    display_name: user.display_name,
    role: user.role || 'USER'
  });
});

router.post("/track-visit", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    // Unique upsert per IP & Date ensures duplicate refreshes do not inflate today's unique visitors
    await Visit.findOneAndUpdate(
      { ip_address: ip, date: today },
      { $setOnInsert: { ip_address: ip, date: today } },
      { upsert: true }
    );
    
    res.json({ success: true });
  } catch (err) {
    // Gracefully handle parallel updates or duplicate key issues
    res.json({ success: true });
  }
});

export default router;
