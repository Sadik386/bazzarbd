import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { allowRoles } from "../middleware/rbac.js";
import { generateProductContent } from "../services/aiProductContentService.js";

const router = Router();

/**
 * POST /api/ai/generate-content
 * Comprehensive AI Product Content Generator endpoint.
 * Accepts: name, price, notes, imageUrl, tone, language, categoryHint.
 * Generates:
 *   - SEO-friendly title & slug
 *   - Bengali and English descriptions (short & long)
 *   - Key highlights & structured specifications
 *   - Google SEO metadata (meta title, description, tags)
 *   - Facebook post & direct-response Ad copy
 */
router.post("/generate-content", adminAuth, allowRoles("SUPER_ADMIN", "CONTENT_MANAGER"), async (req, res) => {
  try {
    const { name, price, notes, imageUrl, tone, language, categoryHint } = req.body;

    if (!name && !imageUrl && !notes) {
      return res.status(400).json({
        error: "Please provide at least a Product Name, Image URL, or Key Notes/Information to generate content."
      });
    }

    const data = await generateProductContent({
      name,
      price,
      notes,
      imageUrl,
      tone,
      language,
      categoryHint
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("[AI Generate Content] Route error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI product content." });
  }
});

/**
 * POST /api/ai/auto-list
 * Legacy route for backwards-compatibility.
 */
router.post("/auto-list", adminAuth, allowRoles("SUPER_ADMIN", "CONTENT_MANAGER"), async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Product 'imageUrl' is required." });
    }

    const result = await generateProductContent({
      imageUrl,
      language: "Bilingual (English & Bengali)"
    });

    // Format output matching legacy auto-list schema for backward compatibility
    const legacyData = {
      name_en: result.title_en || result.name_en,
      name_bn: result.title_bn || result.name_bn,
      short_description_en: result.short_description_en,
      short_description_bn: result.short_description_bn,
      long_description_en: result.long_description_en,
      long_description_bn: result.long_description_bn,
      suggested_category: result.suggested_category,
      suggested_price_bdt: result.suggested_price_bdt,
      seo_tags: result.tags || (result.seo && result.seo.tags) || [],
      key_features: result.highlights || [],
      specifications: result.specifications || {},
      meta_title: result.meta_title,
      meta_description: result.meta_description,
      facebook_post: result.facebook_post,
      ad_copy: result.ad_copy
    };

    res.json({
      success: true,
      data: legacyData
    });
  } catch (error) {
    console.error("Gemini Vision auto-list error:", error);
    res.status(500).json({ error: error.message || "Failed to auto-generate listing." });
  }
});

export default router;
