# Thelagari (Lumina Commerce)

A high-performance, full-stack e-commerce web application featuring a modern React storefront and a Node.js/Express + MongoDB backend API.

---

## 📚 Project Documentation

All project documentation, setup instructions, architecture references, and handover manuals are available in the [`docs/`](file:///home/sadik/sadik/thelagari/docs) folder:

- **[Setup & Run Guide](file:///home/sadik/sadik/thelagari/docs/SETUP.md)**: Local development setup, environment variables, database seeding, and build commands.
- **[Architecture & Tech Stack](file:///home/sadik/sadik/thelagari/docs/ARCHITECTURE.md)**: Architectural diagrams, tech stack breakdown, directory layout, and security models.
- **[Admin User Manual](file:///home/sadik/sadik/thelagari/docs/USER_GUIDE.md)**: Operations manual for order fulfillment, product catalog management, discounts, and customer care.
- **[Client Handover Package](file:///home/sadik/sadik/thelagari/docs/CLIENT_HANDOVER.md)**: Full production deliverables matrix, access checklist, secrets management, disaster recovery runbooks, and formal sign-off.
- **[120-Day Support Completion Certificate (PDF)](file:///home/sadik/sadik/thelagari/docs/120_DAY_SUPPORT_COMPLETION_CERTIFICATE.pdf)** ([Word DOCX](file:///home/sadik/sadik/thelagari/docs/120_DAY_SUPPORT_COMPLETION_CERTIFICATE.docx) | [Concise Summary](file:///home/sadik/sadik/thelagari/docs/120_DAY_SUPPORT_SUMMARY.md) | [Full Certificate](file:///home/sadik/sadik/thelagari/docs/SUPPORT_COMPLETION.md)): Formal fulfillment certificate and sign-off for the completed 120-day post-launch warranty and support period.
- **[Knowledge Transfer & Handover Package](file:///home/sadik/sadik/thelagari/docs/KNOWLEDGE_TRANSFER.md)**: Knowledge transfer recording agendas, credential checklist, warranty terms, and formal client sign-off.
- **[Cloudflare & DNS Setup](file:///home/sadik/sadik/thelagari/docs/CLOUDFLARE_SETUP.md)**: Cloudflare proxy configuration, caching rules, and SSL/TLS instructions.

---

## ⚡ Quick Start

```bash
# 1. Install all dependencies (client and server)
npm run install:all

# 2. Configure environment variables
# Copy server/.env.example -> server/.env
# Copy client/.env.example -> client/.env

# 3. Seed initial database collections
cd server && npm run seed && cd ..

# 4. Run development servers (Client on :5173, Server on :5001)
npm run dev
```

---

## 🚀 Production Deployment

Deploy updates to production with zero downtime using the deployment script:

```bash
sudo bash deploy.sh
```
