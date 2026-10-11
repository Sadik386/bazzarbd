import express from "express";
import { upload, deleteImage } from "../utils/localStorage.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// ── Upload single image ───────────────────────────────────────────────────────
router.post("/upload", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("Multer/Upload error:", err);
      return res.status(500).json({ error: err.message || "Failed to upload image" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Return a relative path — Nginx serves /uploads/* directly.
      // The client prepends the base domain when needed.
      const url = `/uploads/${req.file.filename}`;

      res.json({
        success: true,
        image: {
          url,
          public_id: req.file.filename,
          width: null,
          height: null,
          format: req.file.mimetype?.split("/")[1] || null,
          size: req.file.size,
        },
      });
    } catch (error) {
      console.error("Internal processing error:", error);
      res.status(500).json({ error: "Failed to process uploaded image" });
    }
  });
});

// ── Upload multiple images ────────────────────────────────────────────────────
router.post("/upload-multiple", upload.array("images", 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No image files provided" });
    }

    const images = req.files.map((file) => ({
      url: `/uploads/${file.filename}`,
      public_id: file.filename,
      width: null,
      height: null,
      format: file.mimetype?.split("/")[1] || null,
      size: file.size,
    }));

    res.json({ success: true, images });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload images" });
  }
});

// ── Delete image ──────────────────────────────────────────────────────────────
router.post("/delete", async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    const result = await deleteImage(imageUrl);

    if (result.success) {
      res.json({ success: true, message: "Image deleted successfully" });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;
