import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import Settings from '../models/Settings.js';

// Resend and Nodemailer will be initialized lazily to avoid dotenv hoisting issues
let resendClient = null;

// Lazily initialized Nodemailer transporter
let nodemailerTransporter = null;

const getNodemailerTransporter = async () => {
  if (!nodemailerTransporter) {
    let smtpConfig = null;
    try {
      smtpConfig = await Settings.findOne({ key: 'smtp_config' }).lean();
      if (smtpConfig) smtpConfig = smtpConfig.value;
    } catch (err) {}

    const host = smtpConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = smtpConfig?.port || process.env.SMTP_PORT || 587;
    const user = smtpConfig?.user || process.env.SMTP_USER;
    const pass = smtpConfig?.pass || process.env.SMTP_PASS;

    if (user && pass) {
      const isGmail = host.toLowerCase().includes('gmail.com');
      if (isGmail) {
        console.log(`[EMAIL] Initializing Nodemailer with optimized Gmail service settings.`);
        nodemailerTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass }
        });
      } else {
        console.log(`[EMAIL] Initializing Nodemailer with custom SMTP settings: ${host}:${port}`);
        nodemailerTransporter = nodemailer.createTransport({
          host,
          port,
          secure: String(port) === '465', // true for 465, false for other ports
          auth: { user, pass },
          tls: { rejectUnauthorized: false }
        });
      }
    }
  }
  return nodemailerTransporter;
};

/**
 * Sends a generic email using Resend (if configured) or falling back to Nodemailer
 */
export const sendEmail = async ({ to, subject, html, text, attachments = [], replyTo }) => {
  let smtpConfig = null;
  try {
    const configSetting = await Settings.findOne({ key: 'smtp_config' }).lean();
    if (configSetting) smtpConfig = configSetting.value;
  } catch (err) {}

  const fromName = smtpConfig?.fromName || process.env.SMTP_FROM_NAME || 'ঠেলাগাড়ী';
  
  // 1. Try to use Resend if API Key exists
  if (process.env.RESEND_API_KEY) {
    if (!resendClient) {
      resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    const fromEmail = process.env.RESEND_FROM_EMAIL || smtpConfig?.user || process.env.SMTP_USER ;
    try {
      console.log(`[EMAIL] Attempting to send via Resend using sender: ${fromEmail}`);
      const { data, error } = await resendClient.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html,
        text,
        attachments,
        ...(replyTo && { reply_to: replyTo })
      });
      
      if (error) {
        console.error(`[EMAIL] Resend API Error for sender ${fromEmail}:`, error);
        
        // If domain is not verified, retry with onboarding@resend.dev
        if (fromEmail !== 'onboarding@resend.dev') {
          console.log(`[EMAIL] Retrying Resend with fallback sender: onboarding@resend.dev`);
          const retryResult = await resendClient.emails.send({
            from: `${fromName} <onboarding@resend.dev>`,
            to,
            subject,
            html,
            text,
            attachments,
            ...(replyTo && { reply_to: replyTo })
          });
          if (retryResult.data && !retryResult.error) {
            console.log(`[EMAIL] Successfully sent via Resend onboarding fallback!`);
            return { success: true, messageId: retryResult.data.id };
          } else {
            console.error(`[EMAIL] Resend onboarding fallback retry failed:`, retryResult.error);
          }
        }
      } else {
        return { success: true, messageId: data.id };
      }
    } catch (error) {
      console.error(`[EMAIL] Failed to send via Resend to ${to}, falling back to SMTP:`, error);
    }
  }

  // 2. Fallback to Nodemailer (e.g. Gmail SMTP)
  const transporter = await getNodemailerTransporter();
  if (transporter) {
    const fromEmail = smtpConfig?.user || process.env.SMTP_USER;
    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
        text,
        attachments,
        ...(replyTo && { replyTo })
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[EMAIL] Failed to send via SMTP to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  // 3. Mock fallback if nothing is configured
  console.log(`[EMAIL-MOCK] To: ${to}, Subject: ${subject}`);
  return { success: true, mock: true };
};
