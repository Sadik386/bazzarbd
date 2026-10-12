import { Router } from "express";
import Product from "../models/Product.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { allowRoles } from "../middleware/rbac.js";
import { logAdminAction } from "../utils/auditLogger.js";

import Category from "../models/Category.js";
import { upsertProductEmbedding, deleteProductEmbedding } from "../services/embeddingService.js";

const router = Router();

// Simple in-memory cache for the product list
let productsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // Cache for 30 seconds

// Slug-based cache for single product lookups
const slugCache = new Map();
const SLUG_CACHE_TTL = 30000;
const MAX_SLUG_CACHE = 100;

router.get("/", async (req, res) => {
  try {
    const { category, activity, search, status, minPrice, maxPrice } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    
    // Add Cache-Control header so Cloudflare caches this API request at the edge for 60 seconds.
    // This allows 500+ users to hit the site simultaneously while the backend only processes 1 request per minute.
    // However, skip caching for authenticated (admin) requests to ensure immediate visual updates.
    if (!req.headers.authorization) {
      res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
    } else {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }

    // Serve from cache if no filters or pagination are applied and cache is valid
    const isFiltered = !!(category || activity || search || status || minPrice || maxPrice || page !== 1 || limit !== 12);
    if (!isFiltered && productsCache && (Date.now() - cacheTimestamp < CACHE_TTL)) {
      return res.json(productsCache);
    }

    let query = {};

    if (status === "featured") {
      query.is_featured = true;
    }

    if (category && category !== "all") {
      const slugs = category.split(",");
      const cats = await Category.find({ slug: { $in: slugs } });
      if (cats.length > 0) {
        query.category_id = { $in: cats.map(c => c._id) };
      }
    }

    if (activity) {
      query.activity = { $in: [activity] };
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (minPrice || maxPrice) {
      query.base_price = {};
      if (minPrice) query.base_price.$gte = parseFloat(minPrice);
      if (maxPrice) query.base_price.$lte = parseFloat(maxPrice);
    }

    const skip = (page - 1) * limit;

    const [totalCount, products] = await Promise.all([
      Product.countDocuments(query),
      Product.aggregate([
        { $match: query },
        {
          $addFields: {
            total_stock: {
              $sum: "$product_variants.stock_level"
            }
          }
        },
        {
          $addFields: {
            is_in_stock: {
              $cond: {
                if: { $gt: ["$total_stock", 0] },
                then: 1,
                else: 0
              }
            }
          }
        },
        { $sort: { is_in_stock: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "categories",
            localField: "category_id",
            foreignField: "_id",
            as: "category_id"
          }
        },
        {
          $unwind: {
            path: "$category_id",
            preserveNullAndEmptyArrays: true
          }
        }
      ])
    ]);

    const mapped = products.map((p) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      base_price: p.base_price,
      traditional_price: p.traditional_price,
      short_description: p.short_description,
      long_description: p.long_description,
      tech_specs: p.tech_specs,
      is_featured: !!p.is_featured,
      is_recommended: !!p.is_recommended,
      rating_override: p.rating_override !== undefined ? p.rating_override : null,
      review_count_override: p.review_count_override !== undefined ? p.review_count_override : null,
      activity: p.activity,
      category_id: p.category_id?._id || null,
      size_chart_id: p.size_chart_id || null,
      categories: p.category_id ? { id: p.category_id._id, name: p.category_id.name, slug: p.category_id.slug } : null,
      product_variants: p.product_variants.map((v) => ({
        id: v._id,
        variant_name: v.variant_name,
        price_modifier: v.price_modifier,
        sku: v.sku,
        stock_level: v.stock_level,
      })),
      product_images: p.product_images
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map((img) => ({
          id: img._id,
          url: img.url,
          alt_text: img.alt_text,
          display_order: img.display_order,
        })),
    }));

    const response = {
      products: mapped,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    };

    // Update cache if no filters were used
    if (!isFiltered) {
      productsCache = response;
      cacheTimestamp = Date.now();
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;

    // Add Cache-Control header for Cloudflare Edge Caching
    res.set('Cache-Control', 'public, max-age=60, s-maxage=60');

    // Check slug cache
    const cached = slugCache.get(slug);
    if (cached && (Date.now() - cached.ts < SLUG_CACHE_TTL)) {
      return res.json(cached.data);
    }

    const product = await Product.findOne({ slug })
      .populate("category_id", "name slug")
      .populate("size_chart_id")
      .lean();

    if (!product) return res.status(404).json({ error: "Product not found" });

    const response = {
      id: product._id,
      name: product.name,
      slug: product.slug,
      base_price: product.base_price,
      traditional_price: product.traditional_price,
      short_description: product.short_description,
      long_description: product.long_description,
      tech_specs: product.tech_specs,
      is_featured: !!product.is_featured,
      is_recommended: !!product.is_recommended,
      rating_override: product.rating_override !== undefined ? product.rating_override : null,
      review_count_override: product.review_count_override !== undefined ? product.review_count_override : null,
      activity: product.activity,
      category_id: product.category_id?._id || null,
      size_chart_id: product.size_chart_id?._id || null,
      size_chart: product.size_chart_id || null,
      categories: product.category_id ? { id: product.category_id._id, name: product.category_id.name, slug: product.category_id.slug } : null,
      product_variants: product.product_variants.map((v) => ({
        id: v._id,
        variant_name: v.variant_name,
        price_modifier: v.price_modifier,
        sku: v.sku,
        stock_level: v.stock_level,
      })),
      product_images: product.product_images
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map((img) => ({
          id: img._id,
          url: img.url,
          alt_text: img.alt_text,
          display_order: img.display_order,
        })),
    };

    // Store in slug cache
    if (slugCache.size >= MAX_SLUG_CACHE) {
      const oldestKey = slugCache.keys().next().value;
      slugCache.delete(oldestKey);
    }
    slugCache.set(slug, { data: response, ts: Date.now() });

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post("/", adminAuth, allowRoles("SUPER_ADMIN", "CONTENT_MANAGER"), async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    
    await logAdminAction(req, 'CREATE_PRODUCT', product._id, { name: product.name });
    
    // Asynchronously synchronize embedding in pgvector
    upsertProductEmbedding(product).catch((e) => console.error("[EmbeddingSync] Create error:", e.message));

    productsCache = null; // Invalidate cache
    slugCache.clear(); // Invalidate slug cache
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update product
router.put("/:id", adminAuth, allowRoles("SUPER_ADMIN", "CONTENT_MANAGER"), async (req, res) => {
  let retries = 3;
  while (retries > 0) {
    try {
      // Build $set and $unset operations so null fields are properly cleared in MongoDB.
      // A plain findByIdAndUpdate(id, req.body) silently ignores null values.
      const setFields = {};
      const unsetFields = {};

      for (const [key, val] of Object.entries(req.body)) {
        if (val === null || val === undefined) {
          unsetFields[key] = "";
        } else {
          setFields[key] = val;
        }
      }

      const updateOp = {};
      if (Object.keys(setFields).length > 0) updateOp.$set = setFields;
      if (Object.keys(unsetFields).length > 0) updateOp.$unset = unsetFields;

      const product = await Product.findByIdAndUpdate(req.params.id, updateOp, { new: true, runValidators: false });
      if (!product) return res.status(404).json({ error: "Product not found" });
      
      await logAdminAction(req, 'UPDATE_PRODUCT', product._id, { name: product.name });
      
      // Asynchronously synchronize embedding in pgvector
      upsertProductEmbedding(product).catch((e) => console.error("[EmbeddingSync] Update error:", e.message));

      productsCache = null; // Invalidate cache
      slugCache.clear(); // Invalidate slug cache
      return res.json(product);
    } catch (err) {
      console.warn(`[Products] Update failed (Retries remaining: ${retries - 1}):`, err.message);
      retries--;
      if (retries === 0 || (!err.message.includes("ECONNRESET") && !err.message.includes("socket") && !err.message.includes("connection") && !err.message.includes("closed"))) {
        return res.status(400).json({ error: err.message });
      }
      // Wait 150ms before retrying
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
});


// Update product stock
router.patch("/:id/stock", adminAuth, async (req, res) => {
  try {
    const { variantId, stock_level } = req.body;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, "product_variants._id": variantId },
      { $set: { "product_variants.$.stock_level": stock_level } },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: "Product or variant not found" });
    productsCache = null; // Invalidate cache
    slugCache.clear(); // Invalidate slug cache
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Bulk update products
router.post("/bulk-update", adminAuth, allowRoles("SUPER_ADMIN", "CONTENT_MANAGER"), async (req, res) => {
  let retries = 3;
  while (retries > 0) {
    try {
      const { updates } = req.body;
      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: "Invalid updates array" });
      }

      const bulkOps = updates.map(update => {
        const updateDoc = {};
        if (update.is_featured !== undefined) updateDoc.is_featured = !!update.is_featured;
        if (update.is_recommended !== undefined) updateDoc.is_recommended = !!update.is_recommended;
        
        return {
          updateOne: {
            filter: { _id: update.id },
            update: { $set: updateDoc }
          }
        };
      });

      await Product.bulkWrite(bulkOps);
      await logAdminAction(req, 'BULK_UPDATE_PRODUCTS', null, { count: updates.length });

      productsCache = null; // Invalidate cache
      slugCache.clear(); // Invalidate slug cache
      return res.json({ message: "Products updated successfully", count: updates.length });
    } catch (err) {
      console.warn(`[Products] Bulk update failed (Retries remaining: ${retries - 1}):`, err.message);
      retries--;
      if (retries === 0 || (!err.message.includes("ECONNRESET") && !err.message.includes("socket") && !err.message.includes("connection") && !err.message.includes("closed"))) {
        return res.status(500).json({ error: err.message });
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
});

// Bulk delete products
router.post("/bulk-delete", adminAuth, allowRoles("SUPER_ADMIN"), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid product IDs" });
    }
    const result = await Product.deleteMany({ _id: { $in: ids } });
    
    await logAdminAction(req, 'BULK_DELETE_PRODUCTS', null, { count: result.deletedCount, ids });
    
    productsCache = null; // Invalidate cache
    slugCache.clear(); // Invalidate slug cache
    res.json({ message: "Products deleted successfully", count: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
router.delete("/:id", adminAuth, allowRoles("SUPER_ADMIN"), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    
    await logAdminAction(req, 'DELETE_PRODUCT', product._id, { name: product.name });
    
    // Purge embedding from pgvector
    deleteProductEmbedding(req.params.id).catch((e) => console.error("[EmbeddingSync] Delete error:", e.message));

    productsCache = null; // Invalidate cache
    slugCache.clear(); // Invalidate slug cache
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
