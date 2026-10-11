/**
 * migrateImages.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time migration script: downloads all Cloudinary images to VPS disk and
 * updates MongoDB URLs to relative /uploads/<filename> paths.
 *
 * Usage (run from /var/www/thelagari on VPS):
 *   node server/scripts/migrateImages.js            # live run
 *   node server/scripts/migrateImages.js --dry-run  # preview only, no changes
 *   node server/scripts/migrateImages.js --limit 50 # migrate only first 50
 *
 * Safe to run multiple times — already-migrated images (non-Cloudinary URLs)
 * are automatically skipped.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Load .env (handles both dev and VPS paths)
const envPath = fs.existsSync(path.join(__dirname, "../../server/.env"))
  ? path.join(__dirname, "../../server/.env")
  : fs.existsSync(path.join(__dirname, "../.env"))
  ? path.join(__dirname, "../.env")
  : "./.env";
dotenv.config({ path: envPath });

const isDryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find(a => a.startsWith("--limit=") || a.startsWith("--limit "));
const LIMIT    = limitArg ? parseInt(limitArg.replace(/--limit[= ]/, "")) : Infinity;

// ── Config ────────────────────────────────────────────────────────────────────
const UPLOADS_DIR  = path.join(__dirname, "..", "uploads");
const ERROR_LOG    = path.join(__dirname, "..", "migration-errors.log");
const BATCH_SIZE   = 10;   // concurrent downloads per batch
const DELAY_MS     = 200;  // ms between batches (be gentle to Cloudinary)

// ── Models (inline — avoids circular import issues in standalone script) ──────
const imageSchema = new mongoose.Schema({
  url:           { type: String },
  alt_text:      String,
  display_order: { type: Number, default: 0 },
});

const variantSchema = new mongoose.Schema({
  variant_name:  { type: String },
  price_modifier:{ type: Number, default: 0 },
  sku:           String,
  stock_level:   { type: Number, default: 0 },
});

const productSchema = new mongoose.Schema({
  name:           String,
  slug:           String,
  product_images: [imageSchema],
  product_variants: [variantSchema],
}, { timestamps: true, strict: false });

const categorySchema = new mongoose.Schema({
  name:      String,
  image_url: String,
}, { timestamps: true, strict: false });

const settingsSchema = new mongoose.Schema({}, { strict: false });

const Product  = mongoose.models.Product  || mongoose.model("Product",  productSchema);
const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

function isCloudinaryUrl(url) {
  return typeof url === "string" && url.includes("cloudinary.com");
}

function logError(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(ERROR_LOG, line, "utf8");
  console.error("  ❌", message);
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers: { "User-Agent": "Thelagari-Migration/1.0" } }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end",  ()    => resolve({ data: Buffer.concat(chunks), contentType: res.headers["content-type"] }));
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

function getExtFromContentType(contentType, originalUrl) {
  // Try to get extension from content-type header
  if (contentType) {
    const map = {
      "image/jpeg": ".jpg",
      "image/jpg":  ".jpg",
      "image/png":  ".png",
      "image/webp": ".webp",
      "image/gif":  ".gif",
      "image/svg+xml": ".svg",
    };
    const ext = map[contentType.split(";")[0].trim()];
    if (ext) return ext;
  }
  // Fallback: extract from URL
  const urlExt = path.extname(originalUrl.split("?")[0]);
  return urlExt || ".jpg";
}

async function downloadAndSave(cloudinaryUrl) {
  const { data, contentType } = await downloadFile(cloudinaryUrl);
  const ext      = getExtFromContentType(contentType, cloudinaryUrl);
  const filename = `migrated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, data);
  return `/uploads/${filename}`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main migration ────────────────────────────────────────────────────────────

async function migrateProducts(stats) {
  const products = await Product.find({}).lean();
  console.log(`\n📦 Found ${products.length} products`);

  let migrated = 0;
  let skipped  = 0;

  for (const product of products) {
    if (stats.total >= LIMIT) break;

    const cloudinaryImages = (product.product_images || []).filter(img => isCloudinaryUrl(img.url));
    if (cloudinaryImages.length === 0) {
      skipped++;
      continue;
    }

    console.log(`\n  🔄 Product: "${product.name}" (${cloudinaryImages.length} image(s) to migrate)`);

    // Process images for this product in small batches
    const updatedImages = [...(product.product_images || [])];

    for (let i = 0; i < updatedImages.length; i++) {
      const img = updatedImages[i];
      if (!isCloudinaryUrl(img.url)) continue;
      if (stats.total >= LIMIT) break;

      process.stdout.write(`    ↓ ${img.url.slice(0, 80)}...`);

      if (isDryRun) {
        console.log(" [DRY RUN - would download]");
        stats.total++;
        stats.dryRun++;
        continue;
      }

      try {
        const newUrl = await downloadAndSave(img.url);
        updatedImages[i] = { ...img, url: newUrl };
        console.log(` → ${newUrl}`);
        stats.total++;
        stats.success++;
      } catch (err) {
        console.log(" FAILED");
        logError(`Product ${product._id} image[${i}] ${img.url}: ${err.message}`);
        stats.total++;
        stats.errors++;
      }
    }

    // Update DB record
    if (!isDryRun) {
      await Product.updateOne(
        { _id: product._id },
        { $set: { product_images: updatedImages } }
      );
    }
    migrated++;
  }

  console.log(`\n  ✅ Products: ${migrated} updated, ${skipped} skipped (no Cloudinary images)`);
}

async function migrateCategories(stats) {
  const categories = await Category.find({}).lean();
  console.log(`\n🗂  Found ${categories.length} categories`);

  for (const cat of categories) {
    if (stats.total >= LIMIT) break;
    if (!isCloudinaryUrl(cat.image_url)) continue;

    process.stdout.write(`  ↓ Category "${cat.name}": ${cat.image_url.slice(0, 70)}...`);

    if (isDryRun) {
      console.log(" [DRY RUN]");
      stats.total++;
      stats.dryRun++;
      continue;
    }

    try {
      const newUrl = await downloadAndSave(cat.image_url);
      await Category.updateOne({ _id: cat._id }, { $set: { image_url: newUrl } });
      console.log(` → ${newUrl}`);
      stats.total++;
      stats.success++;
    } catch (err) {
      console.log(" FAILED");
      logError(`Category ${cat._id} ${cat.image_url}: ${err.message}`);
      stats.total++;
      stats.errors++;
    }
  }
}

async function migrateSettings(stats) {
  // Settings may have banner images
  const settingsDocs = await Settings.find({}).lean();
  for (const doc of settingsDocs) {
    if (stats.total >= LIMIT) break;
    const banners = doc.banners || [];
    let changed = false;
    const updatedBanners = [];

    for (const banner of banners) {
      if (isCloudinaryUrl(banner.image)) {
        process.stdout.write(`  ↓ Banner: ${banner.image?.slice(0, 70)}...`);

        if (isDryRun) {
          console.log(" [DRY RUN]");
          updatedBanners.push(banner);
          stats.total++;
          stats.dryRun++;
          continue;
        }

        try {
          const newUrl = await downloadAndSave(banner.image);
          updatedBanners.push({ ...banner, image: newUrl });
          console.log(` → ${newUrl}`);
          stats.total++;
          stats.success++;
          changed = true;
        } catch (err) {
          console.log(" FAILED");
          logError(`Settings banner ${banner.image}: ${err.message}`);
          updatedBanners.push(banner);
          stats.total++;
          stats.errors++;
        }
      } else {
        updatedBanners.push(banner);
      }
    }

    if (changed && !isDryRun) {
      await Settings.updateOne({ _id: doc._id }, { $set: { banners: updatedBanners } });
    }
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🚀  THELAGARI — Cloudinary → VPS Image Migration");
  console.log("═══════════════════════════════════════════════════════════");
  if (isDryRun) console.log("⚠️  DRY RUN MODE — no files will be written, no DB will be updated");
  if (LIMIT !== Infinity) console.log(`⚠️  LIMIT: will migrate at most ${LIMIT} images`);
  console.log(`📁 Upload directory: ${UPLOADS_DIR}`);
  console.log(`📋 Error log:        ${ERROR_LOG}`);
  console.log("");

  // Ensure uploads dir exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log("✅ Created uploads directory");
  }

  // Connect to MongoDB
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected\n");

  const stats = { total: 0, success: 0, errors: 0, dryRun: 0 };
  const startTime = Date.now();

  await migrateProducts(stats);
  await sleep(DELAY_MS);
  await migrateCategories(stats);
  await sleep(DELAY_MS);
  await migrateSettings(stats);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✨  Migration Complete");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Total processed : ${stats.total}`);
  console.log(`Success         : ${stats.success}`);
  console.log(`Errors          : ${stats.errors}`);
  if (isDryRun) console.log(`Would migrate   : ${stats.dryRun}`);
  console.log(`Time elapsed    : ${elapsed}s`);
  if (stats.errors > 0) {
    console.log(`\n⚠️  ${stats.errors} error(s) logged to: ${ERROR_LOG}`);
  }
  console.log("");

  await mongoose.disconnect();
  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  mongoose.disconnect();
  process.exit(1);
});
