import { Router } from "express";
import Category from "../models/Category.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

// In-memory cache for categories (rarely change)
let categoriesCache = null;
let categoriesCacheTs = 0;
const CATEGORIES_CACHE_TTL = 60000; // 60 seconds

router.get("/", async (req, res) => {
  try {
    // Add Cache-Control header for Cloudflare Edge Caching (5 minutes)
    // However, skip caching for authenticated (admin) requests to ensure immediate visual updates.
    if (!req.headers.authorization) {
      res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
      // Return cached if valid
      if (categoriesCache && (Date.now() - categoriesCacheTs < CATEGORIES_CACHE_TTL)) {
        return res.json(categoriesCache);
      }
    } else {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }

    const categories = await Category.find().sort({ sequence: 1, name: 1 }).lean();
    const mapped = categories.map((c) => ({
      id: c._id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image_url: c.image_url,
      sequence: c.sequence ?? 0,
      parent_id: c.parent_id || null,
    }));

    if (!req.headers.authorization) {
      categoriesCache = mapped;
      categoriesCacheTs = Date.now();
    }

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create category
router.post("/", adminAuth, async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    categoriesCache = null; // Invalidate cache
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update category
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ error: "Category not found" });
    categoriesCache = null; // Invalidate cache
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete category
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    categoriesCache = null; // Invalidate cache
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
