import { Router } from "express";
import Order from "../models/Order.js";
import { generateInvoicePDF } from "../utils/invoiceGenerator.js";

const router = Router();

// GET /api/invoices/:orderId — Download invoice PDF
router.get("/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Security: only the order owner or admin can download
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    const isAdmin = req.user && adminEmails.includes(req.user.email);

    if (!isAdmin && order.user_id && order.user_id.toString() !== req.user?.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Only allow invoice download for active/valid order statuses
    const allowedStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!allowedStatuses.includes(order.status)) {
      return res.status(400).json({ error: "Invoice is not available for this order status" });
    }

    const orderRef = order._id.toString().slice(0, 8).toUpperCase();
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${orderRef}.pdf`);

    // Generate and send PDF buffer
    const pdfBuffer = await generateInvoicePDF(order);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Invoice generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  }
});

export default router;
