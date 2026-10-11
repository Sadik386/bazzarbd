import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Upload directory ──────────────────────────────────────────────────────────
// Resolves to /var/www/thelagari/server/uploads/ on VPS
// and  <project-root>/server/uploads/ in development
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// Ensure the uploads directory exists on startup
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log("[uploads] Created uploads directory:", UPLOADS_DIR);
}

// ── Multer disk storage ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    // e.g. 1720300000000-3f8a2c.jpg
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, unique);
  },
});

// ── Multer upload instance ────────────────────────────────────────────────────
export const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
  },
  fileFilter: (_req, file, cb) => {
    console.log("Multer receiving file:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      console.warn("Multer rejected file (invalid mimetype):", file.mimetype);
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// ── Delete helper ─────────────────────────────────────────────────────────────
/**
 * Delete a locally stored image.
 * Accepts either:
 *   - A relative URL:  "/uploads/filename.jpg"
 *   - A full URL:      "https://thelagaribd.com/uploads/filename.jpg"
 *   - A Cloudinary URL: ignored gracefully (returns success=false)
 */
export const deleteImage = async (imageUrl) => {
  try {
    // Ignore Cloudinary URLs — they are no longer managed here
    if (imageUrl && imageUrl.includes("cloudinary.com")) {
      console.warn("[uploads] Skipping Cloudinary URL deletion:", imageUrl);
      return { success: false, error: "Cloudinary URLs are not managed locally" };
    }

    // Extract just the filename portion from any URL format
    const filename = path.basename(imageUrl);
    const filePath = path.join(UPLOADS_DIR, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("[uploads] Deleted file:", filename);
      return { success: true };
    } else {
      console.warn("[uploads] File not found for deletion:", filePath);
      return { success: false, error: "File not found" };
    }
  } catch (error) {
    console.error("[uploads] Error deleting image:", error);
    return { success: false, error: error.message };
  }
};

export const UPLOADS_PATH = UPLOADS_DIR;
