import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType
} from "docx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.resolve(__dirname, "../../docs/CLIENT_HANDOVER.docx");

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "E5E7EB"
};

const tableBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
  insideHorizontal: thinBorder,
  insideVertical: thinBorder
};

const noBorder = {
  style: BorderStyle.NONE,
  size: 0,
  color: "auto"
};

const cellMargins = {
  top: 100, // ~5pt
  bottom: 100,
  left: 140, // ~7pt
  right: 140
};

// ── Header Box ──
const headerTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: {
    top: { style: BorderStyle.SINGLE, size: 8, color: "D4A574" },
    bottom: { style: BorderStyle.SINGLE, size: 8, color: "D4A574" },
    left: { style: BorderStyle.SINGLE, size: 24, color: "D4A574" }, // Gold accent bar
    right: { style: BorderStyle.SINGLE, size: 8, color: "D4A574" },
    insideHorizontal: noBorder,
    insideVertical: noBorder
  },
  rows: [
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: "FBF9F6", type: ShadingType.CLEAR },
          margins: { top: 180, bottom: 180, left: 220, right: 220 },
          children: [
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: "THELAGARI (LUMINA COMMERCE)",
                  bold: true,
                  size: 28, // 14pt
                  color: "111827",
                  font: "Arial"
                })
              ]
            }),
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: "CLIENT HANDOVER PACKAGE & SYSTEM CUSTODY TRANSFER",
                  bold: true,
                  size: 20, // 10pt
                  color: "B45309",
                  font: "Arial"
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Production URL: https://thelagaribd.com  |  Release: v1.0.0-production  |  Date: October 2026",
                  size: 17, // 8.5pt
                  color: "6B7280",
                  font: "Arial"
                })
              ]
            })
          ]
        })
      ]
    })
  ]
});

// Helper for section headings
const makeHeading = (text) => {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 21, // 10.5pt
        color: "111827",
        font: "Arial"
      })
    ]
  });
};

const makeSubheading = (text) => {
  return new Paragraph({
    spacing: { before: 120, after: 60 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 19, // 9.5pt
        color: "1F2937",
        font: "Arial"
      })
    ]
  });
};

// Helper for code blocks
const makeCodeBlock = (lines) => {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 140, right: 140 },
            children: lines.map(line => new Paragraph({
              spacing: { after: 30 },
              children: [
                new TextRun({
                  text: line,
                  size: 16, // 8pt
                  color: "1F2937",
                  font: "Consolas"
                })
              ]
            }))
          })
        ]
      })
    ]
  });
};

// ── Section 1: System Overview Table ──
const overviewRows = [
  ["Storefront", "React 18, TypeScript, Vite, Tailwind CSS", "Client IT"],
  ["Backend API", "Node.js, Express, MongoDB (Cluster Mode on PM2)", "Client DevOps"],
  ["Server / Host", "Ubuntu 22.04 VPS (/var/www/thelagari), Nginx Reverse Proxy", "Client DevOps"],
  ["Database", "MongoDB Atlas Cluster (thelagari)", "Client IT"],
  ["Media CDN", "Cloudinary (f_auto, q_auto auto-optimization)", "Client Ops"],
  ["DNS & Security", "Cloudflare Proxied, Full (Strict) SSL, WAF", "Client IT"],
  ["Transactional Email", "Resend / SMTP (orders@thelagaribd.com, SPF/DKIM verified)", "Store Ops"],
  ["Code Repository", "Full GitHub repository ownership transferred to Client", "Client Admin"]
];

const overviewColWidths = [24, 56, 20];

const overviewTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tableBorders,
  rows: [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: overviewColWidths[0], type: WidthType.PERCENTAGE },
          shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "Platform Component", bold: true, size: 17, color: "111827", font: "Arial" })] })]
        }),
        new TableCell({
          width: { size: overviewColWidths[1], type: WidthType.PERCENTAGE },
          shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "Technical Specification", bold: true, size: 17, color: "111827", font: "Arial" })] })]
        }),
        new TableCell({
          width: { size: overviewColWidths[2], type: WidthType.PERCENTAGE },
          shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "Primary Custodian", bold: true, size: 17, color: "111827", font: "Arial" })] })]
        })
      ]
    }),
    ...overviewRows.map((r, i) => {
      const bg = i % 2 === 0 ? "FFFFFF" : "F9FAFB";
      return new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: overviewColWidths[0], type: WidthType.PERCENTAGE },
            shading: { fill: bg, type: ShadingType.CLEAR },
            margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: r[0], bold: true, size: 17, color: "111827", font: "Arial" })] })]
          }),
          new TableCell({
            width: { size: overviewColWidths[1], type: WidthType.PERCENTAGE },
            shading: { fill: bg, type: ShadingType.CLEAR },
            margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: r[1], size: 17, color: "374151", font: "Arial" })] })]
          }),
          new TableCell({
            width: { size: overviewColWidths[2], type: WidthType.PERCENTAGE },
            shading: { fill: bg, type: ShadingType.CLEAR },
            margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: r[2], size: 17, color: "4B5563", font: "Arial" })] })]
          })
        ]
      });
    })
  ]
});

// ── Section 3: Admin & Credentials ──
const adminList = [
  "Admin Portal: https://thelagaribd.com/admin (accessible with provisioned master credentials).",
  "Super Admin Login: Transferred via client encrypted password vault.",
  "Secrets Management: All production keys (server/.env, client/.env) are secured in the password vault."
];

// ── Section 4: Documentation Index ──
const docList = [
  "Setup & Development Guide (docs/SETUP.md): Local developer setup, seeding, and ports.",
  "Architecture & Tech Stack (docs/ARCHITECTURE.md): System design, data models, and API structure.",
  "Admin User & Operations Manual (docs/USER_GUIDE.md): Order fulfillment, catalog, and discounts.",
  "Cloudflare & DNS Setup (docs/CLOUDFLARE_SETUP.md): Edge routing, caching, and SSL certificates.",
  "120-Day Support Completion Certificate (docs/SUPPORT_COMPLETION.md): Warranty and support sign-off.",
  "Knowledge Transfer Package (docs/KNOWLEDGE_TRANSFER.md): Training recordings archive."
];

// ── Section 5: Support & Warranty ──
const warrantyPara = new Paragraph({
  spacing: { after: 120 },
  children: [
    new TextRun({
      text: "The agreed 120-Day Post-Launch Support & Warranty Period has been fully completed and executed. 100% of reported defects within scope have been resolved with zero pending Critical (P1) or Major (P2) bugs. The platform is in full client ownership and custody.",
      size: 18,
      color: "374151",
      font: "Arial"
    })
  ]
});

// ── Section 6: Dual Sign-Off Table ──
const makeSignCell = (title, lines) => {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { fill: "FAFAFA", type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    children: [
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 18,
            color: "B45309",
            font: "Arial"
          })
        ]
      }),
      ...lines.map(line => new Paragraph({
        spacing: { after: 70 },
        children: [
          new TextRun({
            text: line,
            size: 17,
            color: "4B5563",
            font: "Arial"
          })
        ]
      }))
    ]
  });
};

const signTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tableBorders,
  rows: [
    new TableRow({
      cantSplit: true,
      children: [
        makeSignCell(
          "CLIENT AUTHORIZATION (THELAGARI)",
          [
            "Authorized Signatory: _________________________",
            "Designation / Title: ___________________________",
            "Organization: Thelagari (Lumina Commerce)",
            "Signature: ___________________________________",
            "Date: ________________________________________"
          ]
        ),
        makeSignCell(
          "DELIVERY AUTHORIZATION (ENGINEERING)",
          [
            "Authorized Signatory: _________________________",
            "Designation / Title: Lead Full-Stack Architect",
            "Organization: Engineering & Delivery Team",
            "Signature: ___________________________________",
            "Date: ________________________________________"
          ]
        )
      ]
    })
  ]
});

// ── Document Assembly ──
const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 720,
            bottom: 720,
            left: 720,
            right: 720
          }
        }
      },
      children: [
        headerTable,
        makeHeading("1. System & Custody Overview"),
        overviewTable,
        makeHeading("2. Production Operations Runbook"),
        makeSubheading("2.1 One-Command Zero-Downtime Deployment"),
        makeCodeBlock(["cd /var/www/thelagari", "sudo bash deploy.sh"]),
        makeSubheading("2.2 Server Management Commands"),
        makeCodeBlock([
          "pm2 status                              # Check service health",
          "pm2 logs thelagari-api --lines 50       # Live API logs",
          "pm2 restart thelagari-api               # Restart backend process",
          "sudo nginx -t && sudo systemctl reload nginx"
        ]),
        makeSubheading("2.3 Automated Database Backups & Restoration"),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: "• Nightly Schedule: Runs daily at 02:00 AM UTC syncing to Google Drive via Rclone.\n• Manual Snapshot Command:\n  sudo bash /var/www/thelagari/server/backup_to_gdrive.sh\n• Database Restoration:\n  mongorestore --uri=\"$MONGODB_URI\" --drop /path/to/extracted_dump/thelagari",
              size: 17,
              color: "374151",
              font: "Arial"
            })
          ]
        }),
        makeHeading("3. Administrative Access & Credentials"),
        ...adminList.map(text => new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [new TextRun({ text, size: 17, color: "374151", font: "Arial" })]
        })),
        makeHeading("4. Documentation Suite Index"),
        ...docList.map(text => new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [new TextRun({ text, size: 17, color: "374151", font: "Arial" })]
        })),
        makeHeading("5. Support & Warranty Status (Fulfilled)"),
        warrantyPara,
        makeHeading("6. Formal Acceptance & Sign-Off"),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: "By signing below, the Client confirms receipt of complete source code, server ownership, administrative access, operational documentation, and acknowledges fulfillment of the 120-day support period.",
              size: 17,
              color: "374151",
              font: "Arial"
            })
          ]
        }),
        signTable,
        new Paragraph({
          spacing: { before: 200 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "Thelagari (Lumina Commerce) — Official Client Handover Deliverable — Confidential",
              size: 15,
              color: "9CA3AF",
              font: "Arial"
            })
          ]
        })
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log("CLIENT_HANDOVER.docx generated successfully at:", outputPath);
});
