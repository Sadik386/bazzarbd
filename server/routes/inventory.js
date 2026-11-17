import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { allowRoles } from "../middleware/rbac.js";
import { logAdminAction } from "../utils/auditLogger.js";
import {
  getInventorySummary,
  getInventoryAnalytics,
  exportRestockCSV,
  adjustVariantStock,
  generateAiInventoryForecast,
} from "../services/inventoryService.js";

const router = Router();

// Apply admin authentication to all inventory routes
router.use(adminAuth);

/**
 * GET /api/admin/inventory/summary
 * Overview KPIs (Stockout alerts, Fast movers, Overstocked, Dead stock, Restock queue)
 */
router.get(
  "/summary",
  allowRoles("SUPER_ADMIN", "CONTENT_MANAGER", "ORDER_MANAGER"),
  async (req, res) => {
    try {
      const leadTimeDays = parseInt(req.query.leadTimeDays) || 7;
      const summary = await getInventorySummary(leadTimeDays);
      res.json(summary);
    } catch (err) {
      console.error("[Inventory Route] Summary error:", err);
      res.status(500).json({ error: err.message || "Failed to load inventory summary" });
    }
  }
);

/**
 * GET /api/admin/inventory/analytics
 * Paginated inventory health and demand forecasting table
 */
router.get(
  "/analytics",
  allowRoles("SUPER_ADMIN", "CONTENT_MANAGER", "ORDER_MANAGER"),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        category = "all",
        status = "all",
        sortBy = "stockout_urgency",
        leadTimeDays = 7,
      } = req.query;

      const data = await getInventoryAnalytics({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        category,
        status,
        sortBy,
        leadTimeDays: parseInt(leadTimeDays),
      });

      res.json(data);
    } catch (err) {
      console.error("[Inventory Route] Analytics error:", err);
      res.status(500).json({ error: err.message || "Failed to load inventory analytics" });
    }
  }
);

/**
 * GET /api/admin/inventory/export-restock
 * Generates and downloads Restock Recommendations as a CSV sheet
 */
router.get(
  "/export-restock",
  allowRoles("SUPER_ADMIN", "CONTENT_MANAGER", "ORDER_MANAGER"),
  async (req, res) => {
    try {
      const leadTimeDays = parseInt(req.query.leadTimeDays) || 7;
      const csv = await exportRestockCSV(leadTimeDays);

      await logAdminAction(req, "EXPORT_RESTOCK_CSV", null, { leadTimeDays });

      const dateStr = new Date().toISOString().split("T")[0];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="bazzarbd_restock_recommendations_${dateStr}.csv"`
      );
      res.send(csv);
    } catch (err) {
      console.error("[Inventory Route] Export CSV error:", err);
      res.status(500).json({ error: err.message || "Failed to export restock sheet" });
    }
  }
);

/**
 * PUT /api/admin/inventory/stock-adjust
 * Quick inline stock modification for a product variant
 */
router.put(
  "/stock-adjust",
  allowRoles("SUPER_ADMIN", "CONTENT_MANAGER"),
  async (req, res) => {
    try {
      const { productId, variantId, newStock } = req.body;
      if (!productId || !variantId || newStock === undefined) {
        return res.status(400).json({
          error: "productId, variantId, and newStock are required fields.",
        });
      }

      const result = await adjustVariantStock(productId, variantId, newStock);

      await logAdminAction(req, "ADJUST_VARIANT_STOCK", productId, {
        variantId,
        newStock,
      });

      res.json(result);
    } catch (err) {
      console.error("[Inventory Route] Stock adjust error:", err);
      res.status(400).json({ error: err.message || "Failed to adjust stock" });
    }
  }
);

/**
 * POST /api/admin/inventory/ai-forecast
 * Phase 2: Generates strategic AI demand forecasting insights via Google Gemini
 */
router.post(
  "/ai-forecast",
  allowRoles("SUPER_ADMIN", "CONTENT_MANAGER", "ORDER_MANAGER"),
  async (req, res) => {
    try {
      const forecast = await generateAiInventoryForecast();
      await logAdminAction(req, "GENERATE_AI_INVENTORY_FORECAST");
      res.json(forecast);
    } catch (err) {
      console.error("[Inventory Route] AI Forecast error:", err);
      res.status(500).json({ error: err.message || "Failed to generate AI demand forecast" });
    }
  }
);

export default router;
