import { Router } from "express";
import {
  getRecommendations,
  getProductBundle,
  generateAiRecommendationInsights,
} from "../services/recommendationService.js";

const router = Router();

/**
 * GET /api/recommendations
 * Unified recommendation endpoint
 * Query params:
 *   - productId: Context item ID (e.g. on PDP)
 *   - cart: Comma-separated product IDs currently in user's cart
 *   - viewed: Comma-separated product IDs recently viewed
 *   - type: "complementary" | "similar" | "personalized" | "bundle"
 *   - limit: max items (default 4)
 */
router.get("/", async (req, res) => {
  try {
    const { productId, cart, viewed, type = "complementary", limit = 4 } = req.query;

    const cartProductIds = cart ? cart.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const viewedProductIds = viewed ? viewed.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const userId = req.user?.id || null;

    const products = await getRecommendations({
      productId: productId || null,
      cartProductIds,
      viewedProductIds,
      userId,
      type,
      limit: parseInt(limit) || 4,
    });

    res.json({ products });
  } catch (err) {
    console.error("[Recommendations Route] Query error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch recommendations" });
  }
});

/**
 * GET /api/recommendations/bundle/:productId
 * Returns "Frequently Bought Together" paired bundle with base product and add-ons
 */
router.get("/bundle/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const bundle = await getProductBundle(productId);
    res.json(bundle);
  } catch (err) {
    console.error("[Recommendations Route] Bundle error:", err);
    res.status(400).json({ error: err.message || "Failed to generate product bundle" });
  }
});

/**
 * POST /api/recommendations/ai-insights
 * Generates natural language styling & compatibility rationales via Gemini
 */
router.post("/ai-insights", async (req, res) => {
  try {
    const { baseProductName, products } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: "products array is required" });
    }

    const insights = await generateAiRecommendationInsights(baseProductName, products);
    res.json({ insights });
  } catch (err) {
    console.error("[Recommendations Route] AI insights error:", err);
    res.status(500).json({ error: err.message || "Failed to generate AI insights" });
  }
});

export default router;
