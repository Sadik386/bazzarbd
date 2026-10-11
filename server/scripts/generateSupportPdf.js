import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.resolve(__dirname, "../../docs/120_DAY_SUPPORT_COMPLETION_CERTIFICATE.pdf");

const doc = new PDFDocument({
  size: "A4",
  margin: 40,
  info: {
    Title: "Thelagari - 120-Day Support Completion Certificate",
    Author: "Engineering & Delivery Team",
    Subject: "Post-Launch Warranty & Support Closeout",
    Keywords: "Thelagari, Handover, Warranty, Support Completion, Sign-Off"
  }
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

const FONT_REG = path.join(__dirname, "../fonts/vrinda.ttf");
const FONT_BOLD = path.join(__dirname, "../fonts/vrindab.ttf");

if (fs.existsSync(FONT_REG)) doc.registerFont("Regular", FONT_REG);
else doc.registerFont("Regular", "Helvetica");

if (fs.existsSync(FONT_BOLD)) doc.registerFont("Bold", FONT_BOLD);
else doc.registerFont("Bold", "Helvetica-Bold");

const primaryColor = "#111827";
const accentColor = "#D4A574";
const textMuted = "#4B5563";
const borderColor = "#E5E7EB";

// ── Header Box ──
doc.rect(40, 40, 515, 75).fill("#FAFAFA");
doc.rect(40, 40, 515, 75).strokeColor(borderColor).lineWidth(1).stroke();

// Gold accent bar on left
doc.rect(40, 40, 5, 75).fill(accentColor);

doc.fillColor(primaryColor).fontSize(20).font("Bold").text("THELAGARI (LUMINA COMMERCE)", 55, 52);
doc.fillColor(accentColor).fontSize(10).font("Bold").text("120-DAY SUPPORT COMPLETION & FINAL SIGN-OFF CERTIFICATE", 55, 76);
doc.fillColor(textMuted).fontSize(8.5).font("Regular").text("Production URL: https://thelagaribd.com  |  Version: v1.0.0-production  |  Date: October 2026", 55, 92);

// ── Executive Declaration ──
let y = 130;
doc.fillColor(primaryColor).fontSize(12).font("Bold").text("1. Executive Declaration of Support Fulfillment", 40, y);
y += 18;

const declarationText = 
  "This document certifies that the comprehensive 120-Day Post-Launch Support & Warranty Period for the " +
  "Thelagari E-Commerce platform has been fully completed and executed in compliance with agreed terms. " +
  "All feature defect remediations, performance enhancements, and infrastructure stability items have been " +
  "successfully delivered. There are zero outstanding Critical (P1) or Major (P2) defects.";

doc.fillColor(textMuted).fontSize(9).font("Regular").text(declarationText, 40, y, { width: 515, align: "justify", lineGap: 3 });

y += 48;

// ── SLA & Performance Summary Table ──
doc.fillColor(primaryColor).fontSize(12).font("Bold").text("2. 120-Day Support SLA & Performance Summary", 40, y);
y += 18;

// Table Header
doc.rect(40, y, 515, 20).fill("#F3F4F6");
doc.rect(40, y, 515, 20).strokeColor(borderColor).lineWidth(1).stroke();
doc.fillColor(primaryColor).fontSize(8.5).font("Bold");
doc.text("Dimension / Deliverable", 48, y + 5, { width: 150 });
doc.text("Agreed Target", 200, y + 5, { width: 140 });
doc.text("Delivered Result", 345, y + 5, { width: 140 });
doc.text("Status", 490, y + 5, { width: 60 });
y += 20;

const rows = [
  ["Support Window", "120 Calendar Days", "120 Days Full Coverage", "Completed"],
  ["Critical Defect SLA (P1)", "< 8 Hours Target Resolution", "0 Unresolved Critical Defects", "100% Resolved"],
  ["Major Defect SLA (P2)", "< 24 Hours Target Resolution", "All Functional Tickets Closed", "100% Resolved"],
  ["Platform Availability", "Production VPS & Storefront", "> 99.9% Uptime Maintained", "Exceeded"],
  ["Automated DB Backups", "Nightly MongoDB dumps", "Google Drive sync via Rclone", "Active"],
  ["Source Code & Control", "Full Monorepo Ownership", "Admin transferred to Client", "Completed"],
  ["Documentation & KT", "Full operational manuals", "6 Master guides in docs/", "Completed"]
];

rows.forEach((row, i) => {
  const bg = i % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
  doc.rect(40, y, 515, 18).fill(bg);
  doc.rect(40, y, 515, 18).strokeColor(borderColor).lineWidth(0.5).stroke();

  doc.fillColor(primaryColor).fontSize(8).font("Regular").text(row[0], 48, y + 4, { width: 150 });
  doc.fillColor(textMuted).fontSize(8).font("Regular").text(row[1], 200, y + 4, { width: 140 });
  doc.fillColor(primaryColor).fontSize(8).font("Regular").text(row[2], 345, y + 4, { width: 140 });
  doc.fillColor("#15803D").fontSize(8).font("Bold").text(row[3], 490, y + 4, { width: 60 });

  y += 18;
});

y += 15;

// ── Key Operational Deliverables ──
doc.fillColor(primaryColor).fontSize(12).font("Bold").text("3. Core Systems Handed Over & Operational", 40, y);
y += 18;

const checklist = [
  "React Storefront & Customer Portal: Live at https://thelagaribd.com with responsive mobile optimization.",
  "Node.js/Express API & PM2: Stable cluster mode with automated reboot recovery and SSL termination.",
  "MongoDB Database & Rclone: Nightly automated backups syncing directly to client Google Drive.",
  "Third-Party Services: Cloudinary media CDN, Resend transactional emails, and Payment Gateway active."
];

checklist.forEach((item) => {
  doc.rect(42, y + 3, 5, 5).fill(accentColor);
  doc.fillColor(textMuted).fontSize(8.5).font("Regular").text(item, 54, y, { width: 500, lineGap: 2 });
  y += 15;
});

y += 10;

// ── Operational Transition ──
doc.fillColor(primaryColor).fontSize(12).font("Bold").text("4. Operational Transition & Closeout Terms", 40, y);
y += 16;
const termsText =
  "Upon signature of this document, the complimentary 120-day warranty window concludes and the platform " +
  "transitions to Client Self-Management. The delivery team is discharged from complimentary support obligations. " +
  "Ongoing maintenance, feature enhancements, or ad-hoc technical requests remain available under a separate agreement.";
doc.fillColor(textMuted).fontSize(8.5).font("Regular").text(termsText, 40, y, { width: 515, align: "justify", lineGap: 2 });

y += 38;

// ── Sign-Off Blocks ──
doc.fillColor(primaryColor).fontSize(12).font("Bold").text("5. Formal Acceptance & Dual Sign-Off", 40, y);
y += 16;

// Client Box
doc.rect(40, y, 250, 145).fill("#FAFAFA");
doc.rect(40, y, 250, 145).strokeColor(borderColor).lineWidth(1).stroke();
doc.fillColor(accentColor).fontSize(9.5).font("Bold").text("CLIENT ACCEPTANCE (THELAGARI)", 50, y + 10);
doc.fillColor(textMuted).fontSize(8).font("Regular")
  .text("Authorized Signatory: __________________________", 50, y + 32)
  .text("Designation: _________________________________", 50, y + 54)
  .text("Signature: ___________________________________", 50, y + 76)
  .text("Date: ________________________________________", 50, y + 98)
  .text("Confirmed receipt & fulfillment of 120-day support.", 50, y + 120);

// Delivery Team Box
doc.rect(305, y, 250, 145).fill("#FAFAFA");
doc.rect(305, y, 250, 145).strokeColor(borderColor).lineWidth(1).stroke();
doc.fillColor(accentColor).fontSize(9.5).font("Bold").text("DELIVERY AUTHORIZATION (ENGINEERING)", 315, y + 10);
doc.fillColor(textMuted).fontSize(8).font("Regular")
  .text("Lead Engineer / Agency: ________________________", 315, y + 32)
  .text("Designation: Lead Full-Stack Architect", 315, y + 54)
  .text("Signature: ___________________________________", 315, y + 76)
  .text("Date: ________________________________________", 315, y + 98)
  .text("Certified completion of 120-day post-launch support.", 315, y + 120);

// Footer
doc.fillColor("#9CA3AF").fontSize(7.5).font("Regular")
  .text("Thelagari (Lumina Commerce) — Confidential Handover & Support Closeout Deliverable — 1 of 1", 40, 800, { width: 515, align: "center" });

doc.end();

writeStream.on("finish", () => {
  console.log("PDF created successfully at:", outputPath);
});
