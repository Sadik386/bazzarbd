import { Router } from "express";
import Coupon from "../models/Coupon.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

// Validate a coupon (Public)
router.post("/validate", async (req, res) => {
  try {
    const { code, amount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), is_active: true });

    if (!coupon) {
      return res.status(404).json({ error: "Invalid or inactive coupon code" });
    }

    if (new Date() > coupon.expiry_date) {
      return res.status(400).json({ error: "Coupon has expired" });
    }

    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ error: "Coupon usage limit reached" });
    }

    if (amount < coupon.min_purchase) {
      return res.status(400).json({ error: `Minimum purchase of ৳${coupon.min_purchase} required` });
    }

    let discount = 0;
    if (coupon.discount_type === "percentage") {
      discount = (amount * coupon.discount_value) / 100;
    } else {
      discount = coupon.discount_value;
    }

    res.json({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: Math.min(discount, amount)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Routes
router.get("/", adminAuth, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", adminAuth, async (req, res) => {
  try {
    const coupon = new Coupon(req.body);
    await coupon.save();
    res.status(201).json(coupon);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", adminAuth, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: "Coupon deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
