import { Router } from "express";
import { searchSimilarProducts, upsertProductEmbedding } from "../services/embeddingService.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

const router = Router();

/**
 * GET /api/search/semantic
 * Query parameters:
 *   q: search query text (e.g. "warm winter coat with pockets", "sneakers under 2500")
 *   limit: max results (default 10)
 *   minScore: minimum similarity threshold (0-1, default 0.25)
 *   minPrice: optional minimum price
 *   maxPrice: optional maximum price
 *   category: optional category slug or name
 */
router.get("/semantic", async (req, res) => {
  try {
    const { q, limit = 10, minScore = 0.5, minPrice, maxPrice, category } = req.query;

    if (!q || typeof q !== "string" || !q.trim()) {
      return res.status(400).json({ error: "Query parameter 'q' is required." });
    }

    const numLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const numMinScore = Math.max(parseFloat(minScore) || 0.5, 0.0);

    let products = await searchSimilarProducts(q.trim(), numLimit, numMinScore);

    // Apply optional price filters
    if (minPrice !== undefined && !isNaN(Number(minPrice))) {
      const min = Number(minPrice);
      products = products.filter((p) => p.base_price >= min);
    }
    if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
      const max = Number(maxPrice);
      products = products.filter((p) => p.base_price <= max);
    }

    // Apply optional category filter
    if (category && category !== "all") {
      const catSlug = category.toLowerCase();
      products = products.filter((p) => {
        const pCatSlug = p.category_id?.slug?.toLowerCase();
        const pCatName = p.category_id?.name?.toLowerCase();
        return pCatSlug === catSlug || pCatName === catSlug;
      });
    }

    res.json({
      success: true,
      query: q.trim(),
      count: products.length,
      products,
    });
  } catch (err) {
    console.error("Semantic search route error:", err);
    res.status(500).json({ error: "Failed to perform semantic search." });
  }
});

/**
 * POST /api/search/reembed/:id
 * Re-embed a specific product by ID
 */
router.post("/reembed/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category_id", "name");
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const ok = await upsertProductEmbedding(product, product.category_id?.name || "");
    res.json({ success: ok, message: ok ? "Product embedding updated" : "Failed to update embedding" });
  } catch (err) {
    console.error("Re-embed error:", err);
    res.status(500).json({ error: "Failed to re-embed product" });
  }
});

export default router;
