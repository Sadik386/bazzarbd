import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Unicode-compliant fonts (supporting Bengali and symbols like ৳)
const FONT_REGULAR = path.join(__dirname, "..", "fonts", "vrinda.ttf");
const FONT_BOLD = path.join(__dirname, "..", "fonts", "vrindab.ttf");

/**
 * Generates an invoice PDF for a given order and returns it as a Buffer.
 * @param {Object} order - The order document
 * @returns {Promise<Buffer>}
 */
export const generateInvoicePDF = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Register Unicode fonts
      doc.registerFont("Primary", FONT_REGULAR);
      doc.registerFont("Primary-Bold", FONT_BOLD);

      const orderRef = order._id.toString().slice(0, 8).toUpperCase();
      const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric"
      });

      // ── Brand Header ──
      doc.fontSize(28).font("Primary-Bold").text("THELAGARI", 50, 50);
      doc.fontSize(9).font("Primary").fillColor("#888888")
        .text("Premium Fashion & Lifestyle", 50, 82);

      // Accent line
      doc.moveTo(50, 100).lineTo(545, 100).strokeColor("#D4A574").lineWidth(2).stroke();

      // ── Invoice Title + Order Info ──
      doc.fillColor("#333333").fontSize(20).font("Primary-Bold")
        .text("INVOICE", 50, 120);

      doc.fontSize(9).font("Primary").fillColor("#666666");
      doc.text(`Invoice No: INV-${orderRef}`, 380, 120);
      doc.text(`Date: ${orderDate}`, 380, 135);
      doc.text(`Order ID: #${orderRef}`, 380, 150);
      const displayStatus = order.status.toLowerCase() === "pending" ? "placed" : order.status;
      doc.text(`Status: ${displayStatus.toUpperCase()}`, 380, 165);
      if (order.payment_method) {
        const pMethod = order.payment_method === "cash_on_delivery" ? "Cash on Delivery" : "Online Payment";
        doc.text(`Payment: ${pMethod}`, 380, 180);
      }

      // ── Shipping Address ──
      const addr = order.shipping_address;
      if (addr) {
        doc.fillColor("#333333").fontSize(10).font("Primary-Bold")
          .text("Ship To:", 50, 150);
        doc.fontSize(9).font("Primary").fillColor("#555555");
        doc.text(`${addr.firstName || ""} ${addr.lastName || ""}`, 50, 165);
        doc.text(`${addr.address || ""}`, 50, 178);
        doc.text(`${addr.city || ""} ${addr.postalCode || ""}`, 50, 191);
        doc.text(`${addr.country || ""}`, 50, 204);
      }

      if (order.guest_email) {
        doc.text(`Email: ${order.guest_email}`, 50, 217);
      }
      if (order.phone_number) {
        doc.text(`Phone: ${order.phone_number}`, 50, addr ? 230 : 217);
      }

      // ── Items Table ──
      const tableTop = 260;

      // Table header background
      doc.rect(50, tableTop - 5, 495, 22).fill("#F5F0EB");
      doc.fillColor("#333333").fontSize(8).font("Primary-Bold");
      doc.text("ITEM", 55, tableTop);
      doc.text("VARIANT", 260, tableTop);
      doc.text("QTY", 350, tableTop, { width: 40, align: "center" });
      doc.text("UNIT PRICE", 400, tableTop, { width: 70, align: "right" });
      doc.text("TOTAL", 475, tableTop, { width: 65, align: "right" });

      // Table rows
      let y = tableTop + 25;
      doc.font("Primary").fontSize(9).fillColor("#444444");

      order.order_items.forEach((item, index) => {
        const lineTotal = (item.unit_price || 0) * (item.quantity || 1);

        // Alternate row background
        if (index % 2 === 0) {
          doc.rect(50, y - 4, 495, 20).fill("#FAFAFA");
          doc.fillColor("#444444");
        }

        doc.text(item.product_name || "Product", 55, y, { width: 200 });
        doc.text(item.variant_name || "Standard", 260, y, { width: 85 });
        doc.text(String(item.quantity || 1), 350, y, { width: 40, align: "center" });
        doc.text(`৳${(item.unit_price || 0).toFixed(2)}`, 400, y, { width: 70, align: "right" });
        doc.text(`৳${lineTotal.toFixed(2)}`, 475, y, { width: 65, align: "right" });
        y += 22;
      });

      // ── Totals ──
      y += 10;
      doc.moveTo(350, y).lineTo(545, y).strokeColor("#DDDDDD").lineWidth(0.5).stroke();
      y += 12;

      doc.font("Primary").fontSize(9).fillColor("#666666");
      doc.text("Subtotal:", 380, y);
      const subtotal = order.order_items.reduce((acc, item) => acc + (item.unit_price || 0) * (item.quantity || 1), 0);
      doc.text(`৳${subtotal.toFixed(2)}`, 475, y, { width: 65, align: "right" });
      y += 18;

      if (order.discount_amount > 0) {
        doc.fillColor("#D4A574");
        doc.text("Discount:", 380, y);
        doc.text(`-৳${order.discount_amount.toFixed(2)}`, 475, y, { width: 65, align: "right" });
        y += 18;
        if (order.coupon_code) {
          doc.fontSize(7).fillColor("#999999");
          doc.text(`(Coupon: ${order.coupon_code})`, 380, y);
          y += 14;
        }
      }

      doc.fillColor("#666666");
      doc.text("Shipping:", 380, y);
      if (order.shipping_cost > 0) {
        doc.text(`৳${order.shipping_cost.toFixed(2)}`, 475, y, { width: 65, align: "right" });
      } else {
        doc.text("FREE", 475, y, { width: 65, align: "right" });
      }
      y += 20;

      // Grand total box
      doc.rect(370, y - 5, 175, 28).fill("#1A1A1A");
      doc.fillColor("#FFFFFF").fontSize(11).font("Primary-Bold");
      doc.text("TOTAL:", 380, y);
      doc.text(`৳${order.total_amount.toFixed(2)}`, 475, y, { width: 65, align: "right" });

      // ── Footer ──
      const footerY = 720;
      doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor("#EEEEEE").lineWidth(0.5).stroke();
      doc.fillColor("#AAAAAA").fontSize(8).font("Primary");
      doc.text("Thank you for shopping with ঠেলাগাড়ী!", 50, footerY + 10, { align: "center", width: 495 });
      doc.text("For support, contact us at support@thelagari.com", 50, footerY + 22, { align: "center", width: 495 });
      doc.text(`Generated on ${new Date().toLocaleString("en-US")}`, 50, footerY + 34, { align: "center", width: 495 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
