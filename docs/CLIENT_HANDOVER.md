# Thelagari (Lumina Commerce) — Client Handover Package

> **Official Project Handover & Custody Transfer**  
> **Production URL:** [https://thelagaribd.com](https://thelagaribd.com)  
> **Release:** `v1.0.0-production`  
> **Status:** Handed Over & 120-Day Support Completed  
> **Date:** October 2026  

---

## 1. System & Custody Overview

| Item | Details | Custodian |
| :--- | :--- | :--- |
| **Storefront** | React 18, TypeScript, Vite, Tailwind CSS | Client IT |
| **Backend API** | Node.js, Express, MongoDB (Cluster Mode on PM2) | Client DevOps |
| **Server / Host** | Ubuntu 22.04 VPS (`/var/www/thelagari`), Nginx Reverse Proxy | Client DevOps |
| **Database** | MongoDB Atlas Cluster (`thelagari`) | Client IT |
| **Media CDN** | Cloudinary (`f_auto`, `q_auto` optimized) | Client Ops |
| **DNS & Security** | Cloudflare Proxied, Full (Strict) SSL, WAF | Client IT |
| **Transactional Email** | Resend / SMTP (`orders@thelagaribd.com`, SPF/DKIM verified) | Store Ops |
| **Code Repository** | Full GitHub ownership transferred to Client | Client Admin |

---

## 2. Production Operations Runbook

### 2.1 One-Command Zero-Downtime Deployment
```bash
cd /var/www/thelagari
sudo bash deploy.sh
```

### 2.2 Server Management Quick Commands
```bash
# Check service health
pm2 status

# View live API logs
pm2 logs thelagari-api --lines 50

# Restart backend process
pm2 restart thelagari-api

# Test and reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

### 2.3 Automated Database Backups & Disaster Recovery
* **Nightly Schedule**: Runs daily at **02:00 AM UTC** syncing to Google Drive via Rclone.
* **Manual Snapshot**:
  ```bash
  sudo bash /var/www/thelagari/server/backup_to_gdrive.sh
  ```
* **Restore to MongoDB**:
  ```bash
  mongorestore --uri="$MONGODB_URI" --drop /path/to/extracted_dump/thelagari
  ```

---

## 3. Administrative Access & Credentials

* **Admin Portal**: `https://thelagaribd.com/admin`
* **Super Admin Login**: Delivered via encrypted password vault.
* **Secrets Management**: All production keys (`server/.env`, `client/.env`) are shared securely through password manager. *Never commit `.env` files to git.*

---

## 4. Documentation Index

All technical guides and operational manuals are available in [`docs/`](file:///home/sadik/sadik/thelagari/docs):

1. **[Setup & Development Guide](file:///home/sadik/sadik/thelagari/docs/SETUP.md)**: Local developer setup, seeding, and ports.
2. **[Architecture & Tech Stack](file:///home/sadik/sadik/thelagari/docs/ARCHITECTURE.md)**: System design, data models, and API structure.
3. **[Admin User & Operations Manual](file:///home/sadik/sadik/thelagari/docs/USER_GUIDE.md)**: Order fulfillment, catalog, coupons, and discounts.
4. **[Cloudflare & DNS Setup](file:///home/sadik/sadik/thelagari/docs/CLOUDFLARE_SETUP.md)**: Edge routing, caching, and SSL certificates.
5. **[120-Day Support Completion Certificate](file:///home/sadik/sadik/thelagari/docs/SUPPORT_COMPLETION.md)** ([PDF](file:///home/sadik/sadik/thelagari/docs/120_DAY_SUPPORT_COMPLETION_CERTIFICATE.pdf) | [DOCX](file:///home/sadik/sadik/thelagari/docs/120_DAY_SUPPORT_COMPLETION_CERTIFICATE.docx)): Warranty and support fulfillment sign-off.
6. **[Knowledge Transfer Package](file:///home/sadik/sadik/thelagari/docs/KNOWLEDGE_TRANSFER.md)**: Training recordings archive and agenda.

---

## 5. Support & Warranty Status (Fulfilled)

* **Coverage Period:** 120 Calendar Days (Completed).
* **Fulfillment:** 100% of in-scope defect remediations resolved; 0 pending Critical (P1) or Major (P2) bugs.
* **Platform Custody:** Platform transitioned to Client Self-Management. Ongoing maintenance or new feature development is available under separate agreement.

---

## 6. Formal Acceptance & Sign-Off

By signing below, the Client confirms receipt of complete source code, server ownership, administrative access, operational training, and acknowledges fulfillment of the 120-day support period.

### Client Authorization (Thelagari)
* **Authorized Signatory:** __________________________________________________
* **Designation / Title:** __________________________________________________
* **Signature:** __________________________________________________
* **Date:** __________________________________________________

### Delivery Authorization (Engineering Team)
* **Authorized Signatory:** __________________________________________________
* **Designation / Title:** Lead Full-Stack Architect
* **Signature:** __________________________________________________
* **Date:** __________________________________________________
