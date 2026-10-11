import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

/**
 * GET /sitemap-products.xml
 * Dynamically generates a sitemap XML for all product pages.
 * Products are fetched from MongoDB — only slug and updatedAt fields.
 */
router.get("/", async (req, res) => {
  try {
    // Lean query — only fetch slug and updatedAt for performance
    const products = await Product.find({}, { slug: 1, updatedAt: 1 }).lean();

    const baseUrl = process.env.CLIENT_URL || "https://thelagari.com";

    const urls = products
      .map((product) => {
        const lastmod = product.updatedAt
          ? new Date(product.updatedAt).toISOString().split("T")[0]
          : "2026-06-03";

        return `
  <url>
    <loc>${baseUrl}/product/${product.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`;
      })
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.status(200).send(xml);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

export default router;
