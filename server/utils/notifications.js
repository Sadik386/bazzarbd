import axios from 'axios';
import { generateInvoicePDF } from './invoiceGenerator.js';
import Settings from '../models/Settings.js';
import { sendEmail } from './emailService.js';
import mongoose from 'mongoose';

/**
 * Sends SMS notification using a generic API
 */
const sendSMS = async (to, message) => {
  const apiUrl = process.env.SMS_API_URL;
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID;

  // Normalize phone number (ensure it starts with 88 for BD)
  let phone = to.replace(/[^0-9]/g, '');
  if (phone.startsWith('01')) phone = '88' + phone;

  if (apiUrl && apiKey) {
    try {
      await axios.post(apiUrl, {
        api_key: apiKey,
        senderid: senderId,
        number: phone,
        message: message,
      });
      console.log(`[SMS] Message sent to ${phone}`);
      return true;
    } catch (error) {
      console.error(`[SMS] Failed to send message to ${phone}:`, error.message);
      return false;
    }
  } else {
    console.log(`[SMS-MOCK] API not configured. To: ${phone}, Message: "${message}"`);
    return true;
  }
};

/**
 * Sends a contact form email to the admin
 */
export const sendContactEmail = async ({ name, email, subject: userSubject, message }) => {
  const adminEmails = process.env.ADMIN_EMAILS || process.env.SMTP_USER;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px; background: #fff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #000; margin: 0;">ঠেলাগাড়ী Support</h2>
        <p style="color: #666; font-size: 14px;">New Message from Customer</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #000;">
        <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${userSubject || 'No Subject'}</p>
        <hr style="border: 0; border-top: 1px solid #ddd; margin: 15px 0;" />
        <p style="white-space: pre-wrap; color: #333; line-height: 1.6;">${message}</p>
      </div>
      
      <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
        This message was sent via the ঠেলাগাড়ী Contact Form.
      </p>
    </div>
  `;

  return sendEmail({
    to: adminEmails,
    subject: `Support: ${userSubject || 'New Message'} from ${name}`,
    html,
    replyTo: email
  });
};

/**
 * Sends order notification via email and SMS
 */
export const sendOrderNotification = async (order, type = 'both') => {
  const { _id, total_amount, shipping_address, phone_number, status, order_items } = order;
  const orderId = _id.toString().slice(-8).toUpperCase();
  let customerEmail = shipping_address?.email || order.guest_email;

  if (!customerEmail && order.user_id) {
    try {
      const User = mongoose.model("User");
      const user = await User.findById(order.user_id).lean();
      if (user) {
        customerEmail = user.email;
      }
    } catch (e) {
      console.error("[NOTIFICATION] Failed to fetch user email for notification:", e);
    }
  }
  
  // 1. Prepare and Send Email
  if (type === 'email' || type === 'both') {
    if (customerEmail) {
      const subtotal = order_items.reduce((acc, item) => acc + (item.unit_price || 0) * (item.quantity || 1), 0);
      const discountAmount = order.discount_amount || 0;
      const shippingCost = order.shipping_cost || 0;

      let tfootHtml = `
        <tr>
          <td colspan="2" style="padding: 20px 10px 10px; text-align: right; color: #666;">Subtotal</td>
          <td style="padding: 20px 10px 10px; text-align: right; font-weight: bold; color: #000;">৳${subtotal.toFixed(0)}</td>
        </tr>
      `;

      if (discountAmount > 0) {
        tfootHtml += `
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right; color: #d4a574;">Discount</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #d4a574;">-৳${discountAmount.toFixed(0)}</td>
          </tr>
        `;
      }

      tfootHtml += `
        <tr>
          <td colspan="2" style="padding: 10px; text-align: right; color: #666;">Shipping</td>
          <td style="padding: 10px; text-align: right; font-weight: bold; color: ${shippingCost > 0 ? '#000' : '#10b981'};">${shippingCost > 0 ? `৳${shippingCost.toFixed(0)}` : 'FREE'}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 15px 10px; text-align: right; font-size: 18px; font-weight: bold; color: #000;">Total</td>
          <td style="padding: 15px 10px; text-align: right; font-size: 18px; font-weight: bold; color: #000;">৳${total_amount.toFixed(0)}</td>
        </tr>
      `;

      const itemsHtml = order_items.map(item => `
        <tr>
          <td style="padding: 12px 10px; border-bottom: 1px solid #f0f0f0;">
            <div style="font-weight: bold; color: #333;">${item.product_name}</div>
            <div style="font-size: 12px; color: #888;">${item.variant_name}</div>
          </td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #f0f0f0; text-align: center; color: #666;">${item.quantity}</td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: bold; color: #000;">৳${item.unit_price.toFixed(0)}</td>
        </tr>
      `).join('');

      const statusColors = {
        'pending': '#e2c19d',
        'placed': '#e2c19d',
        'confirmed': '#10b981',
        'processing': '#3b82f6',
        'shipped': '#f59e0b',
        'delivered': '#059669',
        'cancelled': '#ef4444'
      };

      const statusColor = statusColors[status.toLowerCase()] || '#000';
      const displayStatus = status.toLowerCase() === 'pending' ? 'placed' : status;

      const subject = `Order #${orderId} - ${displayStatus.toUpperCase()}`;
      const html = `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; padding: 0; border-radius: 16px; background: #fff; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: #000; color: #fff; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">ঠেলাগাড়ী</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.7; font-size: 14px;">PREMIUM QUALITY APPAREL</p>
          </div>
          
          <div style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <p style="color: #666; margin: 0 0 10px 0;">Order Update</p>
              <h2 style="margin: 0; color: ${statusColor}; font-size: 28px; text-transform: uppercase;">${displayStatus}</h2>
            </div>

            <p style="color: #333;">Hello ${shipping_address?.firstName || 'Customer'},</p>
            <p style="color: #666; line-height: 1.6;">Your order <strong>#${orderId}</strong> status has been updated. Here are the latest details of your purchase.</p>
            
            <div style="margin: 30px 0;">
              <h3 style="font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px;">Order Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #fafafa;">
                    <th style="padding: 12px 10px; text-align: left; font-size: 12px; color: #888; text-transform: uppercase;">Item</th>
                    <th style="padding: 12px 10px; text-align: center; font-size: 12px; color: #888; text-transform: uppercase;">Qty</th>
                    <th style="padding: 12px 10px; text-align: right; font-size: 12px; color: #888; text-transform: uppercase;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  ${tfootHtml}
                </tfoot>
              </table>
            </div>

            <div style="background: #f9f9f9; padding: 25px; border-radius: 12px; margin-top: 30px; text-align: center;">
              <p style="color: #666; margin-bottom: 10px;">We've attached your official invoice to this email.</p>
              <a href="${process.env.CLIENT_URL || 'http://localhost:8080'}/api/invoices/${_id}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Download Digital Invoice</a>
            </div>

            <div style="background: #f9f9f9; padding: 25px; border-radius: 12px; margin-top: 30px;">
              <h4 style="margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; color: #888;">Delivery Details</h4>
              <div style="color: #333; line-height: 1.5;">
                <p style="margin: 0; font-weight: bold;">${shipping_address?.firstName} ${shipping_address?.lastName}</p>
                <p style="margin: 5px 0;">${shipping_address?.address}</p>
                <p style="margin: 0;">${shipping_address?.city}, ${shipping_address?.postalCode || ''}</p>
                <p style="margin: 10px 0 0 0; color: #666;">${phone_number}</p>
              </div>
            </div>

            ${order.tracking_id ? `
            <div style="margin-top: 30px; border-left: 4px solid #000; padding: 15px 20px; background: #fff;">
              <h4 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase;">Track Your Package</h4>
              <p style="margin: 5px 0; color: #333;">Courier: <strong>${order.courier_name || 'Standard Shipping'}</strong></p>
              <p style="margin: 5px 0; color: #333;">Tracking ID: <span style="background: #eee; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${order.tracking_id}</span></p>
            </div>
            ` : ''}

            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #f0f0f0;">
              <p style="color: #888; font-size: 14px;">Thank you for your business!</p>
              <a href="${process.env.CLIENT_URL || 'http://localhost:8080'}" style="display: inline-block; margin-top: 15px; color: #000; text-decoration: none; font-weight: bold; border-bottom: 1px solid #000;">Return to Shop</a>
            </div>
          </div>
          
          <div style="background: #fafafa; padding: 20px; text-align: center; font-size: 12px; color: #aaa;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} ঠেলাগাড়ী. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">You're receiving this because you made a purchase at ঠেলাগাড়ী.</p>
          </div>
        </div>
      `;

      // Generate invoice PDF for attachment
      const attachments = [];
      try {
        const pdfBuffer = await generateInvoicePDF(order);
        attachments.push({
          filename: `invoice-${orderId}.pdf`,
          content: pdfBuffer
        });
      } catch (pdfError) {
        console.error(`[NOTIFICATION] Failed to generate invoice PDF for order #${orderId}:`, pdfError);
      }

      return sendEmail({ to: customerEmail, subject, html, attachments });
    }
  }

  // 2. Prepare and Send SMS
  if ((type === 'sms' || type === 'both') && phone_number) {
    const displayStatus = status.toLowerCase() === 'pending' ? 'placed' : status;
    const smsMessage = `ঠেলাগাড়ী: Order #${orderId} is ${displayStatus.toUpperCase()}. Total: BDT ${total_amount.toFixed(0)}. ${order.tracking_id ? `Tracking: ${order.tracking_id}` : 'Thank you!'}`;
    await sendSMS(phone_number, smsMessage);
  }

  return true;
};

export const sendResetPasswordEmail = async (user, resetToken, clientUrl) => {
  const baseUrl = clientUrl || process.env.CLIENT_URL || "http://localhost:8080";
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
  const subject = "Reset Your Password - ঠেলাগাড়ী";
  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; padding: 40px; border-radius: 16px; background: #fff; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <h1 style="color: #000; letter-spacing: 2px; margin-bottom: 30px;">ঠেলাগাড়ী</h1>
      <h2 style="color: #333; margin-bottom: 20px;">Secure Password Reset</h2>
      <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">Hello ${user.display_name || 'Customer'},<br>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
      
      <div style="margin: 40px 0;">
        <a href="${resetUrl}" style="background: #000; color: #fff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">Reset My Password</a>
      </div>
      
      <p style="font-size: 12px; color: #aaa; margin-top: 40px; border-top: 1px solid #f0f0f0; padding-top: 20px;">
        This link will expire in 10 minutes for your security.<br>
        If the button above doesn't work, copy and paste this link:<br>
        <span style="color: #3b82f6;">${resetUrl}</span>
      </p>
    </div>
  `;

  return sendEmail({ to: user.email, subject, html });
};
