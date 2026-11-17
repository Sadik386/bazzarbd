import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db/postgres.js";
import { initPostgresTables } from "../db/initDb.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = fs.existsSync(path.join(__dirname, "../.env"))
  ? path.join(__dirname, "../.env")
  : path.join(__dirname, "../../.env");
dotenv.config({ path: envPath });

function sanitizeDoc(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === "object") {
    if (val._bsontype === "ObjectID" || (val.constructor && val.constructor.name === "ObjectId")) {
      return val.toString();
    }
    if (val instanceof Date) {
      return val.toISOString();
    }
    if (Array.isArray(val)) {
      return val.map(sanitizeDoc);
    }
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === "__v") continue;
      clean[k] = sanitizeDoc(v);
    }
    return clean;
  }
  return val;
}

export async function migrateMongoToPg() {
  console.log("🚀 Starting MongoDB to PostgreSQL Migration...");
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI not found in environment.");
  }

  // Ensure tables exist
  await initPostgresTables();

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB Atlas.");

  const db = mongoose.connection.db;

  const collections = [
    { name: "categories", table: "categories" },
    { name: "users", table: "users" },
    { name: "products", table: "products" },
    { name: "orders", table: "orders" },
    { name: "carts", table: "carts" },
    { name: "coupons", table: "coupons" },
    { name: "reviews", table: "reviews" },
    { name: "questions", table: "questions" },
    { name: "settings", table: "settings" },
    { name: "sizecharts", table: "sizecharts" },
    { name: "supporttickets", table: "supporttickets" },
    { name: "jobs", table: "jobs" },
    { name: "notifications", table: "notifications" },
    { name: "auditlogs", table: "auditlogs" },
    { name: "visits", table: "visits" },
  ];

  for (const { name, table } of collections) {
    const mongoDocs = await db.collection(name).find({}).toArray();
    console.log(`\n📦 Migrating ${name} (${mongoDocs.length} documents)...`);

    let count = 0;
    for (const rawDoc of mongoDocs) {
      const doc = sanitizeDoc(rawDoc);
      const id = doc._id ? doc._id.toString() : doc.id;
      const createdAt = doc.createdAt ? new Date(doc.createdAt) : new Date();
      const updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : new Date();

      if (table === "categories") {
        await pool.query(
          `INSERT INTO categories (_id, name, slug, description, image_url, sequence, parent_id, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (_id) DO UPDATE SET
             name = EXCLUDED.name,
             slug = EXCLUDED.slug,
             description = EXCLUDED.description,
             image_url = EXCLUDED.image_url,
             sequence = EXCLUDED.sequence,
             parent_id = EXCLUDED.parent_id,
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.name || "Untitled",
            doc.slug || id,
            doc.description || null,
            doc.image_url || null,
            doc.sequence ?? 0,
            doc.parent_id ? doc.parent_id.toString() : null,
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "users") {
        await pool.query(
          `INSERT INTO users (_id, email, password, display_name, role, refresh_tokens, reset_password_token, reset_password_expires, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (_id) DO UPDATE SET
             email = EXCLUDED.email,
             password = EXCLUDED.password,
             display_name = EXCLUDED.display_name,
             role = EXCLUDED.role,
             refresh_tokens = EXCLUDED.refresh_tokens,
             reset_password_token = EXCLUDED.reset_password_token,
             reset_password_expires = EXCLUDED.reset_password_expires,
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            (doc.email || "").toLowerCase(),
            doc.password || "",
            doc.display_name || null,
            doc.role || "USER",
            JSON.stringify(doc.refreshTokens || []),
            doc.resetPasswordToken || null,
            doc.resetPasswordExpires ? new Date(doc.resetPasswordExpires) : null,
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "products") {
        await pool.query(
          `INSERT INTO products (
            _id, category_id, name, slug, base_price, traditional_price,
            short_description, long_description, name_bn, short_description_bn, long_description_bn,
            highlights, seo, social_copy, tech_specs, is_featured, is_recommended,
            rating_override, review_count_override, activity, product_variants, product_images,
            size_chart_id, doc, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
          ) ON CONFLICT (_id) DO UPDATE SET
            category_id = EXCLUDED.category_id,
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            base_price = EXCLUDED.base_price,
            traditional_price = EXCLUDED.traditional_price,
            short_description = EXCLUDED.short_description,
            long_description = EXCLUDED.long_description,
            name_bn = EXCLUDED.name_bn,
            short_description_bn = EXCLUDED.short_description_bn,
            long_description_bn = EXCLUDED.long_description_bn,
            highlights = EXCLUDED.highlights,
            seo = EXCLUDED.seo,
            social_copy = EXCLUDED.social_copy,
            tech_specs = EXCLUDED.tech_specs,
            is_featured = EXCLUDED.is_featured,
            is_recommended = EXCLUDED.is_recommended,
            rating_override = EXCLUDED.rating_override,
            review_count_override = EXCLUDED.review_count_override,
            activity = EXCLUDED.activity,
            product_variants = EXCLUDED.product_variants,
            product_images = EXCLUDED.product_images,
            size_chart_id = EXCLUDED.size_chart_id,
            doc = EXCLUDED.doc,
            updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.category_id ? doc.category_id.toString() : null,
            doc.name || "Untitled Product",
            doc.slug || id,
            Number(doc.base_price) || 0,
            doc.traditional_price ? Number(doc.traditional_price) : null,
            doc.short_description || null,
            doc.long_description || null,
            doc.name_bn || null,
            doc.short_description_bn || null,
            doc.long_description_bn || null,
            JSON.stringify(doc.highlights || []),
            JSON.stringify(doc.seo || {}),
            JSON.stringify(doc.social_copy || {}),
            JSON.stringify(doc.tech_specs || {}),
            Boolean(doc.is_featured),
            Boolean(doc.is_recommended),
            doc.rating_override != null ? Number(doc.rating_override) : null,
            doc.review_count_override != null ? Number(doc.review_count_override) : null,
            JSON.stringify(doc.activity || []),
            JSON.stringify(doc.product_variants || []),
            JSON.stringify(doc.product_images || []),
            doc.size_chart_id ? doc.size_chart_id.toString() : null,
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "orders") {
        await pool.query(
          `INSERT INTO orders (
            _id, user_id, guest_email, status, total_amount, discount_amount, shipping_cost,
            delivery_method, coupon_code, shipping_address, phone_number, order_items,
            payment_method, courier_name, tracking_id, doc, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
          ) ON CONFLICT (_id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            guest_email = EXCLUDED.guest_email,
            status = EXCLUDED.status,
            total_amount = EXCLUDED.total_amount,
            discount_amount = EXCLUDED.discount_amount,
            shipping_cost = EXCLUDED.shipping_cost,
            delivery_method = EXCLUDED.delivery_method,
            coupon_code = EXCLUDED.coupon_code,
            shipping_address = EXCLUDED.shipping_address,
            phone_number = EXCLUDED.phone_number,
            order_items = EXCLUDED.order_items,
            payment_method = EXCLUDED.payment_method,
            courier_name = EXCLUDED.courier_name,
            tracking_id = EXCLUDED.tracking_id,
            doc = EXCLUDED.doc,
            updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.user_id ? doc.user_id.toString() : null,
            doc.guest_email || null,
            doc.status || "pending",
            Number(doc.total_amount) || 0,
            Number(doc.discount_amount) || 0,
            Number(doc.shipping_cost) || 0,
            doc.delivery_method || "Standard",
            doc.coupon_code || null,
            JSON.stringify(doc.shipping_address || {}),
            doc.phone_number || "",
            JSON.stringify(doc.order_items || []),
            doc.payment_method || "cash_on_delivery",
            doc.courier_name || null,
            doc.tracking_id || null,
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "carts") {
        await pool.query(
          `INSERT INTO carts (_id, user_id, items, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (_id) DO UPDATE SET
             user_id = EXCLUDED.user_id,
             items = EXCLUDED.items,
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.user_id ? doc.user_id.toString() : id,
            JSON.stringify(doc.items || []),
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "coupons") {
        await pool.query(
          `INSERT INTO coupons (_id, code, discount_type, discount_value, min_purchase, usage_limit, used_count, expiry_date, is_active, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (_id) DO UPDATE SET
             code = EXCLUDED.code,
             discount_type = EXCLUDED.discount_type,
             discount_value = EXCLUDED.discount_value,
             min_purchase = EXCLUDED.min_purchase,
             usage_limit = EXCLUDED.usage_limit,
             used_count = EXCLUDED.used_count,
             expiry_date = EXCLUDED.expiry_date,
             is_active = EXCLUDED.is_active,
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            (doc.code || "").toUpperCase(),
            doc.discount_type || "fixed",
            Number(doc.discount_value) || 0,
            Number(doc.min_purchase) || 0,
            doc.usage_limit != null ? Number(doc.usage_limit) : null,
            Number(doc.used_count) || 0,
            doc.expiry_date ? new Date(doc.expiry_date) : new Date(Date.now() + 30 * 86400000),
            Boolean(doc.is_active ?? true),
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "reviews") {
        await pool.query(
          `INSERT INTO reviews (_id, product_id, user_id, user_name, rating, comment, is_moderated, is_verified_purchase, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (_id) DO UPDATE SET
             product_id = EXCLUDED.product_id,
             user_id = EXCLUDED.user_id,
             user_name = EXCLUDED.user_name,
             rating = EXCLUDED.rating,
             comment = EXCLUDED.comment,
             is_moderated = EXCLUDED.is_moderated,
             is_verified_purchase = EXCLUDED.is_verified_purchase,
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.product_id ? doc.product_id.toString() : "",
            doc.user_id ? doc.user_id.toString() : "",
            doc.user_name || "Anonymous",
            Number(doc.rating) || 5,
            doc.comment || "",
            Boolean(doc.is_moderated),
            Boolean(doc.is_verified_purchase),
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "questions") {
        await pool.query(
          `INSERT INTO questions (_id, product_id, user_id, user_name, question, answer, is_answered, is_moderated, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (_id) DO UPDATE SET
             product_id = EXCLUDED.product_id,
             user_id = EXCLUDED.user_id,
             user_name = EXCLUDED.user_name,
             question = EXCLUDED.question,
             answer = EXCLUDED.answer,
             is_answered = EXCLUDED.is_answered,
             is_moderated = EXCLUDED.is_moderated,
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.product_id ? doc.product_id.toString() : "",
            doc.user_id ? doc.user_id.toString() : "",
            doc.user_name || "Anonymous",
            doc.question || "",
            doc.answer || "",
            Boolean(doc.is_answered),
            Boolean(doc.is_moderated),
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "settings") {
        await pool.query(
          `INSERT INTO settings (_id, key, value, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (key) DO UPDATE SET
             value = EXCLUDED.value,
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.key || id,
            JSON.stringify(doc.value ?? {}),
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "sizecharts") {
        await pool.query(
          `INSERT INTO sizecharts (_id, name, columns, rows, deviation_note, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (_id) DO UPDATE SET
             name = EXCLUDED.name,
             columns = EXCLUDED.columns,
             rows = EXCLUDED.rows,
             deviation_note = EXCLUDED.deviation_note,
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.name || "Default Size Chart",
            JSON.stringify(doc.columns || []),
            JSON.stringify(doc.rows || []),
            doc.deviation_note || "Expected Deviation < 3%",
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "supporttickets") {
        await pool.query(
          `INSERT INTO supporttickets (_id, name, email, subject, message, status, replies, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (_id) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             subject = EXCLUDED.subject,
             message = EXCLUDED.message,
             status = EXCLUDED.status,
             replies = EXCLUDED.replies,
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.name || "Customer",
            doc.email || "",
            doc.subject || "No Subject",
            doc.message || "",
            doc.status || "open",
            JSON.stringify(doc.replies || []),
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "jobs") {
        await pool.query(
          `INSERT INTO jobs (_id, title, department, location, type, description, requirements, salary_range, is_active, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (_id) DO UPDATE SET
             title = EXCLUDED.title,
             department = EXCLUDED.department,
             location = EXCLUDED.location,
             type = EXCLUDED.type,
             description = EXCLUDED.description,
             requirements = EXCLUDED.requirements,
             salary_range = EXCLUDED.salary_range,
             is_active = EXCLUDED.is_active,
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.title || "",
            doc.department || "",
            doc.location || "",
            doc.type || "",
            doc.description || "",
            doc.requirements || "",
            doc.salaryRange || null,
            Boolean(doc.is_active ?? true),
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "notifications") {
        await pool.query(
          `INSERT INTO notifications (_id, user_id, title, message, type, is_read, link, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (_id) DO UPDATE SET
             user_id = EXCLUDED.user_id,
             title = EXCLUDED.title,
             message = EXCLUDED.message,
             type = EXCLUDED.type,
             is_read = EXCLUDED.is_read,
             link = EXCLUDED.link,
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.user_id ? doc.user_id.toString() : "",
            doc.title || "",
            doc.message || "",
            doc.type || "system",
            Boolean(doc.is_read),
            doc.link || null,
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "auditlogs") {
        await pool.query(
          `INSERT INTO auditlogs (_id, admin_id, admin_email, action, details, target_id, ip_address, user_agent, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (_id) DO UPDATE SET
             admin_id = EXCLUDED.admin_id,
             admin_email = EXCLUDED.admin_email,
             action = EXCLUDED.action,
             details = EXCLUDED.details,
             target_id = EXCLUDED.target_id,
             ip_address = EXCLUDED.ip_address,
             user_agent = EXCLUDED.user_agent,
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.admin_id ? doc.admin_id.toString() : "",
            doc.admin_email || "",
            doc.action || "",
            JSON.stringify(doc.details || {}),
            doc.target_id || null,
            doc.ip_address || null,
            doc.user_agent || null,
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      } else if (table === "visits") {
        await pool.query(
          `INSERT INTO visits (_id, ip_address, date, doc, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (ip_address, date) DO UPDATE SET
             doc = EXCLUDED.doc,
             updated_at = EXCLUDED.updated_at`,
          [
            id,
            doc.ip_address || "127.0.0.1",
            doc.date || new Date().toISOString().slice(0, 10),
            JSON.stringify(doc),
            createdAt,
            updatedAt,
          ]
        );
      }
      count++;
    }
    console.log(`✅ Migrated ${count} records into ${table}.`);
  }

  console.log("\n================ VERIFYING COUNTS ================");
  for (const { name, table } of collections) {
    const mongoCount = await db.collection(name).countDocuments();
    const pgRes = await pool.query(`SELECT count(*)::int as count FROM ${table}`);
    const pgCount = pgRes.rows[0].count;
    console.log(`- ${table}: Mongo = ${mongoCount}, Postgres = ${pgCount}`);
  }

  await mongoose.disconnect();
  console.log("🎉 Data migration from MongoDB to PostgreSQL completed successfully!");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateMongoToPg()
    .then(() => pool.end())
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}