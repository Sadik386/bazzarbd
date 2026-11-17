import mongoose from "../db/mongoCompat.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { GoogleGenAI } from "@google/genai";

/**
 * Smart Inventory & Demand Forecasting Service
 * Phase 1: High-performance MongoDB aggregations + statistical sales velocity formulas.
 * Phase 2: Pluggable Google Gemini AI seasonal demand forecasting narrative.
 */

/**
 * Aggregates order sales per product and variant over the past 60 days
 */
async function aggregateSalesMetrics(sixtyDaysAgo, thirtyDaysAgo, sevenDaysAgo) {
  const pipeline = [
    {
      $match: {
        status: { $ne: "cancelled" },
        createdAt: { $gte: sixtyDaysAgo },
      },
    },
    { $unwind: "$order_items" },
    {
      $group: {
        _id: {
          product_id: "$order_items.product_id",
          variant_id: "$order_items.variant_id",
        },
        sold_total_60d: { $sum: "$order_items.quantity" },
        sold_30d: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", thirtyDaysAgo] }, "$order_items.quantity", 0],
          },
        },
        sold_7d: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, "$order_items.quantity", 0],
          },
        },
        revenue_30d: {
          $sum: {
            $cond: [
              { $gte: ["$createdAt", thirtyDaysAgo] },
              { $multiply: ["$order_items.quantity", "$order_items.unit_price"] },
              0,
            ],
          },
        },
        last_sold_at: { $max: "$createdAt" },
      },
    },
    {
      $group: {
        _id: "$_id.product_id",
        total_sold_60d: { $sum: "$sold_total_60d" },
        total_sold_30d: { $sum: "$sold_30d" },
        total_sold_7d: { $sum: "$sold_7d" },
        total_revenue_30d: { $sum: "$revenue_30d" },
        last_sold_at: { $max: "$last_sold_at" },
        variants: {
          $push: {
            variant_id: "$_id.variant_id",
            sold_30d: "$sold_30d",
            sold_7d: "$sold_7d",
            revenue_30d: "$revenue_30d",
            last_sold_at: "$last_sold_at",
          },
        },
      },
    },
  ];

  const results = await Order.aggregate(pipeline);
  const salesMap = new Map();
  for (const item of results) {
    if (item._id) {
      salesMap.set(item._id.toString(), item);
    }
  }
  return salesMap;
}

/**
 * Computes comprehensive inventory analytics and forecasting metrics for a product
 */
function computeProductInventoryMetrics(product, salesData, leadTimeDays = 7) {
  const variants = product.product_variants || [];
  const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock_level) || 0), 0);

  const sold30d = salesData?.total_sold_30d || 0;
  const sold7d = salesData?.total_sold_7d || 0;
  const revenue30d = salesData?.total_revenue_30d || 0;
  const lastSoldAt = salesData?.last_sold_at || null;

  // Daily Sales Velocities
  const velocity7d = parseFloat((sold7d / 7).toFixed(2));
  const velocity30d = parseFloat((sold30d / 30).toFixed(2));

  // Weighted Daily Velocity: 65% recent 7-day momentum, 35% 30-day baseline
  let weightedVelocity = 0;
  if (velocity7d > 0 && velocity30d > 0) {
    weightedVelocity = parseFloat((0.65 * velocity7d + 0.35 * velocity30d).toFixed(2));
  } else if (velocity7d > 0) {
    weightedVelocity = velocity7d;
  } else {
    weightedVelocity = velocity30d;
  }

  // Velocity Momentum Trend
  let velocityTrend = "dormant";
  if (velocity30d === 0 && velocity7d === 0) {
    velocityTrend = "dormant";
  } else if (velocity30d === 0 && velocity7d > 0) {
    velocityTrend = "accelerating";
  } else if (velocity7d >= 1.25 * velocity30d) {
    velocityTrend = "accelerating";
  } else if (velocity7d <= 0.75 * velocity30d) {
    velocityTrend = "declining";
  } else {
    velocityTrend = "steady";
  }

  // Days of Inventory Remaining (DIR)
  let daysRemaining = null;
  let estimatedStockoutDate = null;

  if (totalStock <= 0) {
    daysRemaining = 0;
    estimatedStockoutDate = new Date().toISOString();
  } else if (weightedVelocity > 0) {
    daysRemaining = Math.round(totalStock / weightedVelocity);
    const msUntilOut = daysRemaining * 86400000;
    estimatedStockoutDate = new Date(Date.now() + msUntilOut).toISOString();
  }

  // Stockout Risk / Inventory Health Classification
  const productAgeDays = Math.floor(
    (Date.now() - new Date(product.createdAt).getTime()) / 86400000
  );

  let stockStatus = "HEALTHY";
  if (totalStock <= 0) {
    stockStatus = "OUT_OF_STOCK";
  } else if (daysRemaining !== null && daysRemaining <= 7) {
    stockStatus = "CRITICAL";
  } else if (daysRemaining !== null && daysRemaining <= 14) {
    stockStatus = "MODERATE";
  } else if (totalStock > 0 && sold30d === 0 && productAgeDays >= 14) {
    stockStatus = "DEAD_STOCK";
  } else if (daysRemaining !== null && daysRemaining > 60 && totalStock >= 10) {
    stockStatus = "OVERSTOCKED";
  } else {
    stockStatus = "HEALTHY";
  }

  // Demand Forecast Projections
  const forecast7d = Math.ceil(weightedVelocity * 7);
  const forecast14d = Math.ceil(weightedVelocity * 14);
  const forecast30d = Math.ceil(weightedVelocity * 30);

  // Restock Recommendations (Reorder Point & Safety Stock)
  const safetyBufferDays = leadTimeDays >= 14 ? 7 : 5;
  const safetyStock = Math.ceil(weightedVelocity * safetyBufferDays);
  const reorderPoint = Math.ceil(weightedVelocity * leadTimeDays + safetyStock);

  const needsReorder =
    totalStock <= reorderPoint && (weightedVelocity > 0 || totalStock === 0);

  let recommendedReorderQty = 0;
  if (needsReorder) {
    const targetCycleStock = Math.ceil(weightedVelocity * 30);
    recommendedReorderQty = Math.max(1, targetCycleStock + safetyStock - totalStock);
  }

  // Capital Calculations (BDT)
  const unitPrice = product.base_price || 0;
  const tiedUpCapital = totalStock * unitPrice;

  // Variant-level Breakdown
  const variantSalesMap = new Map(
    (salesData?.variants || []).map((vs) => [vs.variant_id?.toString(), vs])
  );

  const variantAnalysis = variants.map((v) => {
    const vId = v._id?.toString() || v.id;
    const vStock = Number(v.stock_level) || 0;
    const vSales = variantSalesMap.get(vId);
    const vSold30d = vSales?.sold_30d || 0;
    const vSold7d = vSales?.sold_7d || 0;
    const vVelocity = parseFloat((vSold30d / 30).toFixed(2));
    const vDaysRemaining =
      vStock <= 0 ? 0 : vVelocity > 0 ? Math.round(vStock / vVelocity) : null;
    const vROP = Math.ceil(vVelocity * leadTimeDays + vVelocity * safetyBufferDays);
    const vNeedsReorder = vStock <= vROP && (vVelocity > 0 || vStock === 0);
    const vReorderQty = vNeedsReorder
      ? Math.max(1, Math.ceil(vVelocity * 30 + vVelocity * safetyBufferDays - vStock))
      : 0;

    return {
      variant_id: vId,
      variant_name: v.variant_name,
      sku: v.sku || "N/A",
      stock_level: vStock,
      price_modifier: v.price_modifier || 0,
      sold_30d: vSold30d,
      sold_7d: vSold7d,
      daily_velocity: vVelocity,
      days_remaining: vDaysRemaining,
      needs_reorder: vNeedsReorder,
      recommended_reorder_qty: vReorderQty,
    };
  });

  return {
    id: product._id,
    name: product.name,
    slug: product.slug,
    image: product.product_images?.[0]?.url || "/placeholder.svg",
    category_id: product.category_id,
    category_name: product.category?.name || "Uncategorized",
    base_price: product.base_price,
    traditional_price: product.traditional_price,
    total_stock: totalStock,
    sold_7d: sold7d,
    sold_30d: sold30d,
    revenue_30d: revenue30d,
    daily_velocity: velocity30d,
    velocity_7d: velocity7d,
    weighted_velocity: weightedVelocity,
    velocity_trend: velocityTrend,
    days_inventory_remaining: daysRemaining,
    estimated_stockout_date: estimatedStockoutDate,
    stockout_risk: stockStatus,
    forecasted_demand_7d: forecast7d,
    forecasted_demand_14d: forecast14d,
    forecasted_demand_30d: forecast30d,
    lead_time_days: leadTimeDays,
    reorder_point: reorderPoint,
    needs_reorder: needsReorder,
    recommended_reorder_qty: recommendedReorderQty,
    tied_up_capital: tiedUpCapital,
    last_sold_at: lastSoldAt,
    created_at: product.createdAt,
    variants: variantAnalysis,
  };
}

/**
 * Returns overall storewide inventory KPIs and alert counters
 */
export async function getInventorySummary(leadTimeDays = 7) {
  const now = Date.now();
  const sixtyDaysAgo = new Date(now - 60 * 86400000);
  const thirtyDaysAgo = new Date(now - 30 * 86400000);
  const sevenDaysAgo = new Date(now - 7 * 86400000);

  const [salesMap, products] = await Promise.all([
    aggregateSalesMetrics(sixtyDaysAgo, thirtyDaysAgo, sevenDaysAgo),
    Product.find({}, "name slug base_price product_variants createdAt").lean(),
  ]);

  let outOfStockCount = 0;
  let criticalStockCount = 0;
  let moderateStockCount = 0;
  let healthyStockCount = 0;
  let fastMovingCount = 0;
  let overstockedCount = 0;
  let deadStockCount = 0;
  let deadStockCapital = 0;
  let totalRestockNeededCount = 0;
  let totalRestockUnits = 0;
  let totalInventoryUnits = 0;
  let totalInventoryValue = 0;

  for (const product of products) {
    const sales = salesMap.get(product._id.toString());
    const metrics = computeProductInventoryMetrics(product, sales, leadTimeDays);

    totalInventoryUnits += metrics.total_stock;
    totalInventoryValue += metrics.tied_up_capital;

    if (metrics.stockout_risk === "OUT_OF_STOCK") outOfStockCount++;
    else if (metrics.stockout_risk === "CRITICAL") criticalStockCount++;
    else if (metrics.stockout_risk === "MODERATE") moderateStockCount++;
    else if (metrics.stockout_risk === "HEALTHY") healthyStockCount++;
    else if (metrics.stockout_risk === "OVERSTOCKED") overstockedCount++;
    else if (metrics.stockout_risk === "DEAD_STOCK") {
      deadStockCount++;
      deadStockCapital += metrics.tied_up_capital;
    }

    if (metrics.daily_velocity >= 1.0 || metrics.velocity_7d >= 1.0) {
      fastMovingCount++;
    }

    if (metrics.needs_reorder) {
      totalRestockNeededCount++;
      totalRestockUnits += metrics.recommended_reorder_qty;
    }
  }

  return {
    totalProducts: products.length,
    totalInventoryUnits,
    totalInventoryValue,
    outOfStockCount,
    criticalStockCount,
    moderateStockCount,
    healthyStockCount,
    fastMovingCount,
    overstockedCount,
    deadStockCount,
    deadStockCapital,
    totalRestockNeededCount,
    totalRestockUnits,
  };
}

/**
 * Returns paginated, filterable, sortable inventory analytics list
 */
export async function getInventoryAnalytics({
  page = 1,
  limit = 20,
  search = "",
  category = "all",
  status = "all",
  sortBy = "stockout_urgency",
  leadTimeDays = 7,
}) {
  const now = Date.now();
  const sixtyDaysAgo = new Date(now - 60 * 86400000);
  const thirtyDaysAgo = new Date(now - 30 * 86400000);
  const sevenDaysAgo = new Date(now - 7 * 86400000);

  // 1. Fetch sales aggregation
  const salesMap = await aggregateSalesMetrics(sixtyDaysAgo, thirtyDaysAgo, sevenDaysAgo);

  // 2. Build product query
  let productFilter = {};

  if (category && category !== "all") {
    if (mongoose.Types.ObjectId.isValid(category)) {
      productFilter.category_id = new mongoose.Types.ObjectId(category);
    } else {
      const cat = await Category.findOne({ slug: category }).select("_id").lean();
      if (cat) productFilter.category_id = cat._id;
    }
  }

  if (search && search.trim()) {
    const term = search.trim();
    productFilter.$or = [
      { name: { $regex: term, $options: "i" } },
      { slug: { $regex: term, $options: "i" } },
      { "product_variants.sku": { $regex: term, $options: "i" } },
    ];
  }

  // Fetch matched products
  const products = await Product.find(productFilter)
    .populate("category_id", "name slug")
    .lean();

  // 3. Compute metrics for each product
  let computedItems = products.map((prod) => {
    const sales = salesMap.get(prod._id.toString());
    const item = computeProductInventoryMetrics(prod, sales, leadTimeDays);
    item.category = prod.category_id ? { name: prod.category_id.name, slug: prod.category_id.slug } : null;
    return item;
  });

  // 4. Apply status filters
  if (status && status !== "all") {
    switch (status) {
      case "stockout_risk":
        computedItems = computedItems.filter(
          (p) => p.stockout_risk === "OUT_OF_STOCK" || p.stockout_risk === "CRITICAL" || p.stockout_risk === "MODERATE"
        );
        break;
      case "fast_moving":
        computedItems = computedItems.filter(
          (p) => p.daily_velocity >= 1.0 || p.velocity_7d >= 1.0 || p.velocity_trend === "accelerating"
        );
        break;
      case "overstocked":
        computedItems = computedItems.filter((p) => p.stockout_risk === "OVERSTOCKED");
        break;
      case "dead_stock":
        computedItems = computedItems.filter((p) => p.stockout_risk === "DEAD_STOCK");
        break;
      case "needs_restock":
        computedItems = computedItems.filter((p) => p.needs_reorder);
        break;
      case "healthy":
        computedItems = computedItems.filter((p) => p.stockout_risk === "HEALTHY");
        break;
      default:
        break;
    }
  }

  // 5. Apply sorting
  computedItems.sort((a, b) => {
    switch (sortBy) {
      case "velocity_desc":
        return b.weighted_velocity - a.weighted_velocity || b.sold_30d - a.sold_30d;
      case "days_left_asc":
        if (a.days_inventory_remaining === null) return 1;
        if (b.days_inventory_remaining === null) return -1;
        return a.days_inventory_remaining - b.days_inventory_remaining;
      case "stock_asc":
        return a.total_stock - b.total_stock;
      case "stock_desc":
        return b.total_stock - a.total_stock;
      case "revenue_desc":
        return b.revenue_30d - a.revenue_30d;
      case "reorder_qty_desc":
        return b.recommended_reorder_qty - a.recommended_reorder_qty;
      case "stockout_urgency":
      default: {
        const priorityOrder = {
          OUT_OF_STOCK: 1,
          CRITICAL: 2,
          MODERATE: 3,
          DEAD_STOCK: 4,
          OVERSTOCKED: 5,
          HEALTHY: 6,
        };
        const pA = priorityOrder[a.stockout_risk] || 7;
        const pB = priorityOrder[b.stockout_risk] || 7;
        if (pA !== pB) return pA - pB;
        if (a.days_inventory_remaining !== null && b.days_inventory_remaining !== null) {
          return a.days_inventory_remaining - b.days_inventory_remaining;
        }
        return b.weighted_velocity - a.weighted_velocity;
      }
    }
  });

  // 6. Pagination
  const total = computedItems.length;
  const parsedPage = Math.max(1, parseInt(page));
  const parsedLimit = Math.max(1, parseInt(limit));
  const startIndex = (parsedPage - 1) * parsedLimit;
  const paginatedItems = computedItems.slice(startIndex, startIndex + parsedLimit);

  return {
    items: paginatedItems,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      pages: Math.ceil(total / parsedLimit),
    },
  };
}

/**
 * Generates CSV string for restock purchase orders
 */
export async function exportRestockCSV(leadTimeDays = 7) {
  const { items } = await getInventoryAnalytics({
    page: 1,
    limit: 1000,
    status: "needs_restock",
    sortBy: "stockout_urgency",
    leadTimeDays,
  });

  const headers = [
    "Product Name",
    "Product Slug",
    "Variant Name",
    "SKU",
    "Current Stock",
    "30-Day Sales",
    "Daily Velocity (units/day)",
    "Reorder Point (ROP)",
    "Suggested Reorder Qty",
    "Base Price (BDT)",
    "Estimated Cost (BDT)",
  ];

  const rows = [];
  for (const item of items) {
    if (item.variants && item.variants.length > 0) {
      for (const v of item.variants) {
        if (v.needs_reorder || v.recommended_reorder_qty > 0 || item.needs_reorder) {
          const qty = v.recommended_reorder_qty > 0 ? v.recommended_reorder_qty : Math.ceil(item.recommended_reorder_qty / item.variants.length);
          const cost = qty * item.base_price;
          rows.push([
            `"${item.name.replace(/"/g, '""')}"`,
            `"${item.slug}"`,
            `"${v.variant_name.replace(/"/g, '""')}"`,
            `"${v.sku}"`,
            v.stock_level,
            v.sold_30d,
            v.daily_velocity,
            item.reorder_point,
            qty,
            item.base_price,
            cost,
          ]);
        }
      }
    } else {
      const cost = item.recommended_reorder_qty * item.base_price;
      rows.push([
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.slug}"`,
        "Default",
        "N/A",
        item.total_stock,
        item.sold_30d,
        item.weighted_velocity,
        item.reorder_point,
        item.recommended_reorder_qty,
        item.base_price,
        cost,
      ]);
    }
  }

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Quick inline stock adjustment for a variant
 */
export async function adjustVariantStock(productId, variantId, newStock) {
  const stockNum = parseInt(newStock);
  if (isNaN(stockNum) || stockNum < 0) {
    throw new Error("Invalid stock quantity. Must be a non-negative number.");
  }

  const variantObjectId = mongoose.Types.ObjectId.isValid(variantId)
    ? new mongoose.Types.ObjectId(variantId)
    : variantId;

  const result = await Product.updateOne(
    {
      _id: productId,
      product_variants: {
        $elemMatch: { _id: variantObjectId },
      },
    },
    {
      $set: { "product_variants.$.stock_level": stockNum },
    }
  );

  if (result.matchedCount === 0) {
    throw new Error("Product or variant not found.");
  }

  return { success: true, productId, variantId, newStock: stockNum };
}

/**
 * Phase 2: Generates AI-driven strategic demand forecasting narrative via Google Gemini
 */
export async function generateAiInventoryForecast() {
  const apiKey = process.env.GEMINI_API_KEY;

  // Retrieve top inventory items to provide context
  const { items: topSellers } = await getInventoryAnalytics({
    page: 1,
    limit: 5,
    status: "fast_moving",
    sortBy: "velocity_desc",
  });

  const { items: stockoutRisk } = await getInventoryAnalytics({
    page: 1,
    limit: 5,
    status: "stockout_risk",
    sortBy: "days_left_asc",
  });

  const { items: deadStock } = await getInventoryAnalytics({
    page: 1,
    limit: 5,
    status: "dead_stock",
    sortBy: "stock_desc",
  });

  const summary = await getInventorySummary();

  const inventoryContext = {
    summary,
    fastMoving: topSellers.map((p) => ({
      name: p.name,
      stock: p.total_stock,
      dailyVelocity: p.weighted_velocity,
      trend: p.velocity_trend,
      sold30d: p.sold_30d,
    })),
    stockoutRisk: stockoutRisk.map((p) => ({
      name: p.name,
      stock: p.total_stock,
      daysRemaining: p.days_inventory_remaining,
      recommendedReorder: p.recommended_reorder_qty,
    })),
    deadStock: deadStock.map((p) => ({
      name: p.name,
      stock: p.total_stock,
      tiedCapital: p.tied_up_capital,
      price: p.base_price,
    })),
  };

  // Fallback when API key is missing
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return {
      ai_powered: false,
      timestamp: new Date().toISOString(),
      highlights: [
        `🚨 ${summary.outOfStockCount + summary.criticalStockCount} items face urgent stockout risk within 7 days. Immediate supplier replenishment recommended.`,
        `🔥 ${summary.fastMovingCount} high-velocity catalog items drive the majority of store turnover. Prioritize continuous inventory buffering.`,
        `📦 ৳${summary.deadStockCapital.toLocaleString()} BDT is currently tied up in dormant inventory. Recommend flash sales or bundling.`,
      ],
      seasonal_advice:
        "Ensure pre-booking for popular fabrics and sizes ahead of the upcoming seasonal peaks in Bangladesh.",
      restock_strategy:
        "Focus 70% of available restocking working capital on the top-velocity items with less than 10 days of supply remaining.",
      clearance_strategy:
        "Offer Buy 1 Get 1 or 20-30% clearance discount coupons on dead stock items to convert stagnant inventory into cashflow.",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are the Lead Supply Chain & E-Commerce Merchandising AI for BazzarBD, an online retail marketplace in Bangladesh.
Current Local Date: ${new Date().toISOString().split("T")[0]}

INVENTORY METRICS CONTEXT:
${JSON.stringify(inventoryContext, null, 2)}

TASK:
Analyze these live sales metrics and provide high-value, actionable e-commerce demand forecasting intelligence adhering strictly to the JSON schema below.
Consider the Bangladeshi cultural, seasonal, and retail calendar (weather changes, Eid/Puja, wedding season, winter fashion, payday cycles).

Return ONLY raw JSON with this exact structure:
{
  "highlights": [
    "Key observation 1 with specific numbers and urgency",
    "Key observation 2 regarding fast movers or demand trajectory",
    "Key observation 3 regarding capital efficiency or dead stock"
  ],
  "seasonal_advice": "Specific Bangladeshi market seasonal advice (weather, festive shopping, timing)",
  "restock_strategy": "Actionable priority guidance on how much capital to allocate and which products to reorder first",
  "clearance_strategy": "Specific promotion, discount, or marketing angle to liquidate dead stock quickly"
}
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
        console.warn(`[AI Inventory] Model ${model} failed, trying next:`, candidateErr.message);
      }
    }

    if (responseText) {
      const parsed = JSON.parse(responseText.trim());
      return {
        ai_powered: true,
        timestamp: new Date().toISOString(),
        ...parsed,
      };
    }
  } catch (err) {
    console.error("[AI Inventory] Error calling Gemini API:", err.message);
  }

  // Graceful fallback
  return {
    ai_powered: false,
    timestamp: new Date().toISOString(),
    highlights: [
      `🚨 ${summary.outOfStockCount + summary.criticalStockCount} products are near or at stockout.`,
      `🔥 Fast-moving products require active replenishment to prevent revenue loss.`,
      `📦 ৳${summary.deadStockCapital.toLocaleString()} BDT is locked in zero-sales inventory.`,
    ],
    seasonal_advice: "Plan inventory 3-4 weeks ahead of peak Bangladeshi festival and seasonal shopping cycles.",
    restock_strategy: "Reorder critical products matching supplier lead times to avoid stockouts.",
    clearance_strategy: "Bundle slow-moving items with popular bestsellers to accelerate turnover.",
  };
}
