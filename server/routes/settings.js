import { Router } from "express";
import Settings from "../models/Settings.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { allowRoles } from "../middleware/rbac.js";
import { logAdminAction } from "../utils/auditLogger.js";

const router = Router();

// Get settings by key (Public)
router.get("/:key", async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key }).lean();
    res.json(setting ? setting.value : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Routes
router.post("/", adminAuth, allowRoles("SUPER_ADMIN"), async (req, res) => {
  try {
    const { key, value } = req.body;
    const setting = await Settings.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true }
    );
    
    await logAdminAction(req, 'UPDATE_SETTING', key, { value });
    res.json(setting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
