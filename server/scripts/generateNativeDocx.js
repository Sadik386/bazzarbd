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

const outputPath = path.resolve(__dirname, "../../docs/120_DAY_SUPPORT_COMPLETION_CERTIFICATE.docx");

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
  top: 120, // dxa (~6pt)
  bottom: 120,
  left: 160, // dxa (~8pt)
  right: 160
};

// ── Header Box Table ──
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
          margins: { top: 200, bottom: 200, left: 240, right: 240 },
          children: [
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: "THELAGARI (LUMINA COMMERCE)",
                  bold: true,
                  size: 32, // 16pt
                  color: "111827",
                  font: "Arial"
                })
              ]
            }),
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: "120-DAY SUPPORT COMPLETION & FINAL SIGN-OFF CERTIFICATE",
                  bold: true,
                  size: 21, // 10.5pt
                  color: "B45309",
                  font: "Arial"
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Production URL: https://thelagaribd.com  |  Version: v1.0.0-production  |  Date: October 2026",
                  size: 18, // 9pt
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

// ── Section 1: Executive Declaration ──
const section1Header = new Paragraph({
  spacing: { before: 260, after: 120 },
  children: [
    new TextRun({
      text: "1. Executive Support Fulfillment Declaration",
      bold: true,
      size: 22, // 11pt
      color: "111827",
      font: "Arial"
    })
  ]
});

const section1Body = new Paragraph({
  spacing: { after: 200 },
  alignment: AlignmentType.JUSTIFIED,
  children: [
    new TextRun({
      text: "This official document certifies that the comprehensive ",
      size: 19,
      color: "374151",
      font: "Arial"
    }),
    new TextRun({
      text: "120-Day Post-Launch Support & Warranty Period",
      bold: true,
      size: 19,
      color: "111827",
      font: "Arial"
    }),
    new TextRun({
      text: " for the Thelagari E-Commerce platform has been fully completed and executed in accordance with agreed specifications. All reported software defects, performance tuning, and infrastructure stability tasks have been successfully concluded. There are currently ",
      size: 19,
      color: "374151",
      font: "Arial"
    }),
    new TextRun({
      text: "zero outstanding Critical (P1) or Major (P2) platform blockers.",
      bold: true,
      size: 19,
      color: "111827",
      font: "Arial"
    })
  ]
});

// ── Section 2: SLA & Performance Summary Table ──
const section2Header = new Paragraph({
  spacing: { before: 180, after: 120 },
  children: [
    new TextRun({
      text: "2. Support SLA & Performance Summary",
      bold: true,
      size: 22,
      color: "111827",
      font: "Arial"
    })
  ]
});

// 4 Columns: 28%, 26%, 28%, 18%
const colWidths = [28, 26, 28, 18];

const makeHeaderCell = (text, widthPercent) => {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            size: 18, // 9pt
            color: "111827",
            font: "Arial"
          })
        ]
      })
    ]
  });
};

const makeDataCell = (text, widthPercent, isBold = false, isSuccess = false, bg = "FFFFFF") => {
  let color = "374151";
  if (isSuccess) color = "15803D";
  else if (isBold) color = "111827";

  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: bg, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: isBold || isSuccess,
            size: 18, // 9pt
            color,
            font: "Arial"
          })
        ]
      })
    ]
  });
};

const slaRows = [
  ["Support Window", "120 Calendar Days", "120 Days Full Coverage", "Completed"],
  ["Critical Defect SLA (P1)", "< 8 Hours Resolution", "0 Unresolved Critical Defects", "100% Resolved"],
  ["Major Defect SLA (P2)", "< 24 Hours Resolution", "All Functional Tickets Closed", "100% Resolved"],
  ["Platform Availability", "Production VPS & Web Store", "> 99.9% Production Uptime", "Exceeded"],
  ["Automated DB Backups", "Nightly MongoDB dumps", "Google Drive sync via Rclone", "Operational"],
  ["Codebase Ownership", "Monorepo & Secrets", "Full Admin Granted to Client", "Transferred"]
];

const tableRows = [
  new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      makeHeaderCell("Deliverable / Dimension", colWidths[0]),
      makeHeaderCell("Agreed Target", colWidths[1]),
      makeHeaderCell("Delivered Result", colWidths[2]),
      makeHeaderCell("Status", colWidths[3])
    ]
  }),
  ...slaRows.map((row, idx) => {
    const bg = idx % 2 === 0 ? "FFFFFF" : "F9FAFB";
    return new TableRow({
      cantSplit: true,
      children: [
        makeDataCell(row[0], colWidths[0], true, false, bg),
        makeDataCell(row[1], colWidths[1], false, false, bg),
        makeDataCell(row[2], colWidths[2], false, false, bg),
        makeDataCell(row[3], colWidths[3], false, true, bg)
      ]
    });
  })
];

const slaTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tableBorders,
  rows: tableRows
});

// ── Section 3: Core Systems Verified ──
const section3Header = new Paragraph({
  spacing: { before: 240, after: 100 },
  children: [
    new TextRun({
      text: "3. Production Systems Handed Over & Verified",
      bold: true,
      size: 22,
      color: "111827",
      font: "Arial"
    })
  ]
});

const systemsList = [
  "Storefront & Checkout: React 18, Vite & Tailwind responsive shopping experience live at https://thelagaribd.com.",
  "API & Backend Runtime: Node.js / Express API running under PM2 cluster mode with automated restart on server reboot.",
  "Database & Disaster Recovery: MongoDB cluster with verified daily backup script (server/backup_to_gdrive.sh).",
  "Cloud Integrations: Cloudinary media CDN, Resend transactional emails, and payment gateway webhooks fully operating."
];

const systemParagraphs = systemsList.map(text => {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [
      new TextRun({
        text,
        size: 18,
        color: "374151",
        font: "Arial"
      })
    ]
  });
});

// ── Section 4: Operational Transition ──
const section4Header = new Paragraph({
  spacing: { before: 200, after: 100 },
  children: [
    new TextRun({
      text: "4. Operational Transition & Closeout Terms",
      bold: true,
      size: 22,
      color: "111827",
      font: "Arial"
    })
  ]
});

const section4Body = new Paragraph({
  spacing: { after: 220 },
  alignment: AlignmentType.JUSTIFIED,
  children: [
    new TextRun({
      text: "Upon execution of this certificate, the complimentary 120-day warranty window concludes and the platform transitions to ",
      size: 19,
      color: "374151",
      font: "Arial"
    }),
    new TextRun({
      text: "Client Self-Management",
      bold: true,
      size: 19,
      color: "111827",
      font: "Arial"
    }),
    new TextRun({
      text: ". The delivery team is formally discharged from complimentary support obligations. Subsequent feature engineering or monthly retainer maintenance may be contracted under a separate agreement.",
      size: 19,
      color: "374151",
      font: "Arial"
    })
  ]
});

// ── Section 5: Dual Sign-Off Table ──
const section5Header = new Paragraph({
  spacing: { before: 200, after: 120 },
  children: [
    new TextRun({
      text: "5. Formal Acceptance & Dual Sign-Off",
      bold: true,
      size: 22,
      color: "111827",
      font: "Arial"
    })
  ]
});

const makeSignCell = (title, lines, note) => {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { fill: "FAFAFA", type: ShadingType.CLEAR },
    margins: { top: 160, bottom: 160, left: 200, right: 200 },
    children: [
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 20,
            color: "B45309",
            font: "Arial"
          })
        ]
      }),
      ...lines.map(line => new Paragraph({
        spacing: { after: 90 },
        children: [
          new TextRun({
            text: line,
            size: 18,
            color: "4B5563",
            font: "Arial"
          })
        ]
      })),
      new Paragraph({
        spacing: { before: 80 },
        children: [
          new TextRun({
            text: note,
            italics: true,
            size: 16,
            color: "6B7280",
            font: "Arial"
          })
        ]
      })
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
          "CLIENT ACCEPTANCE (THELAGARI)",
          [
            "Authorized Signatory: _________________________",
            "Designation / Title: ___________________________",
            "Organization: Thelagari (Lumina Commerce)",
            "Signature: ___________________________________",
            "Date: ________________________________________"
          ],
          "Confirms satisfaction and closeout of 120-day support."
        ),
        makeSignCell(
          "DELIVERY AUTHORIZATION (ENGINEERING)",
          [
            "Lead Engineer / Agency: _______________________",
            "Designation: Lead Full-Stack Architect",
            "Organization: Engineering & Delivery Team",
            "Signature: ___________________________________",
            "Date: ________________________________________"
          ],
          "Certifies completion of all post-launch support commitments."
        )
      ]
    })
  ]
});

// ── Footer ──
const footerPara = new Paragraph({
  spacing: { before: 300 },
  alignment: AlignmentType.CENTER,
  children: [
    new TextRun({
      text: "Thelagari (Lumina Commerce) — Official Post-Launch Warranty Closeout Document — Page 1 of 1",
      size: 16,
      color: "9CA3AF",
      font: "Arial"
    })
  ]
});

// ── Build Document ──
const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 720, // 0.5 in
            bottom: 720,
            left: 800,
            right: 800
          }
        }
      },
      children: [
        headerTable,
        section1Header,
        section1Body,
        section2Header,
        slaTable,
        section3Header,
        ...systemParagraphs,
        section4Header,
        section4Body,
        section5Header,
        signTable,
        footerPara
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log("Native DOCX generated successfully at:", outputPath);
});
