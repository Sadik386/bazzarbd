import { Router } from "express";
import Cart from "../models/Cart.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/cart — Fetch the logged-in user's cart
router.get("/", requireAuth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user_id: req.user.id });
    res.json({ items: cart?.items || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cart — Replace the user's entire cart (sync from client)
router.put("/", requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items must be an array" });
    }

    // Validate and sanitize items
    const sanitized = items.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: Math.max(1, parseInt(item.quantity) || 1),
      product_name: String(item.product_name || "").slice(0, 200),
      variant_name: String(item.variant_name || "").slice(0, 100),
      base_price: Number(item.base_price) || 0,
      price_modifier: Number(item.price_modifier) || 0,
      product_image: String(item.product_image || "").slice(0, 500),
      slug: String(item.slug || "").slice(0, 200),
    }));

    const cart = await Cart.findOneAndUpdate(
      { user_id: req.user.id },
      { $set: { items: sanitized } },
      { upsert: true, new: true }
    );

    res.json({ items: cart.items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cart — Clear the user's cart
router.delete("/", requireAuth, async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { user_id: req.user.id },
      { $set: { items: [] } }
    );
    res.json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
