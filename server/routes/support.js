import express from "express";
import { sendContactEmail } from "../utils/notifications.js";
import { sendEmail } from "../utils/emailService.js";
import SupportTicket from "../models/SupportTicket.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { allowRoles } from "../middleware/rbac.js";

const router = express.Router();

// @desc    Send contact form message & save as ticket
// @route   POST /api/support/contact
// @access  Public
router.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please provide name, email, and message." });
  }

  try {
    // Save to database as a support ticket
    const ticket = await SupportTicket.create({ name, email, subject, message });

    // Also send email notification to admin
    const result = await sendContactEmail({ name, email, subject, message });
    
    if (result.success) {
      res.status(200).json({ message: "Your message has been sent successfully!", ticketId: ticket._id });
    } else {
      res.status(500).json({ error: "Failed to send message. Please try again later." });
    }
  } catch (error) {
    console.error("Support route error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @desc    Get all support tickets
// @route   GET /api/support/tickets
// @access  Admin
router.get("/tickets", adminAuth, allowRoles("SUPER_ADMIN", "SUPPORT_AGENT"), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await SupportTicket.countDocuments(filter);
    const tickets = await SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      tickets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Fetch tickets error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @desc    Reply to a support ticket & send email to customer
// @route   POST /api/support/tickets/:id/reply
// @access  Admin
router.post("/tickets/:id/reply", adminAuth, allowRoles("SUPER_ADMIN", "SUPPORT_AGENT"), async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Reply message is required." });

  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found." });

    // Add reply to ticket
    ticket.replies.push({ message, repliedBy: req.user?.display_name || req.user?.email || "Admin" });
    ticket.status = "replied";
    await ticket.save();

    // Send reply email to customer
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; padding: 0; border-radius: 16px; background: #fff; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: #000; color: #fff; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">ঠেলাগাড়ী</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.7; font-size: 14px;">Customer Support</p>
        </div>
        
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 16px;">Hello ${ticket.name},</p>
          <p style="color: #666; line-height: 1.6;">Thank you for contacting us. Here is our response to your inquiry:</p>
          
          <div style="background: #f0f7ff; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Your Message</p>
            <p style="color: #555; margin: 0; white-space: pre-wrap;">${ticket.message}</p>
          </div>

          <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Our Reply</p>
            <p style="color: #333; margin: 0; white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>

          <p style="color: #666; line-height: 1.6;">If you have any further questions, feel free to reply to this email.</p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0;">
            <p style="color: #888; font-size: 14px;">Thank you for choosing ঠেলাগাড়ী!</p>
          </div>
        </div>
        
        <div style="background: #fafafa; padding: 20px; text-align: center; font-size: 12px; color: #aaa;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} ঠেলাগাড়ী. All rights reserved.</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: ticket.email,
      subject: `Re: ${ticket.subject || 'Your Support Request'} - ঠেলাগাড়ী`,
      html,
      replyTo: process.env.SMTP_USER
    });

    res.json({ message: "Reply sent successfully!", ticket });
  } catch (error) {
    console.error("Reply ticket error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @desc    Update ticket status
// @route   PUT /api/support/tickets/:id/status
// @access  Admin
router.put("/tickets/:id/status", adminAuth, allowRoles("SUPER_ADMIN", "SUPPORT_AGENT"), async (req, res) => {
  const { status } = req.body;
  if (!["open", "replied", "closed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  try {
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ticket) return res.status(404).json({ error: "Ticket not found." });
    res.json(ticket);
  } catch (error) {
    console.error("Update ticket status error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @desc    Delete a support ticket
// @route   DELETE /api/support/tickets/:id
// @access  Admin
router.delete("/tickets/:id", adminAuth, allowRoles("SUPER_ADMIN"), async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found." });
    res.json({ message: "Ticket deleted successfully." });
  } catch (error) {
    console.error("Delete ticket error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
