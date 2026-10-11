import { Router } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Visit from "../models/Visit.js";
import SizeChart from "../models/SizeChart.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { allowRoles } from "../middleware/rbac.js";
import { logAdminAction } from "../utils/auditLogger.js";
import { convertToCSV } from "../utils/csvExporter.js";

import { sendOrderNotification } from "../utils/notifications.js";
import { createSteadfastOrder } from "../utils/steadfast.js";
import { 
  createPathaoOrder, 
  getPathaoStores 
} from "../utils/pathao.js";

const router = Router();

// Apply adminAuth to all routes in this file
router.use(adminAuth);

// Get Statistics/Analytics
router.get("/stats", async (req, res) => {
  try {
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments({ email: { $nin: adminEmails } });
    const totalProducts = await Product.countDocuments();
    
    // Calculate total revenue
    const revenueResult = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total_amount" } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Last 30 days revenue (simplified)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRevenueResult = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total_amount" } } }
    ]);
    const recentRevenue = recentRevenueResult[0]?.total || 0;

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Low stock alerts
    const lowStockProducts = await Product.find({
      "product_variants.stock_level": { $lte: 5 }
    }).limit(5);

    // Count today's unique visitors
    const today = new Date().toISOString().split("T")[0];
    const todayVisitors = await Visit.countDocuments({ date: today });

    res.json({
      totals: {
        orders: totalOrders,
        users: totalUsers,
        products: totalProducts,
        revenue: totalRevenue,
        recentRevenue: recentRevenue,
        todayVisitors: todayVisitors
      },
      ordersByStatus,
      lowStockProducts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Order Management
router.get("/orders", allowRoles("SUPER_ADMIN", "ORDER_MANAGER", "SUPPORT_AGENT"), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", status = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      // Strip "INV-" prefix for invoice searches
      const cleanTerm = term.replace(/^inv-?/i, "");
      const conditions = [
        { phone_number: { $regex: term, $options: "i" } },
        { guest_email: { $regex: term, $options: "i" } },
        { tracking_id: { $regex: term, $options: "i" } },
        { "shipping_address.full_name": { $regex: term, $options: "i" } },
        { "shipping_address.name": { $regex: term, $options: "i" } },
      ];
      // Search by user email — find matching user IDs first
      const matchingUsers = await User.find({ email: { $regex: term, $options: "i" } }).select("_id").lean();
      if (matchingUsers.length > 0) {
        conditions.push({ user_id: { $in: matchingUsers.map(u => u._id) } });
      }
      // Try matching by full or partial ObjectId
      if (cleanTerm.match(/^[0-9a-fA-F]{24}$/)) {
        conditions.push({ _id: new mongoose.Types.ObjectId(cleanTerm) });
      } else if (cleanTerm.match(/^[0-9a-fA-F]{4,23}$/)) {
        // Partial ID match — find orders whose _id string contains the partial
        const allIds = await Order.find({}, "_id").lean();
        const matchedIds = allIds
          .filter(o => o._id.toString().toLowerCase().includes(cleanTerm.toLowerCase()))
          .map(o => o._id);
        if (matchedIds.length > 0) {
          conditions.push({ _id: { $in: matchedIds } });
        }
      }
      filter = { $or: conditions };
    }

    const totalOrders = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate("user_id", "display_name email")
      .populate("order_items.product_id", "product_images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      orders,
      pagination: {
        total: totalOrders,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalOrders / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/orders/:id", allowRoles("SUPER_ADMIN", "ORDER_MANAGER"), async (req, res) => {
  try {
    const { status, tracking_id, courier_name } = req.body;
    const oldOrder = await Order.findById(req.params.id);
    if (!oldOrder) return res.status(404).json({ error: "Order not found" });

    // Handle stock changes based on status transitions
    if (status && status === "cancelled" && oldOrder.status !== "cancelled") {
      // Restore stock level for each item in the order
      for (const item of oldOrder.order_items) {
        try {
          const variantObjectId = mongoose.Types.ObjectId.isValid(item.variant_id)
            ? new mongoose.Types.ObjectId(item.variant_id)
            : item.variant_id;
          await Product.updateOne(
            { 
              _id: item.product_id, 
              product_variants: {
                $elemMatch: { _id: variantObjectId }
              }
            },
            { $inc: { "product_variants.$.stock_level": item.quantity } }
          );
        } catch (stockErr) {
          console.error(`Failed to restore stock for product ${item.product_id}, variant ${item.variant_id}:`, stockErr);
        }
      }
    } else if (status && oldOrder.status === "cancelled" && status !== "cancelled") {
      // Subtract stock level since the order is being un-cancelled
      for (const item of oldOrder.order_items) {
        try {
          const variantObjectId = mongoose.Types.ObjectId.isValid(item.variant_id)
            ? new mongoose.Types.ObjectId(item.variant_id)
            : item.variant_id;
          await Product.updateOne(
            { 
              _id: item.product_id, 
              product_variants: {
                $elemMatch: { _id: variantObjectId }
              }
            },
            { $inc: { "product_variants.$.stock_level": -item.quantity } }
          );
        } catch (stockErr) {
          console.error(`Failed to subtract stock for product ${item.product_id}, variant ${item.variant_id}:`, stockErr);
        }
      }
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id, 
      { status, tracking_id, courier_name }, 
      { new: true }
    );

    // Log the action
    await logAdminAction(req, 'UPDATE_ORDER_STATUS', order._id, { 
      oldStatus: oldOrder.status, 
      newStatus: status,
      tracking_id 
    });

    // Send notification if status changed or tracking added
    if (status !== oldOrder.status || (tracking_id && !oldOrder.tracking_id)) {
      sendOrderNotification(order, 'email').catch(console.error);
      if (status === 'shipped' || status === 'delivered') {
        sendOrderNotification(order, 'sms').catch(console.error);
      }
    }

    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Customer Management
router.get("/users", allowRoles("SUPER_ADMIN"), async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = "top_spenders" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    const totalUsers = await User.countDocuments({ email: { $nin: adminEmails } });

    // Determine sort stage based on query parameter
    const sortStages = {
      top_spenders: { totalSpent: -1, createdAt: -1 },
      most_orders: { orderCount: -1, createdAt: -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name_az: { display_name: 1 },
      name_za: { display_name: -1 },
    };
    const sortStage = sortStages[sort] || sortStages.top_spenders;

    // Aggregate users with their order stats
    const usersWithStats = await User.aggregate([
      { $match: { email: { $nin: adminEmails } } },
      // Left join with orders collection
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "user_id",
          as: "orders"
        }
      },
      // Calculate order count and total spent (excluding cancelled orders)
      {
        $addFields: {
          orderCount: { $size: "$orders" },
          totalSpent: {
            $sum: {
              $map: {
                input: { $filter: { input: "$orders", cond: { $ne: ["$$this.status", "cancelled"] } } },
                in: "$$this.total_amount"
              }
            }
          }
        }
      },
      // Remove the full orders array from the output
      { $project: { orders: 0, password: 0 } },
      { $sort: sortStage },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      users: usersWithStats,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalUsers / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lookup orders by phone number
router.get("/orders/lookup/:phone", async (req, res) => {
  try {
    const { phone } = req.params;
    const orders = await Order.find({ phone_number: phone })
      .populate("order_items.product_id", "product_images")
      .sort({ createdAt: -1 });
    
    const successfulCount = orders.filter(o => 
      ["confirmed", "processing", "shipped", "delivered"].includes(o.status)
    ).length;

    res.json({
      phone,
      totalOrders: orders.length,
      successfulOrders: successfulCount,
      orders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Exports
router.get("/export/orders", allowRoles("SUPER_ADMIN"), async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    const fields = [
      "_id", "status", "total_amount", "payment_method", 
      "shipping_address.firstName", "shipping_address.lastName", 
      "shipping_address.address", "shipping_address.city", 
      "phone_number", "guest_email", "createdAt"
    ];
    
    await logAdminAction(req, 'EXPORT_ORDERS_CSV');
    const csv = convertToCSV(orders, fields);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/export/users", allowRoles("SUPER_ADMIN"), async (req, res) => {
  try {
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    const users = await User.find({ email: { $nin: adminEmails } }).sort({ createdAt: -1 });
    const fields = ["_id", "display_name", "email", "phone_number", "createdAt"];
    
    await logAdminAction(req, 'EXPORT_USERS_CSV');
    const csv = convertToCSV(users, fields);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=users.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/export/products", allowRoles("SUPER_ADMIN"), async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    const fields = ["_id", "name", "slug", "base_price", "is_featured", "createdAt"];
    
    await logAdminAction(req, 'EXPORT_PRODUCTS_CSV');
    const csv = convertToCSV(products, fields);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Courier Management: Pathao Locations Metadata

router.get("/pathao/stores", async (req, res) => {
  try {
    const stores = await getPathaoStores();
    res.json(stores);
  } catch (err) {
    console.warn("[Pathao] Stores unavailable:", err.message);
    res.json([]); // Return empty array — credentials may not be configured
  }
});

// Courier Management: Dispatch Order via Steadfast
router.post("/orders/:id/ship-steadfast", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const addressDetails = order.shipping_address;
    const recipient_name = addressDetails.full_name || `${addressDetails.firstName || ""} ${addressDetails.lastName || ""}`.trim();
    const recipient_address = `${addressDetails.address}, ${addressDetails.city}`;

    const auto_cod = order.payment_method === "cash_on_delivery" ? Math.round(order.total_amount) : 0;
    const { note, cod_amount: cod_override } = req.body;
    const cod_amount = (cod_override !== undefined && cod_override !== null) ? Math.round(Number(cod_override)) : auto_cod;

    let recipient_phone = (order.phone_number || "").replace(/\D/g, "");
    if (recipient_phone.startsWith("8801")) {
      recipient_phone = recipient_phone.slice(2);
    }

    const courierResult = await createSteadfastOrder({
      invoice: order._id.toString(),
      recipient_name,
      recipient_phone,
      recipient_address,
      cod_amount,
      note: note || `The Lagari - Order ${order._id.toString().slice(-6).toUpperCase()}`
    });

    if (courierResult.success) {
      const trackingCode = courierResult.consignment_id || courierResult.tracking_code;
      order.status = "shipped";
      order.courier_name = "Steadfast";
      order.tracking_id = trackingCode;
      await order.save();

      // Log the action
      await logAdminAction(req, 'SHIP_ORDER_STEADFAST', order._id, { 
        tracking_id: trackingCode 
      });

      // Trigger automatic shipment notifications
      sendOrderNotification(order, "email").catch(console.error);
      sendOrderNotification(order, "sms").catch(console.error);

      res.json({
        success: true,
        message: "Order successfully sent to Steadfast Courier!",
        order
      });
    } else {
      res.status(400).json({ error: "Failed to place Steadfast order" });
    }
  } catch (err) {
    console.error("Steadfast shipping error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Courier Management: Dispatch Order via Pathao
router.post("/orders/:id/ship-pathao", async (req, res) => {
  try {
    const { 
      store_id, 
      item_weight = 0.5, 
      item_quantity = 1,
      delivery_type = 48,
      special_instruction = "Handle with care"
    } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const addressDetails = order.shipping_address;
    const recipient_name = addressDetails.full_name || `${addressDetails.firstName || ""} ${addressDetails.lastName || ""}`.trim();
    const recipient_address = `${addressDetails.address}, ${addressDetails.city}`;

    const auto_cod = order.payment_method === "cash_on_delivery" ? Math.round(order.total_amount) : 0;
    const cod_amount = (req.body.cod_amount !== undefined && req.body.cod_amount !== null) ? Math.round(Number(req.body.cod_amount)) : auto_cod;

    let recipient_phone = (order.phone_number || "").replace(/\D/g, "");
    if (recipient_phone.startsWith("8801")) {
      recipient_phone = recipient_phone.slice(2);
    }

    const item_description = order.items && order.items.length > 0 
      ? order.items.map(item => `${item.name} (x${item.quantity})`).join(", ") 
      : "Lumina Commerce Products";

    const courierResult = await createPathaoOrder({
      store_id,
      merchant_order_id: `INV-${order._id.toString().slice(0, 8).toUpperCase()}`,
      recipient_name,
      recipient_phone,
      recipient_address,
      delivery_type,
      item_type: 2, // Parcel
      special_instruction,
      item_quantity,
      item_weight,
      amount_to_collect: cod_amount,
      item_description: item_description.slice(0, 200)
    });

    if (courierResult.success) {
      order.status = "shipped";
      order.courier_name = "Pathao";
      order.tracking_id = courierResult.tracking_code;
      await order.save();

      // Log the action
      await logAdminAction(req, 'SHIP_ORDER_PATHAO', order._id, { 
        tracking_id: courierResult.tracking_code 
      });

      // Trigger automatic shipment notifications
      sendOrderNotification(order, "email").catch(console.error);
      sendOrderNotification(order, "sms").catch(console.error);

      res.json({
        success: true,
        message: "Order successfully sent to Pathao Courier!",
        order
      });
    } else {
      res.status(400).json({ error: "Failed to place Pathao order" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SIZE CHART MANAGEMENT =====

// List all size charts
router.get("/size-charts", async (req, res) => {
  try {
    const charts = await SizeChart.find().sort({ name: 1 });
    res.json(charts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new size chart
router.post("/size-charts", allowRoles("SUPER_ADMIN", "CONTENT_MANAGER"), async (req, res) => {
  try {
    const { name, columns, rows, deviation_note } = req.body;
    const chart = await SizeChart.create({ name, columns, rows, deviation_note });
    res.status(201).json(chart);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: `A size chart named "${req.body.name}" already exists` });
    }
    res.status(400).json({ error: err.message });
  }
});

// Update a size chart
router.put("/size-charts/:id", allowRoles("SUPER_ADMIN", "CONTENT_MANAGER"), async (req, res) => {
  try {
    const { name, columns, rows, deviation_note } = req.body;
    const chart = await SizeChart.findByIdAndUpdate(
      req.params.id,
      { name, columns, rows, deviation_note },
      { new: true, runValidators: true }
    );
    if (!chart) return res.status(404).json({ error: "Size chart not found" });
    res.json(chart);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: `A size chart named "${req.body.name}" already exists` });
    }
    res.status(400).json({ error: err.message });
  }
});

// Delete a size chart
router.delete("/size-charts/:id", allowRoles("SUPER_ADMIN"), async (req, res) => {
  try {
    // Unlink from any products that reference this chart
    await Product.updateMany({ size_chart_id: req.params.id }, { $set: { size_chart_id: null } });
    await SizeChart.findByIdAndDelete(req.params.id);
    res.json({ message: "Size chart deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
