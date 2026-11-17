import mongoose from "../db/mongoCompat.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import { GoogleGenAI } from "@google/genai";

/**
 * AI Product Recommendation Service
 * Stage 1: Rule-based complementary cross-sell, order co-occurrence, and affinity scoring.
 * Stage 2: Personalized AI styling notes and compatibility narratives via Google Gemini.
 */

// Complementary Cross-Sell Relationship Matrix
// Maps base concepts/categories to their natural accessories, add-ons, and pairings
const COMPLEMENTARY_RULES = [
  // Tech & Computers
  {
    triggers: ["laptop", "computer", "pc", "macbook", "notebook", "desktop"],
    complements: ["mouse", "keyboard", "laptop bag", "bag", "sleeve", "backpack", "usb", "hub", "charger", "cable", "mousepad", "headphone", "earphone", "stand"],
    reason: "Compatible Add-on",
  },
  {
    triggers: ["phone", "smartphone", "mobile", "tablet", "ipad"],
    complements: ["case", "cover", "screen protector", "charger", "power bank", "cable", "earbuds", "earphone", "stand"],
    reason: "Compatible Add-on",
  },
  // Apparel & Fashion ("Complete the Look")
  {
    triggers: ["hoodie", "sweatshirt", "sweater"],
    complements: ["pants", "pant", "cargo", "jogger", "denim", "t-shirt", "tee", "beanie", "cap", "sneakers"],
    reason: "Complete the Look",
  },
  {
    triggers: ["jacket", "coat", "outerwear", "windbreaker", "blazer", "puffer"],
    complements: ["t-shirt", "tee", "hoodie", "pants", "cargo", "denim", "trousers", "boots", "muffler", "scarf"],
    reason: "Complete the Look",
  },
  {
    triggers: ["t-shirt", "tee", "shirt", "polo"],
    complements: ["pants", "denim", "cargo", "jogger", "shorts", "jacket", "hoodie", "cap", "belt"],
    reason: "Pairs Well With",
  },
  {
    triggers: ["pant", "pants", "cargo", "jogger", "denim", "jeans", "trousers"],
    complements: ["t-shirt", "tee", "hoodie", "shirt", "belt", "sneakers", "socks"],
    reason: "Pairs Well With",
  },
  {
    triggers: ["panjabi", "kurta", "traditional", "kabli"],
    complements: ["pajama", "pyjama", "shawl", "koti", "vest", "sandals"],
    reason: "Complete the Look",
  },
  {
    triggers: ["shoe", "shoes", "sneakers", "boots", "loafers"],
    complements: ["socks", "shoe care", "pants", "joggers"],
    reason: "Essential Add-on",
  },
];

/**
 * Checks if candidate text matches any complementary trigger for a base product
 */
function findComplementaryKeywords(product) {
  if (!product) return [];
  const text = `${product.name || ""} ${product.slug || ""} ${product.category?.name || ""} ${product.category?.slug || ""} ${(product.highlights || []).join(" ")}`.toLowerCase();

  const matchedComplements = new Set();
  for (const rule of COMPLEMENTARY_RULES) {
    const isTriggered = rule.triggers.some((trig) => text.includes(trig));
    if (isTriggered) {
      rule.complements.forEach((c) => matchedComplements.add({ keyword: c, defaultReason: rule.reason }));
    }
  }
  return Array.from(matchedComplements);
}

/**
 * Aggregates order history to find products frequently bought together with the target items
 */
async function getOrderCoOccurrences(targetProductIds, excludeIds, limit = 6) {
  if (!targetProductIds || targetProductIds.length === 0) return new Map();

  const targetObjectIds = targetProductIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const excludeObjectIds = excludeIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (targetObjectIds.length === 0) return new Map();

  try {
    const coOccurring = await Order.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          "order_items.product_id": { $in: targetObjectIds },
        },
      },
      { $unwind: "$order_items" },
      {
        $match: {
          "order_items.product_id": {
            $nin: [...targetObjectIds, ...excludeObjectIds],
          },
        },
      },
      {
        $group: {
          _id: "$order_items.product_id",
          coCount: { $sum: "$order_items.quantity" },
        },
      },
      { $sort: { coCount: -1 } },
      { $limit: limit * 2 },
    ]);

    const coMap = new Map();
    for (const item of coOccurring) {
      if (item._id) {
        coMap.set(item._id.toString(), item.coCount);
      }
    }
    return coMap;
  } catch (err) {
    console.warn("[RecommendationService] Co-occurrence query error:", err.message);
    return new Map();
  }
}

/**
 * Fetches products previously purchased by a logged-in user
 */
async function getUserPurchasedProductIds(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return [];
  try {
    const orders = await Order.find(
      { user_id: new mongoose.Types.ObjectId(userId), status: { $ne: "cancelled" } },
      "order_items.product_id"
    ).lean();

    const ids = new Set();
    for (const o of orders) {
      for (const item of o.order_items || []) {
        if (item.product_id) ids.add(item.product_id.toString());
      }
    }
    return Array.from(ids);
  } catch (err) {
    console.warn("[RecommendationService] User purchase fetch error:", err.message);
    return [];
  }
}

/**
 * Formats a raw MongoDB Product into a standardized recommendation item
 */
function formatRecommendationItem(product, reason = "Recommended for You", score = 50, aiReason = null) {
  const totalStock = (product.product_variants || []).reduce(
    (sum, v) => sum + (Number(v.stock_level) || 0),
    0
  );

  return {
    id: product._id.toString(),
    _id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    base_price: product.base_price,
    traditional_price: product.traditional_price,
    short_description: product.short_description || "",
    image: product.product_images?.[0]?.url || "/placeholder.svg",
    product_images: product.product_images || [],
    product_variants: (product.product_variants || []).map((v) => ({
      id: v._id?.toString() || v.id,
      variant_name: v.variant_name,
      price_modifier: v.price_modifier || 0,
      sku: v.sku || "",
      stock_level: v.stock_level ?? 99,
    })),
    category_id: product.category_id?._id || product.category_id,
    categories: product.category_id?.name ? {
      id: product.category_id._id?.toString(),
      name: product.category_id.name,
      slug: product.category_id.slug,
    } : null,
    total_stock: totalStock,
    is_in_stock: totalStock > 0,
    recommendation_reason: reason,
    ai_reason: aiReason,
    recommendation_score: score,
  };
}

/**
 * Core Recommendation Engine
 * Combines cross-sell rules, order co-occurrence, and browsing/cart/purchase affinity.
 */
export async function getRecommendations({
  productId = null,
  cartProductIds = [],
  viewedProductIds = [],
  userId = null,
  type = "complementary",
  limit = 4,
}) {
  const parsedLimit = Math.max(1, Math.min(16, parseInt(limit) || 4));

  // 1. Gather all target context products and exclusion set
  const excludeIdSet = new Set();
  if (productId) excludeIdSet.add(productId.toString());
  cartProductIds.forEach((id) => excludeIdSet.add(id.toString()));

  // 2. Fetch base context product if productId was supplied
  let baseProduct = null;
  if (productId && mongoose.Types.ObjectId.isValid(productId)) {
    baseProduct = await Product.findById(productId).populate("category_id", "name slug").lean();
  }

  // 3. Fetch cart products to extract active cart intent
  const cartObjectIds = cartProductIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  let cartProducts = [];
  if (cartObjectIds.length > 0) {
    cartProducts = await Product.find({ _id: { $in: cartObjectIds } })
      .populate("category_id", "name slug")
      .lean();
  }

  // 4. Fetch user's past purchased products for authenticated customer personalization
  const userPastPurchasedIds = await getUserPurchasedProductIds(userId);

  // 5. Build affinity seeds
  // Target products driving recommendations: baseProduct > cartProducts > recently viewed
  const seedProducts = [];
  if (baseProduct) seedProducts.push(baseProduct);
  cartProducts.forEach((p) => seedProducts.push(p));

  // 6. Find complementary rule matches for seed products
  const complementaryKeywords = [];
  for (const seed of seedProducts) {
    const seedComplements = findComplementaryKeywords(seed);
    complementaryKeywords.push(...seedComplements);
  }

  // 7. Check historical order co-occurrences ("Frequently Bought Together")
  const targetIdsForCoOccurrence = seedProducts.map((p) => p._id.toString());
  if (targetIdsForCoOccurrence.length === 0 && userPastPurchasedIds.length > 0) {
    targetIdsForCoOccurrence.push(...userPastPurchasedIds.slice(0, 3));
  }

  const coOccurrenceMap = await getOrderCoOccurrences(
    targetIdsForCoOccurrence,
    Array.from(excludeIdSet),
    parsedLimit
  );

  // 8. Query Candidate Pool from MongoDB
  // We fetch candidates matching complementary keywords, categories, or co-occurrences
  const orConditions = [];

  // Match co-occurring products
  const coOccurIds = Array.from(coOccurrenceMap.keys())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (coOccurIds.length > 0) {
    orConditions.push({ _id: { $in: coOccurIds } });
  }

  // Match complementary keywords in name, slug, highlights
  if (complementaryKeywords.length > 0) {
    for (const ck of complementaryKeywords.slice(0, 8)) {
      orConditions.push({ name: { $regex: ck.keyword, $options: "i" } });
      orConditions.push({ slug: { $regex: ck.keyword, $options: "i" } });
    }
  }

  // Match recently viewed / user purchase categories
  const viewedObjectIds = viewedProductIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (viewedObjectIds.length > 0) {
    const viewedProducts = await Product.find({ _id: { $in: viewedObjectIds } }, "category_id").lean();
    const catIds = viewedProducts.map((p) => p.category_id).filter(Boolean);
    if (catIds.length > 0) {
      orConditions.push({ category_id: { $in: catIds } });
    }
  }

  // If type is "similar", look in the same category
  if (type === "similar" && baseProduct?.category_id) {
    orConditions.push({ category_id: baseProduct.category_id._id || baseProduct.category_id });
  }

  // Fallback query condition if no conditions generated
  if (orConditions.length === 0) {
    orConditions.push({ is_featured: true });
    orConditions.push({ base_price: { $gt: 0 } });
  }

  // Fetch candidate products (filter out excluded IDs, ensure in-stock & positive price)
  const candidateDocs = await Product.find({
    _id: { $nin: Array.from(excludeIdSet).map((id) => new mongoose.Types.ObjectId(id)) },
    base_price: { $gt: 0 },
    $or: orConditions,
  })
    .populate("category_id", "name slug")
    .limit(parsedLimit * 4)
    .lean();

  // If candidate pool is too small, backfill with featured and in-stock products
  let candidates = [...candidateDocs];
  if (candidates.length < parsedLimit * 2) {
    const backfill = await Product.find({
      _id: {
        $nin: [
          ...Array.from(excludeIdSet).map((id) => new mongoose.Types.ObjectId(id)),
          ...candidates.map((c) => c._id),
        ],
      },
      base_price: { $gt: 0 },
    })
      .populate("category_id", "name slug")
      .sort({ is_featured: -1, createdAt: -1 })
      .limit(parsedLimit * 2)
      .lean();

    candidates.push(...backfill);
  }

  // 9. Score and Rank Candidates
  const scoredItems = [];
  const basePrice = baseProduct?.base_price || 1000;

  for (const cand of candidates) {
    const candId = cand._id.toString();
    const candTotalStock = (cand.product_variants || []).reduce(
      (sum, v) => sum + (Number(v.stock_level) || 0),
      0
    );

    // Skip out of stock items
    if (candTotalStock <= 0) continue;

    let score = 20;
    let primaryReason = "Recommended for You";

    // A. Co-occurrence with active target (Frequently bought together)
    const coCount = coOccurrenceMap.get(candId);
    if (coCount && coCount > 0) {
      score += 50 + coCount * 10;
      primaryReason = "Frequently Bought Together";
    }

    // B. Complementary rule match
    const candText = `${cand.name} ${cand.slug} ${cand.category_id?.name || ""}`.toLowerCase();
    for (const ck of complementaryKeywords) {
      if (candText.includes(ck.keyword)) {
        score += 35;
        if (!primaryReason || primaryReason === "Recommended for You") {
          primaryReason = ck.defaultReason || "Compatible Add-on";
        }
        break;
      }
    }

    // C. Same activity or style matching
    if (baseProduct?.activity && cand.activity) {
      const commonActivity = baseProduct.activity.some((a) => cand.activity.includes(a));
      if (commonActivity) score += 15;
    }

    // D. Category affinity from browsing history
    if (viewedProductIds.includes(candId)) {
      score += 10;
      if (primaryReason === "Recommended for You") {
        primaryReason = "Recently Browsed";
      }
    }

    // E. Price Heuristic for Add-ons:
    // Accessories/add-ons priced between 15% and 80% of main product get an impulse bonus
    if (baseProduct && cand.base_price > 0) {
      const priceRatio = cand.base_price / basePrice;
      if (priceRatio >= 0.15 && priceRatio <= 0.85) {
        score += 15;
      }
    }

    // F. Featured bonus
    if (cand.is_featured) score += 10;

    scoredItems.push({
      product: cand,
      reason: primaryReason,
      score,
    });
  }

  // Sort by score descending
  scoredItems.sort((a, b) => b.score - a.score);

  // Return formatted top recommendations
  const topRecommendations = scoredItems
    .slice(0, parsedLimit)
    .map((item) => formatRecommendationItem(item.product, item.reason, item.score));

  return topRecommendations;
}

/**
 * Returns "Frequently Bought Together" bundle (main product + 1 or 2 complementary add-ons)
 */
export async function getProductBundle(productId) {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Valid product ID is required for bundle calculation.");
  }

  const baseProduct = await Product.findById(productId)
    .populate("category_id", "name slug")
    .lean();

  if (!baseProduct) {
    throw new Error("Product not found");
  }

  // Fetch 2 complementary add-ons
  const addOns = await getRecommendations({
    productId,
    type: "complementary",
    limit: 2,
  });

  const formattedBase = formatRecommendationItem(baseProduct, "Main Product", 100);

  // Calculate bundle pricing
  const basePrice = formattedBase.base_price || 0;
  const addOnsTotal = addOns.reduce((sum, item) => sum + (item.base_price || 0), 0);
  const bundleTotalPrice = basePrice + addOnsTotal;

  // 5% bundle discount incentive for buying paired items together
  const bundleDiscountPercent = addOns.length > 0 ? 5 : 0;
  const bundleDiscountAmount = Math.round((bundleTotalPrice * bundleDiscountPercent) / 100);
  const bundleFinalPrice = bundleTotalPrice - bundleDiscountAmount;

  return {
    baseProduct: formattedBase,
    addOns,
    bundlePricing: {
      totalPrice: bundleTotalPrice,
      discountPercent: bundleDiscountPercent,
      discountAmount: bundleDiscountAmount,
      finalPrice: bundleFinalPrice,
    },
  };
}

/**
 * Stage 2: Generates personalized styling notes and compatibility rationales via Gemini AI
 */
export async function generateAiRecommendationInsights(baseProductName, recommendedItems) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return (recommendedItems || []).map((item) => ({
      id: item.id,
      rationale: `${item.recommendation_reason} • Crafted to complement ${baseProductName || "your selection"} perfectly.`,
    }));
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are the Lead Personal Stylist & Merchandise Curator for BazzarBD e-commerce in Bangladesh.
Base Customer Selection: "${baseProductName || "Shopping Cart Selection"}"

RECOMMENDED PRODUCTS:
${JSON.stringify(
  recommendedItems.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.categories?.name,
    price: `${r.base_price} BDT`,
  })),
  null,
  2
)}

TASK:
Write a punchy, 1-sentence personalized styling or compatibility rationale for each item explaining why it pairs with "${baseProductName}".
Keep tone refined, modern, and helpful.

Return ONLY raw JSON with this format:
[
  { "id": "product_id", "rationale": "1 concise sentence why this is the perfect companion item" }
]
`;

    const modelCandidates = ["gemini-3.8-flash", "gemini-3-flash-preview", "gemini-flash-latest"];
    let responseText = null;

    for (const model of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        });
        if (response?.text) {
          responseText = response.text;
          break;
        }
      } catch (candidateErr) {
        console.warn(`[AI Recommendation] Model ${model} failed, trying next:`, candidateErr.message);
      }
    }

    if (responseText) {
      const parsed = JSON.parse(responseText.trim());
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("[AI Recommendation] Gemini API error:", err.message);
  }

  // Graceful fallback
  return (recommendedItems || []).map((item) => ({
    id: item.id,
    rationale: `Handpicked companion for ${baseProductName || "your cart items"}.`,
  }));
}
