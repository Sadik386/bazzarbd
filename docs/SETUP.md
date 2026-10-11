# Thelagari (Lumina Commerce) — Setup & Run Guide

Comprehensive guide for configuring, running, and testing Thelagari in local development, staging, and production environments.

---

## 1. System Requirements & Prerequisites

Ensure the following runtimes and utilities are installed on your machine or server:

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or higher
- **MongoDB**: Local MongoDB instance (`v6.0+`) or MongoDB Atlas connection string
- **Git**: For version control
- **Nginx** & **PM2** (For production VPS hosting)

Verify runtime versions:
```bash
node -v
npm -v
git --version
```

---

## 2. Quick Local Setup

### Step 1: Clone Repository
```bash
git clone <REPOSITORY_URL>
cd thelagari
```

### Step 2: Install Dependencies
Install dependencies for both frontend and backend concurrently:
```bash
# Installs root orchestrator dependencies
npm install

# Installs client and server dependencies
npm run install:all
```

---

## 3. Environment Variables Configuration

### A. Backend (`server/.env`)
Create `server/.env`:
```bash
# Server Port & Core Settings
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/thelagari
# Or Atlas: mongodb+srv://<username>:<password>@cluster.mongodb.net/thelagari?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
JWT_EXPIRES_IN=7d

# Cloudinary (Cloud image storage & optimization)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Transactional Email (Resend or SMTP)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=Thelagari <orders@thelagaribd.com>

# Payment Gateway (e.g. SSLCommerz / bKash / Nagad if enabled)
STORE_ID=your_store_id
STORE_PASS=your_store_password
IS_LIVE=false

# Firebase Admin SDK (Optional / Push Notifications & Auth)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### B. Frontend (`client/.env`)
Create `client/.env`:
```bash
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:5001/api

# Site URL
VITE_SITE_URL=http://localhost:5173

# Firebase Client Configuration (if enabled)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 4. Database Seeding & Initial Admin Setup

Initialize base collections (default categories, sample products, master admin user):

```bash
cd server
npm run seed
```

This ensures the database has initial data ready for testing storefront browsing and admin authentication.

---

## 5. Running the Application Locally

### Simultaneous Development (Client + Server)
From the project root:
```bash
npm run dev
```
- **Storefront Client**: Runs at `http://localhost:5173`
- **Backend API Server**: Runs at `http://localhost:5001`

### Running Services Separately
- **Client only**:
  ```bash
  npm run dev:client
  ```
- **Server only**:
  ```bash
  npm run dev:server
  ```

---

## 6. Building for Production

### Frontend Build
```bash
cd client
npm run build
```
Compiled production assets will output to `client/dist/`.

### TypeScript & Lint Verification
```bash
cd client
npm run type-check
npm run lint
```

---

## 7. Production VPS Deployment (`deploy.sh`)

The project includes an automated deployment script tailored for Ubuntu/Debian VPS environments with PM2 and Nginx.

```bash
# Execute automated zero-downtime deployment
sudo bash deploy.sh
```

### What `deploy.sh` executes:
1. Pulls latest changes from git `main`.
2. Installs client dependencies and generates `client/dist/`.
3. Installs backend dependencies.
4. Hot-reloads backend in PM2 Cluster Mode (`-i max`, memory limit 512MB).
5. Tests and reloads Nginx (`sudo nginx -t && sudo systemctl reload nginx`).

---

## 8. Common Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **CORS Error in Browser** | `CLIENT_URL` in `server/.env` doesn't match client host | Set `CLIENT_URL=http://localhost:5173` (or production domain) and restart server. |
| **MongoDB Connection Refused** | Local MongoDB is not running | Run `sudo systemctl start mongod` or verify Atlas IP whitelist. |
| **Image Uploads Fail** | Missing Cloudinary keys or `/uploads/` folder permissions | Verify Cloudinary credentials or run `mkdir -p server/uploads && chmod -R 755 server/uploads`. |
| **Port 5001 Already in Use** | Ghost Node process running | Find and kill: `lsof -i :5001` then `kill -9 <PID>`. |
