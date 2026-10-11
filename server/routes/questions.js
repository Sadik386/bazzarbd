import { Router } from "express";
import Question from "../models/Question.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

// Get answered questions for a product (Public)
router.get("/product/:productId", async (req, res) => {
  try {
    const questions = await Question.find({ 
      product_id: req.params.productId,
      is_moderated: true,
      is_answered: true
    }).sort({ createdAt: -1 });
    
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post a question (Authenticated)
router.post("/", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Login required to ask a question" });
    
    const question = new Question({
      ...req.body,
      user_id: req.user.id,
      user_name: req.user.display_name || req.user.email.split("@")[0]
    });
    
    await question.save();
    res.status(201).json({ message: "Question submitted for moderation", question });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Routes
router.get("/pending", adminAuth, async (req, res) => {
  try {
    const questions = await Question.find({ is_moderated: false })
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/answer", adminAuth, async (req, res) => {
  try {
    const { answer } = req.body;
    const question = await Question.findByIdAndUpdate(
      req.params.id, 
      { answer, is_answered: true, is_moderated: true }, 
      { new: true }
    );
    res.json(question);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
