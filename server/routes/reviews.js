import { Router } from "express";
import Review from "../models/Review.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

// Get reviews for a product (Public)
router.get("/product/:productId", async (req, res) => {
  try {
    const { page = 1, limit = 5 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { 
      product_id: req.params.productId,
      is_moderated: true 
    };

    const totalReviews = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      reviews,
      pagination: {
        total: totalReviews,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalReviews / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

import Order from "../models/Order.js";

// Post a review (Authenticated)
router.post("/", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Login required to post a review" });
    
    // Check if user has purchased this product
    const hasPurchased = await Order.findOne({
      user_id: req.user.id,
      "order_items.product_id": req.body.product_id,
      status: "delivered" // Only allow reviews for delivered items
    });

    const review = new Review({
      ...req.body,
      user_id: req.user.id,
      user_name: req.user.display_name || req.user.email.split("@")[0],
      is_verified_purchase: !!hasPurchased
    });
    
    await review.save();
    res.status(201).json({ message: "Review submitted for moderation", review });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Routes
router.get("/pending", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const totalPending = await Review.countDocuments({ is_moderated: false });
    const reviews = await Review.find({ is_moderated: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      reviews,
      pagination: {
        total: totalPending,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalPending / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/moderate", adminAuth, async (req, res) => {
  try {
    const { is_moderated } = req.body;
    const review = await Review.findByIdAndUpdate(req.params.id, { is_moderated }, { new: true });
    res.json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", adminAuth, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
