import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const envPath = fs.existsSync("./server/.env") ? "./server/.env" : "./.env";
dotenv.config({ path: envPath });

import express from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { generalLimiter, authLimiter, uploadLimiter } from "./middleware/rateLimiter.js";
import connectDB from "./db.js";
import { auth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import categoryRoutes from "./routes/categories.js";
import orderRoutes from "./routes/orders.js";
import uploadRoutes from "./routes/upload.js";
import adminRoutes from "./routes/admin.js";
import couponRoutes from "./routes/coupons.js";
import reviewRoutes from "./routes/reviews.js";
import settingsRoutes from "./routes/settings.js";
import cartRoutes from "./routes/cart.js";
import invoiceRoutes from "./routes/invoices.js";
import supportRoutes from "./routes/support.js";
import questionRoutes from "./routes/questions.js";
import notificationRoutes from "./routes/notifications.js";
import jobRoutes from "./routes/jobs.js";
import sitemapRoute from "./routes/sitemap.js";
import imgProxyRoute from "./routes/imgProxy.js";
import searchRoutes from "./routes/search.js";
import aiChatRoutes from "./routes/aiChat.js";
import aiListingRoutes from "./routes/aiListing.js";
import { initPgVector } from "./db/postgres.js";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    if (res.getHeader('Content-Type') === 'text/event-stream') return false;
    return compression.filter(req, res);
  }
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      (process.env.CLIENT_URL && origin === process.env.CLIENT_URL)
    ) {
      return callback(null, true);
    }
    return callback(new Error("CORS origin not allowed: " + origin), false);
  },
  credentials: true
}));
app.use(cookieParser());

// Rate limiting middleware
// const adminLimiter = rateLimit({
//   windowMs: 5 * 60 * 1000, // 15 minutes
//   max: 15, // Limit each IP to 10 requests per window for admin actions
//   message: { error: "Too many attempts from this IP, please try again after 15 minutes" }
// });

app.use("/api/auth/", authLimiter);
app.use("/api/upload/", uploadLimiter);
// app.use("/api/admin/login", adminLimiter); // Strict limit for admin login
app.use("/api/", generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Authentication middleware
app.use(auth);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/ai", aiChatRoutes);
app.use("/api/ai", aiListingRoutes);

// Dynamic product sitemap — served at /sitemap-products.xml
app.use("/sitemap-products.xml", sitemapRoute);

// Image proxy — kept alive to serve OLD Cloudinary URLs still in the database
// during the transition period. Can be removed after migration is complete.
app.use("/api/img", imgProxyRoute);

// ── Self-hosted image serving (VPS storage) ───────────────────────────────────
// Serves files from server/uploads/ at /uploads/* (Node.js fallback).
// In production Nginx serves /uploads/ directly (much faster) — see nginx.conf.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redirect local /uploads requests to production server if they don't exist locally
app.use("/uploads", (req, res, next) => {
  const filePath = path.join(__dirname, "uploads", req.path);
  if (!fs.existsSync(filePath)) {
    return res.redirect(`https://thelagaribd.com${req.originalUrl}`);
  }
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: "1y",
  immutable: true,
  setHeaders: (res) => {
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.set("Access-Control-Allow-Origin", "*");
  }
}));



// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message
  });
});

// Connect to database and start server
connectDB().then(async () => {
  // Initialize pgvector extension, table, and HNSW index in background
  initPgVector().catch((err) => console.warn("⚠️ pgvector startup initialization notice:", err.message));

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || "development"}`);
  });
}).catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});

export default app;
