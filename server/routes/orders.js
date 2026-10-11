import { Router } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { requireAuth } from "../middleware/auth.js";
import { sendOrderNotification } from "../utils/notifications.js";

const router = Router();

// Helper to sanitize phone numbers for robust matching
const sanitizePhone = (phone) => {
  if (!phone) return "";
  let clean = phone.replace(/[\s\-\(\)\+]/g, "");
  if (clean.startsWith("880")) {
    clean = "0" + clean.slice(3);
  }
  return clean;
};

// PUBLIC ORDER TRACKING ENDPOINT
router.post("/track", async (req, res) => {
  try {
    const { orderId, contact } = req.body;
    if (!orderId || !contact) {
      return res.status(400).json({ error: "Order ID and Email/Phone Number are required" });
    }

    let cleanOrderId = orderId.trim();
    if (cleanOrderId.startsWith("#")) {
      cleanOrderId = cleanOrderId.slice(1);
    }
    cleanOrderId = cleanOrderId.trim();

    let order = null;
    if (cleanOrderId.length === 6) {
      order = await Order.findOne({
        $expr: {
          $eq: [
            { $substrCP: [{ $toString: "$_id" }, 18, 6] },
            cleanOrderId.toLowerCase()
          ]
        }
      });
    } else if (cleanOrderId.length === 8) {
      order = await Order.findOne({
        $expr: {
          $eq: [
            { $substrCP: [{ $toString: "$_id" }, 16, 8] },
            cleanOrderId.toLowerCase()
          ]
        }
      });
    } else if (mongoose.Types.ObjectId.isValid(cleanOrderId)) {
      order = await Order.findById(cleanOrderId);
    } else {
      return res.status(400).json({ error: "Invalid Order ID format. Use the 6 or 8 character code, or the 24-character ID." });
    }

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const contactClean = contact.trim().toLowerCase();
    const contactPhoneClean = sanitizePhone(contact);

    const orderPhoneClean = sanitizePhone(order.phone_number);
    const guestEmailClean = order.guest_email?.trim().toLowerCase();
    
    let isMatch = false;

    if (orderPhoneClean && orderPhoneClean === contactPhoneClean) {
      isMatch = true;
    } else if (guestEmailClean && guestEmailClean === contactClean) {
      isMatch = true;
    } else if (order.user_id) {
      const User = mongoose.model("User");
      const user = await User.findById(order.user_id);
      if (user && user.email.toLowerCase() === contactClean) {
        isMatch = true;
      }
    }

    if (!isMatch) {
      return res.status(403).json({ error: "Incorrect Order ID or contact details combination" });
    }

    res.json({
      id: order._id,
      status: order.status,
      total_amount: order.total_amount,
      discount_amount: order.discount_amount || 0,
      shipping_cost: order.shipping_cost || 0,
      delivery_method: order.delivery_method || "Standard",
      shipping_address: order.shipping_address,
      phone_number: order.phone_number,
      payment_method: order.payment_method,
      courier_name: order.courier_name,
      tracking_id: order.tracking_id,
      created_at: order.createdAt,
      order_items: order.order_items.map((item) => ({
        id: item._id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_name: item.product_name,
        variant_name: item.variant_name,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { items, total_amount: client_total, shipping_address, guest_email, phone_number, coupon_code, discount_amount, shipping_cost, payment_method } = req.body;
    
    const session = await mongoose.startSession();
    let createdOrder = null;

    try {
      await session.withTransaction(async () => {
        let calculatedTotal = 0;
        const verifiedItems = [];

        for (const item of items) {
          if (!item.quantity || item.quantity <= 0) {
            throw new Error(`Invalid item quantity for product ${item.product_id}`);
          }

          // Atomic Decrement with Condition
          const result = await Product.updateOne(
            { 
              _id: item.product_id, 
              product_variants: { 
                $elemMatch: { 
                  _id: item.variant_id, 
                  stock_level: { $gte: item.quantity } 
                } 
              } 
            },
            { $inc: { "product_variants.$.stock_level": -item.quantity } },
            { session }
          );

          if (result.modifiedCount === 0) {
            throw new Error(`Insufficient stock or product ${item.product_id} not found`);
          }

          const product = await Product.findById(item.product_id).session(session);
          const variant = product.product_variants.id(item.variant_id);
          const unitPrice = product.base_price + (variant?.price_modifier || 0);
          
          calculatedTotal += unitPrice * item.quantity;
          verifiedItems.push({
            ...item,
            unit_price: unitPrice // Use server price
          });
        }

        // Apply discount and shipping
        const finalAmount = calculatedTotal - (discount_amount || 0) + (shipping_cost || 0);

        const initialStatus = req.body.status === "confirmed" ? "confirmed" : "pending";

        // Create Order inside transaction
        const [order] = await Order.create([{
          user_id: req.user?.id || null,
          guest_email: req.user ? null : guest_email,
          total_amount: finalAmount,
          shipping_address,
          phone_number,
          status: initialStatus,
          order_items: verifiedItems,
          coupon_code,
          discount_amount,
          shipping_cost: shipping_cost || 0,
          payment_method: payment_method || "cash_on_delivery"
        }], { session });

        createdOrder = order;
      });
    } finally {
      session.endSession();
    }

    if (!createdOrder) {
      throw new Error("Order creation failed inside transaction.");
    }

    // Send confirmation notification after transaction commits
    sendOrderNotification(createdOrder, 'email').catch(console.error);
    sendOrderNotification(createdOrder, 'sms').catch(console.error);

    res.status(201).json({ id: createdOrder._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/my-orders", requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const totalOrders = await Order.countDocuments({ user_id: req.user.id });
    const orders = await Order.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const mapped = orders.map((o) => ({
      id: o._id,
      status: o.status,
      total_amount: o.total_amount,
      created_at: o.createdAt,
      order_items: o.order_items.map((item) => ({
        id: item._id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        products: { name: item.product_name },
        product_variants: { variant_name: item.variant_name },
      })),
    }));

    res.json({
      orders: mapped,
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

router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // SECURITY: Ensure user owns the order or is an admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    const isAdmin = req.user && adminEmails.includes(req.user.email);
    
    if (!isAdmin && order.user_id && order.user_id.toString() !== req.user?.id) {
      return res.status(403).json({ error: "Unauthorized access to this order" });
    }

    // Guest check
    if (!order.user_id && !isAdmin) {
      // In a real app, you might use a signed URL or session cookie for guest order lookup
      // For now, we'll allow access by ID for guests, but restricted
    }

    res.json({
      id: order._id,
      status: order.status,
      total_amount: order.total_amount,
      shipping_address: order.shipping_address,
      guest_email: order.guest_email,
      created_at: order.createdAt,
      order_items: order.order_items.map((item) => ({
        id: item._id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        products: { name: item.product_name, slug: "" },
        product_variants: { variant_name: item.variant_name },
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
