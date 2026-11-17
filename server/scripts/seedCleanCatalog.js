import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = fs.existsSync(path.join(__dirname, "../.env"))
  ? path.join(__dirname, "../.env")
  : path.join(__dirname, "../../.env");
dotenv.config({ path: envPath });

import connectDB from "../db.js";
import pool, { initPgVector } from "../db/postgres.js";
import Category from "../models/Category.js";
import Coupon from "../models/Coupon.js";
import Job from "../models/Job.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Question from "../models/Question.js";
import Review from "../models/Review.js";
import Settings from "../models/Settings.js";
import SizeChart from "../models/SizeChart.js";
import SupportTicket from "../models/SupportTicket.js";
import User from "../models/User.js";
import { upsertProductEmbeddingsBatch } from "../services/embeddingService.js";

const TEST_EMAIL_PATTERNS = [
  "live_pg_user@example.com",
  "test@example.com",
];

async function run() {
  console.log("🧹 Connecting to PostgreSQL...");
  await connectDB();
  await initPgVector();

  // 1. Wipe garbage & legacy test data
  console.log("🗑️  Removing old test/garbage rows...");
  await Promise.all([
    pool.query("DELETE FROM product_embeddings"),
    pool.query("DELETE FROM reviews"),
    pool.query("DELETE FROM questions"),
    pool.query("DELETE FROM supporttickets"),
    pool.query("DELETE FROM jobs"),
    pool.query("DELETE FROM orders"),
    pool.query("DELETE FROM coupons"),
    pool.query("DELETE FROM products"),
    pool.query("DELETE FROM categories"),
    pool.query("DELETE FROM sizecharts"),
    pool.query("DELETE FROM carts"),
    pool.query("DELETE FROM notifications"),
    pool.query("DELETE FROM auditlogs"),
    pool.query("DELETE FROM visits"),
  ]);

  await pool.query(
    `DELETE FROM users
     WHERE email = ANY($1::text[])
        OR email LIKE 'test_pg_%'
        OR email LIKE 'testuser_%'
        OR email LIKE 'tester_%'`,
    [TEST_EMAIL_PATTERNS]
  );

  // Ensure a clean sample shopper exists alongside preserved real accounts
  let sampleCustomer = await User.findOne({ email: "nadia.rahman@bazzarbd.com" });
  if (!sampleCustomer) {
    sampleCustomer = await User.create({
      email: "nadia.rahman@bazzarbd.com",
      password: "Shopper@2026",
      display_name: "Nadia Rahman",
      role: "USER",
    });
  }

  let sampleCustomer2 = await User.findOne({ email: "tariq.mahmud@bazzarbd.com" });
  if (!sampleCustomer2) {
    sampleCustomer2 = await User.create({
      email: "tariq.mahmud@bazzarbd.com",
      password: "Shopper@2026",
      display_name: "Tariq Mahmud",
      role: "USER",
    });
  }

  // 2. Seed real Categories & Subcategories
  console.log("🗂️  Seeding BazzarBD categories...");
  const catTees = await Category.create({
    name: "T-Shirts",
    slug: "t-shirts",
    description: "Long-staple combed Bengal cotton tees knit for Dhaka humidity.",
    image_url: "/images/cat-tshirts.webp",
    sequence: 0,
  });

  const catOversizedTees = await Category.create({
    name: "Oversized Tees",
    slug: "oversized-tees",
    description: "Relaxed drop-shoulder 220 GSM jersey silhouettes.",
    image_url: "/images/cat-tshirts.webp",
    sequence: 1,
    parent_id: catTees._id,
  });

  const catHoodies = await Category.create({
    name: "Hoodies & Sweatshirts",
    slug: "hoodies",
    description: "Brushed French terry fleece hoodies and crewnecks.",
    image_url: "/images/cat-hoodies.webp",
    sequence: 2,
  });

  const catShirts = await Category.create({
    name: "Shirts & Linen",
    slug: "shirts",
    description: "Breathable linen and Oxford weaves tailored for everyday polish.",
    image_url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80",
    sequence: 3,
  });

  const catPants = await Category.create({
    name: "Pants & Chinos",
    slug: "pants",
    description: "Tailored cotton twill chinos and selvedge denim.",
    image_url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80",
    sequence: 4,
  });

  const catCargo = await Category.create({
    name: "Cargo & Joggers",
    slug: "cargo-joggers",
    description: "Tapered utility joggers and everyday travel trousers.",
    image_url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=80",
    sequence: 5,
    parent_id: catPants._id,
  });

  const catJackets = await Category.create({
    name: "Jackets & Outerwear",
    slug: "jackets",
    description: "Weather-resistant shells, chore coats, and tailored layers.",
    image_url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80",
    sequence: 6,
  });

  const catAccessories = await Category.create({
    name: "Everyday Carry",
    slug: "accessories",
    description: "Canvas packs and vegetable-tanned leather goods.",
    image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    sequence: 7,
  });

  // 3. Seed Size Charts
  console.log("📏 Seeding Size Charts...");
  const teeChart = await SizeChart.create({
    name: "Combed Cotton Tees",
    columns: ["Size", "Chest (Round)", "Length", "Shoulder"],
    deviation_note: "Pre-shrunk enzyme-washed jersey · Expected tolerance < 2%",
    rows: [
      { size: "S", values_inch: ["38", "26.5", "17.5"], values_cm: ["96.5", "67.3", "44.5"] },
      { size: "M", values_inch: ["40", "27.5", "18.2"], values_cm: ["101.6", "69.8", "46.2"] },
      { size: "L", values_inch: ["42", "28.5", "19.0"], values_cm: ["106.7", "72.4", "48.3"] },
      { size: "XL", values_inch: ["44", "29.5", "19.8"], values_cm: ["111.8", "74.9", "50.3"] },
    ],
  });

  const hoodieChart = await SizeChart.create({
    name: "Heavyweight Hoodies & Outerwear",
    columns: ["Size", "Chest (Round)", "Length", "Sleeve"],
    deviation_note: "Relaxed studio cut · Expected tolerance < 3%",
    rows: [
      { size: "S", values_inch: ["41", "26.5", "24.0"], values_cm: ["104.1", "67.3", "61.0"] },
      { size: "M", values_inch: ["43", "27.5", "24.8"], values_cm: ["109.2", "69.8", "63.0"] },
      { size: "L", values_inch: ["45", "28.5", "25.5"], values_cm: ["114.3", "72.4", "64.8"] },
      { size: "XL", values_inch: ["48", "29.5", "26.2"], values_cm: ["121.9", "74.9", "66.5"] },
    ],
  });

  const shirtChart = await SizeChart.create({
    name: "Tailored Linen & Oxford Shirts",
    columns: ["Size", "Chest", "Length", "Collar"],
    deviation_note: "Measured flat across chest · Expected tolerance < 2%",
    rows: [
      { size: "S", values_inch: ["39", "28.0", "15.0"], values_cm: ["99.1", "71.1", "38.1"] },
      { size: "M", values_inch: ["41", "29.0", "15.5"], values_cm: ["104.1", "73.7", "39.4"] },
      { size: "L", values_inch: ["43", "30.0", "16.0"], values_cm: ["109.2", "76.2", "40.6"] },
      { size: "XL", values_inch: ["45", "30.8", "16.5"], values_cm: ["114.3", "78.2", "41.9"] },
    ],
  });

  const pantChart = await SizeChart.create({
    name: "Chinos & Utility Pants",
    columns: ["Size", "Waist", "Outseam", "Thigh"],
    deviation_note: "Mid-rise tapered cut · Expected tolerance < 2%",
    rows: [
      { size: "30", values_inch: ["30", "39.5", "23.5"], values_cm: ["76.2", "100.3", "59.7"] },
      { size: "32", values_inch: ["32", "40.0", "24.5"], values_cm: ["81.3", "101.6", "62.2"] },
      { size: "34", values_inch: ["34", "40.5", "25.5"], values_cm: ["86.4", "102.9", "64.8"] },
      { size: "36", values_inch: ["36", "41.0", "26.5"], values_cm: ["91.4", "104.1", "67.3"] },
    ],
  });

  // 4. Seed 17 Curated Real Products (BDT pricing, bilingual EN/BN, verified 200 images)
  console.log("👕 Seeding 17 curated BazzarBD products...");
  const catalogSeed = [
    {
      name: "Dhaka Combed Cotton Crew Tee — Chalk",
      name_bn: "ঢাকা কম্বড কটন ক্রু টি-শার্ট — চক হোয়াইট",
      slug: "dhaka-combed-cotton-crew-tee-chalk",
      category_id: catTees._id,
      size_chart_id: teeChart._id,
      base_price: 1150,
      traditional_price: 1350,
      is_featured: true,
      is_recommended: true,
      short_description: "190 GSM single-jersey combed Bengal cotton knit for warm city days.",
      short_description_bn: "ঢাকার আবহাওয়ার জন্য ১৯০ জিএসএম প্রিমিয়াম কম্বড কটন টি-শার্ট।",
      long_description:
        "Milled in Gazipur from long-staple combed cotton and enzyme-washed for a clean matte handfeel. Features a reinforced 1x1 rib collar that holds its shape wash after wash.",
      long_description_bn:
        "গাজীপুরের মিলে তৈরি দীর্ঘ-আঁশের কম্বড সুতায় বোনা এবং এনজাইম ওয়াশ করা, যা গরমেও আরামদায়ক ও টেকসই থাকে।",
      highlights: [
        "100% long-staple combed Bengal cotton (190 GSM)",
        "Pre-shrunk and enzyme-washed for minimal shrinkage",
        "Twin-needle hem and non-sag ribbed crew neck",
      ],
      tech_specs: {
        Fabric: "100% Combed Cotton",
        Weight: "190 GSM",
        Fit: "Tailored Regular",
        Care: "Machine wash cold, dry in shade",
        Origin: "Gazipur, Bangladesh",
      },
      activity: ["Everyday", "Casual"],
      product_images: [
        { url: "/images/cat-tshirts.webp", alt_text: "Folded combed cotton tees", display_order: 0 },
        { url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80", alt_text: "Chalk white cotton crew tee", display_order: 1 },
      ],
      product_variants: [
        { variant_name: "S", price_modifier: 0, sku: "BBD-TEE-CHK-S", stock_level: 18 },
        { variant_name: "M", price_modifier: 0, sku: "BBD-TEE-CHK-M", stock_level: 28 },
        { variant_name: "L", price_modifier: 0, sku: "BBD-TEE-CHK-L", stock_level: 22 },
        { variant_name: "XL", price_modifier: 50, sku: "BBD-TEE-CHK-XL", stock_level: 12 },
      ],
    },
    {
      name: "Botanical Olive Heavyweight Tee",
      name_bn: "বোটানিক্যাল অলিভ হেভিওয়েট টি-শার্ট",
      slug: "botanical-olive-heavyweight-tee",
      category_id: catOversizedTees._id,
      size_chart_id: teeChart._id,
      base_price: 1290,
      traditional_price: 1490,
      is_featured: true,
      is_recommended: true,
      short_description: "Structured 220 GSM reactive-dyed cotton jersey in deep botanical moss.",
      short_description_bn: "২২০ জিএসএম রিয়্যাক্টিভ ডাই করা বোটানিক্যাল অলিভ রিল্যাক্সড টি-শার্ট।",
      long_description:
        "Cut with slightly dropped shoulders and breathable open weave structure so heavier cotton stays cool even in peak summer humidity.",
      highlights: [
        "220 GSM compact-spun organic cotton",
        "Colorfast reactive dye in deep moss olive",
        "Drop-shoulder boxy drape",
      ],
      tech_specs: {
        Fabric: "100% Compact Combed Cotton",
        Weight: "220 GSM",
        Fit: "Relaxed Boxy",
        Care: "Wash cold inside out",
        Origin: "Dhaka, Bangladesh",
      },
      activity: ["Streetwear", "Everyday"],
      product_images: [
        { url: "/images/hero.webp", alt_text: "Olive tee studio styling", display_order: 0 },
        { url: "/images/cat-tshirts.webp", alt_text: "Olive folded stack", display_order: 1 },
      ],
      product_variants: [
        { variant_name: "S", price_modifier: 0, sku: "BBD-TEE-OLV-S", stock_level: 9 },
        { variant_name: "M", price_modifier: 0, sku: "BBD-TEE-OLV-M", stock_level: 4 },
        { variant_name: "L", price_modifier: 0, sku: "BBD-TEE-OLV-L", stock_level: 14 },
        { variant_name: "XL", price_modifier: 0, sku: "BBD-TEE-OLV-XL", stock_level: 8 },
      ],
    },
    {
      name: "Sumi Charcoal Relaxed Tee",
      name_bn: "সুমি চারকোল রিল্যাক্সড টি-শার্ট",
      slug: "sumi-charcoal-relaxed-tee",
      category_id: catTees._id,
      size_chart_id: teeChart._id,
      base_price: 1190,
      traditional_price: null,
      is_featured: false,
      is_recommended: true,
      short_description: "Deep charcoal heather cotton jersey with clean matte finish.",
      long_description:
        "A versatile daily wardrobe anchor woven with dual-tone charcoal yarns that pair effortlessly with denim, sand chinos, or tailored overshirts.",
      highlights: [
        "200 GSM breathable ring-spun jersey",
        "Soft peached exterior texture",
        "Tagless neck print for zero irritation",
      ],
      tech_specs: {
        Fabric: "100% Ring-Spun Cotton",
        Weight: "200 GSM",
        Fit: "Regular",
        Origin: "Narayanganj, Bangladesh",
      },
      activity: ["Casual", "Everyday"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=80", alt_text: "Charcoal cotton tee", display_order: 0 },
        { url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80", alt_text: "Dark minimal tee", display_order: 1 },
      ],
      product_variants: [
        { variant_name: "S", price_modifier: 0, sku: "BBD-TEE-CHR-S", stock_level: 14 },
        { variant_name: "M", price_modifier: 0, sku: "BBD-TEE-CHR-M", stock_level: 20 },
        { variant_name: "L", price_modifier: 0, sku: "BBD-TEE-CHR-L", stock_level: 16 },
        { variant_name: "XL", price_modifier: 0, sku: "BBD-TEE-CHR-XL", stock_level: 10 },
      ],
    },
    {
      name: "Drop-Shoulder Raw Linen Tee",
      name_bn: "ড্রপ-শোল্ডার র লিনেন টি-শার্ট",
      slug: "drop-shoulder-raw-linen-tee",
      category_id: catOversizedTees._id,
      size_chart_id: teeChart._id,
      base_price: 1450,
      traditional_price: 1650,
      is_featured: false,
      is_recommended: true,
      short_description: "Airy cotton-linen slub knit in natural undyed stone.",
      long_description:
        "Blends 70% combed cotton with 30% European flax linen for natural slub texture and rapid airflow during humid Dhaka afternoons.",
      highlights: [
        "70% Cotton / 30% Flax Linen slub knit",
        "Undyed natural stone finish",
        "Side-split hem for crisp layering",
      ],
      tech_specs: {
        Fabric: "70% Cotton, 30% Linen",
        Weight: "185 GSM",
        Fit: "Oversized",
        Origin: "Dhaka, Bangladesh",
      },
      activity: ["Casual", "Smart Casual"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80", alt_text: "Textured knit top", display_order: 0 },
      ],
      product_variants: [
        { variant_name: "M", price_modifier: 0, sku: "BBD-LIN-TEE-M", stock_level: 12 },
        { variant_name: "L", price_modifier: 0, sku: "BBD-LIN-TEE-L", stock_level: 15 },
        { variant_name: "XL", price_modifier: 50, sku: "BBD-LIN-TEE-XL", stock_level: 6 },
      ],
    },
    {
      name: "420 GSM French Terry Hoodie — Charcoal",
      name_bn: "৪২০ জিএসএম ফ্রেঞ্চ টেরি হুডি — চারকোল",
      slug: "french-terry-hoodie-charcoal",
      category_id: catHoodies._id,
      size_chart_id: hoodieChart._id,
      base_price: 2950,
      traditional_price: 3400,
      is_featured: true,
      is_recommended: true,
      short_description: "Heavyweight brushed-loop fleece with double-lined hood and matte metal aglets.",
      short_description_bn: "ডাবল-লাইন্ড হুড ও ৪২০ জিএসএম প্রিমিয়াম ফ্রেঞ্চ টেরি ফ্লিস হুডি।",
      long_description:
        "Built for cool winter evenings and studio air-conditioning. Constructed from 420 GSM 100% cotton French terry with dense 2x2 ribbed cuffs and antique gunmetal hardware.",
      highlights: [
        "420 GSM loop-back French terry cotton",
        "Double-layered structured hood with no-twist cord",
        "Reinforced kangaroo pocket bartacks",
      ],
      tech_specs: {
        Fabric: "100% Cotton French Terry",
        Weight: "420 GSM",
        Fit: "Architectural Relaxed",
        Origin: "Gazipur, Bangladesh",
      },
      activity: ["Streetwear", "Travel"],
      product_images: [
        { url: "/images/cat-hoodies.webp", alt_text: "Heavyweight charcoal hoodie detail", display_order: 0 },
        { url: "/images/hero_male.webp", alt_text: "Charcoal hoodie styled outdoors", display_order: 1 },
      ],
      product_variants: [
        { variant_name: "S", price_modifier: 0, sku: "BBD-HD-CHR-S", stock_level: 11 },
        { variant_name: "M", price_modifier: 0, sku: "BBD-HD-CHR-M", stock_level: 16 },
        { variant_name: "L", price_modifier: 0, sku: "BBD-HD-CHR-L", stock_level: 14 },
        { variant_name: "XL", price_modifier: 100, sku: "BBD-HD-CHR-XL", stock_level: 7 },
      ],
    },
    {
      name: "Studio Moss Pullover Hoodie",
      name_bn: "স্টুডিও মস পুলওভার হুডি",
      slug: "studio-moss-pullover-hoodie",
      category_id: catHoodies._id,
      size_chart_id: hoodieChart._id,
      base_price: 2850,
      traditional_price: null,
      is_featured: true,
      is_recommended: false,
      short_description: "Warm brushed-interior cotton fleece in signature BazzarBD forest moss.",
      long_description:
        "Garment-dyed for rich depth of color and soft lived-in comfort right out of the parcel.",
      highlights: [
        "380 GSM brushed cotton fleece",
        "Garment-dyed muted olive-moss tone",
        "Minimal clean front without loud graphics",
      ],
      tech_specs: {
        Fabric: "85% Cotton, 15% Recycled Poly",
        Weight: "380 GSM",
        Fit: "Regular Relaxed",
        Origin: "Dhaka, Bangladesh",
      },
      activity: ["Casual", "Loungewear"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80", alt_text: "Studio pullover hoodie", display_order: 0 },
      ],
      product_variants: [
        { variant_name: "M", price_modifier: 0, sku: "BBD-HD-MOS-M", stock_level: 15 },
        { variant_name: "L", price_modifier: 0, sku: "BBD-HD-MOS-L", stock_level: 12 },
        { variant_name: "XL", price_modifier: 0, sku: "BBD-HD-MOS-XL", stock_level: 6 },
      ],
    },
    {
      name: "Oatmeal Fleece Crewneck Sweatshirt",
      name_bn: "ওটমিল ফ্লিস ক্রুনেক সোয়েটশার্ট",
      slug: "oatmeal-fleece-crewneck-sweatshirt",
      category_id: catHoodies._id,
      size_chart_id: hoodieChart._id,
      base_price: 2450,
      traditional_price: 2750,
      is_featured: false,
      is_recommended: true,
      short_description: "Clean-collar French terry crewneck with classic V-gusset stitching.",
      long_description:
        "Layers seamlessly over Oxford shirts or stands alone with tailored chinos for understated smart-casual dressing.",
      highlights: [
        "360 GSM unbrushed French terry",
        "Heritage rib V-insert at collar",
        "Breathable three-season weight",
      ],
      tech_specs: {
        Fabric: "100% Cotton French Terry",
        Weight: "360 GSM",
        Fit: "Tailored",
        Origin: "Gazipur, Bangladesh",
      },
      activity: ["Smart Casual", "Everyday"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80", alt_text: "Crewneck cotton pullover", display_order: 0 },
      ],
      product_variants: [
        { variant_name: "S", price_modifier: 0, sku: "BBD-CRW-OAT-S", stock_level: 8 },
        { variant_name: "M", price_modifier: 0, sku: "BBD-CRW-OAT-M", stock_level: 13 },
        { variant_name: "L", price_modifier: 0, sku: "BBD-CRW-OAT-L", stock_level: 10 },
      ],
    },
    {
      name: "Dhaka Loom Hand-Finished Linen Shirt",
      name_bn: "ঢাকা লুম হ্যান্ড-ফিনিশড লিনেন শার্ট",
      slug: "dhaka-loom-linen-shirt",
      category_id: catShirts._id,
      size_chart_id: shirtChart._id,
      base_price: 2250,
      traditional_price: 2550,
      is_featured: true,
      is_recommended: true,
      short_description: "Pure breathable flax-cotton weave with mother-of-pearl buttons.",
      short_description_bn: "ব্রিদেবল লিনেন ও মাদার-অব-পার্ল বাটনের তৈরি এলিগ্যান্ট শার্ট।",
      long_description:
        "Tailored with a soft unconstructed collar and curved gusseted hem that looks crisp tucked or untucked across workdays and weekend gatherings.",
      highlights: [
        "55% European Flax Linen, 45% Combed Cotton",
        "Genuine shell buttons with lock-stitched shanks",
        "Naturally cooling open plain weave",
      ],
      tech_specs: {
        Fabric: "55% Linen, 45% Cotton",
        Weight: "155 GSM",
        Fit: "Relaxed Tailored",
        Origin: "Dhaka, Bangladesh",
      },
      activity: ["Smart Casual", "Festive"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80", alt_text: "Tailored casual shirt", display_order: 0 },
        { url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80", alt_text: "Button down shirt detail", display_order: 1 },
      ],
      product_variants: [
        { variant_name: "S", price_modifier: 0, sku: "BBD-SH-LIN-S", stock_level: 10 },
        { variant_name: "M", price_modifier: 0, sku: "BBD-SH-LIN-M", stock_level: 3 },
        { variant_name: "L", price_modifier: 0, sku: "BBD-SH-LIN-L", stock_level: 14 },
        { variant_name: "XL", price_modifier: 0, sku: "BBD-SH-LIN-XL", stock_level: 9 },
      ],
    },
    {
      name: "Oxford Button-Down Atelier Shirt",
      name_bn: "অক্সফোর্ড বাটন-ডাউন অ্যাটিলিয়ার শার্ট",
      slug: "oxford-button-down-atelier-shirt",
      category_id: catShirts._id,
      size_chart_id: shirtChart._id,
      base_price: 2150,
      traditional_price: null,
      is_featured: false,
      is_recommended: true,
      short_description: "Basketweave brushed cotton Oxford built for year-round office and weekend wear.",
      long_description:
        "Constructed with single-needle side seams, box-pleat back yoke, and soft collar roll for effortless Dhaka smart-casual versatility.",
      highlights: [
        "100% 2-ply cotton Oxford weave",
        "Soft collar roll with button-down points",
        "Single-needle tailoring throughout",
      ],
      tech_specs: {
        Fabric: "100% Cotton Oxford",
        Weight: "175 GSM",
        Fit: "Tailored",
        Origin: "Savar, Bangladesh",
      },
      activity: ["Smart Casual", "Everyday"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80", alt_text: "Oxford button down shirt", display_order: 0 },
      ],
      product_variants: [
        { variant_name: "M", price_modifier: 0, sku: "BBD-SH-OXF-M", stock_level: 17 },
        { variant_name: "L", price_modifier: 0, sku: "BBD-SH-OXF-L", stock_level: 19 },
        { variant_name: "XL", price_modifier: 0, sku: "BBD-SH-OXF-XL", stock_level: 11 },
      ],
    },
    {
      name: "Bengal Indigo Chambray Overshirt",
      name_bn: "বেঙ্গল ইন্ডিগো শ্যামব্রে ওভারশার্ট",
      slug: "bengal-indigo-chambray-overshirt",
      category_id: catShirts._id,
      size_chart_id: shirtChart._id,
      base_price: 2650,
      traditional_price: 2950,
      is_featured: false,
      is_recommended: false,
      short_description: "Mid-weight indigo-dyed chambray layer with twin chest utility pockets.",
      long_description:
        "Wears effortlessly open over a chalk cotton tee or buttoned up as a structured shirt.",
      highlights: [
        "240 GSM natural indigo chambray",
        "Corozo nut buttons",
        "Dual chest pockets with pen slot",
      ],
      tech_specs: {
        Fabric: "100% Indigo Dyed Cotton",
        Weight: "240 GSM",
        Fit: "Relaxed Layering",
        Origin: "Dhaka, Bangladesh",
      },
      activity: ["Smart Casual", "Travel"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=900&q=80", alt_text: "Curated woven shirts rack", display_order: 0 },
      ],
      product_variants: [
        { variant_name: "M", price_modifier: 0, sku: "BBD-OSH-IND-M", stock_level: 10 },
        { variant_name: "L", price_modifier: 0, sku: "BBD-OSH-IND-L", stock_level: 12 },
      ],
    },
    {
      name: "Tailored Stretch Cotton Chinos — Sand",
      name_bn: "টেইলর্ড স্ট্রেচ কটন চিনোস — স্যান্ড",
      slug: "tailored-stretch-cotton-chinos-sand",
      category_id: catPants._id,
      size_chart_id: pantChart._id,
      base_price: 2350,
      traditional_price: 2650,
      is_featured: true,
      is_recommended: true,
      short_description: "Clean-front tapered cotton twill chinos with 2% comfort elastane.",
      short_description_bn: "আরামদায়ক ফিট ও নিখুঁত টেইলরিং-এ তৈরি স্যান্ড কালার চিনো প্যান্ট।",
      long_description:
        "Peached 260 GSM twill fabric with reinforced pocket bags, YKK brass zip fly, and an interior coin sleeve for daily commute comfort.",
      highlights: [
        "98% Combed Cotton, 2% Elastane peached twill",
        "YKK antique brass zipper & horn button",
        "Clean tapered leg opening",
      ],
      tech_specs: {
        Fabric: "98% Cotton, 2% Elastane",
        Weight: "260 GSM",
        Fit: "Slim Tapered",
        Origin: "Chattogram, Bangladesh",
      },
      activity: ["Smart Casual", "Everyday"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80", alt_text: "Tailored sand chinos", display_order: 0 },
      ],
      product_variants: [
        { variant_name: "30", price_modifier: 0, sku: "BBD-CHN-SND-30", stock_level: 12 },
        { variant_name: "32", price_modifier: 0, sku: "BBD-CHN-SND-32", stock_level: 20 },
        { variant_name: "34", price_modifier: 0, sku: "BBD-CHN-SND-34", stock_level: 16 },
        { variant_name: "36", price_modifier: 0, sku: "BBD-CHN-SND-36", stock_level: 8 },
      ],
    },
    {
      name: "Relaxed Utility Cargo Joggers — Slate",
      name_bn: "রিল্যাক্সড ইউটিলিটি কার্গো জগার্স — স্লেট",
      slug: "relaxed-utility-cargo-joggers-slate",
      category_id: catCargo._id,
      size_chart_id: pantChart._id,
      base_price: 2190,
      traditional_price: 2490,
      is_featured: false,
      is_recommended: true,
      short_description: "Ripstop-cotton tapered joggers with concealed snap bellows pockets.",
      long_description:
        "Built for urban movement with articulated knees, drawstring elastic waistband, and low-profile side cargo pockets.",
      highlights: [
        "Cotton ripstop weave for abrasion resistance",
        "Hidden snap-closure side pockets",
        "Adjustable drawcord waist",
      ],
      tech_specs: {
        Fabric: "100% Cotton Ripstop",
        Weight: "240 GSM",
        Fit: "Tapered Relaxed",
        Origin: "Dhaka, Bangladesh",
      },
      activity: ["Streetwear", "Travel"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=80", alt_text: "Utility trousers", display_order: 0 },
      ],
      product_variants: [
        { variant_name: "30", price_modifier: 0, sku: "BBD-CRG-SLT-30", stock_level: 14 },
        { variant_name: "32", price_modifier: 0, sku: "BBD-CRG-SLT-32", stock_level: 19 },
        { variant_name: "34", price_modifier: 0, sku: "BBD-CRG-SLT-34", stock_level: 11 },
      ],
    },
    {
      name: "Indigo Selvedge Straight Denim",
      name_bn: "ইন্ডিগো সেলভেজ স্ট্রেইট ডেনিম",
      slug: "indigo-selvedge-straight-denim",
      category_id: catPants._id,
      size_chart_id: pantChart._id,
      base_price: 2890,
      traditional_price: null,
      is_featured: false,
      is_recommended: false,
      short_description: "12.5 oz rinsed indigo denim crafted for clean everyday drape.",
      long_description:
        "Pre-rinsed for immediate softness without sacrificing structured leg lines or rich indigo fade potential.",
      highlights: [
        "12.5 oz rope-dyed indigo denim",
        "Copper rivet pocket reinforcements",
        "Classic straight-tapered leg",
      ],
      tech_specs: {
        Fabric: "100% Cotton Denim",
        Weight: "12.5 oz",
        Fit: "Straight",
        Origin: "Narayanganj, Bangladesh",
      },
      activity: ["Casual", "Everyday"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80", alt_text: "Indigo straight denim", display_order: 0 },
      ],
      product_variants: [
        { variant_name: "30", price_modifier: 0, sku: "BBD-DNM-IND-30", stock_level: 10 },
        { variant_name: "32", price_modifier: 0, sku: "BBD-DNM-IND-32", stock_level: 15 },
        { variant_name: "34", price_modifier: 0, sku: "BBD-DNM-IND-34", stock_level: 12 },
      ],
    },
    {
      name: "All-Weather Matte Shell Jacket",
      name_bn: "অল-ওয়েদার ম্যাট শেল জ্যাকেট",
      slug: "all-weather-matte-shell-jacket",
      category_id: catJackets._id,
      size_chart_id: hoodieChart._id,
      base_price: 4650,
      traditional_price: 5200,
      is_featured: true,
      is_recommended: true,
      short_description: "Water-repellent 3-layer matte shell engineered for monsoon commutes and cool nights.",
      short_description_bn: "বৃষ্টি ও শীতল বাতাস প্রতিরোধী ওয়াটার-রেজিস্ট্যান্ট শেল জ্যাকেট।",
      long_description:
        "Seam-taped matte nylon outer shell with breathable mesh lining, storm-flap zip, and concealed zippered travel pockets.",
      highlights: [
        "Water-repellent DWR matte finish",
        "Two-way storm zipper & sealed pockets",
        "Packable structured hood",
      ],
      tech_specs: {
        Fabric: "100% Recycled Matte Nylon",
        Waterproofing: "10,000mm DWR",
        Fit: "Layering Regular",
        Origin: "Gazipur, Bangladesh",
      },
      activity: ["Travel", "Outdoor"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80", alt_text: "Matte weatherproof shell jacket", display_order: 0 },
        { url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80", alt_text: "Structured jacket profile", display_order: 1 },
      ],
      product_variants: [
        { variant_name: "M", price_modifier: 0, sku: "BBD-JKT-SHL-M", stock_level: 7 },
        { variant_name: "L", price_modifier: 0, sku: "BBD-JKT-SHL-L", stock_level: 9 },
        { variant_name: "XL", price_modifier: 150, sku: "BBD-JKT-SHL-XL", stock_level: 4 },
      ],
    },
    {
      name: "Cropped Canvas Chore Jacket — Olive",
      name_bn: "ক্রপড ক্যানভাস চোর জ্যাকেট — অলিভ",
      slug: "cropped-canvas-chore-jacket-olive",
      category_id: catJackets._id,
      size_chart_id: hoodieChart._id,
      base_price: 3850,
      traditional_price: null,
      is_featured: false,
      is_recommended: true,
      short_description: "320 GSM brushed cotton duck canvas workwear jacket in muted moss.",
      long_description:
        "Inspired by classic workshop outerwear with three patch pockets, corozo buttons, and triple-stitched shoulder seams.",
      highlights: [
        "320 GSM heavy cotton duck canvas",
        "Three exterior patch pockets + interior pocket",
        "Garment-washed for flexible comfort",
      ],
      tech_specs: {
        Fabric: "100% Cotton Duck Canvas",
        Weight: "320 GSM",
        Fit: "Slightly Cropped",
        Origin: "Dhaka, Bangladesh",
      },
      activity: ["Smart Casual", "Streetwear"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80", alt_text: "Curated canvas outerwear", display_order: 0 },
      ],
      product_variants: [
        { variant_name: "M", price_modifier: 0, sku: "BBD-JKT-CHR-M", stock_level: 8 },
        { variant_name: "L", price_modifier: 0, sku: "BBD-JKT-CHR-L", stock_level: 11 },
      ],
    },
    {
      name: "Waxed Canvas Weekend Backpack",
      name_bn: "ওয়াক্সড ক্যানভাস উইকেন্ড ব্যাকপ্যাক",
      slug: "waxed-canvas-weekend-backpack",
      category_id: catAccessories._id,
      size_chart_id: null,
      base_price: 3250,
      traditional_price: 3600,
      is_featured: true,
      is_recommended: true,
      short_description: "18L water-resistant waxed cotton canvas pack with padded 16-inch laptop sleeve.",
      short_description_bn: "১৬-ইঞ্চি ল্যাপটপ স্লিভসহ ওয়াটার-রেজিস্ট্যান্ট ওয়াক্সড ক্যানভাস ব্যাকপ্যাক।",
      long_description:
        "Designed for daily studio commutes and short weekend trips with vegetable-tanned leather trim and antique brass buckles.",
      highlights: [
        "16 oz waxed cotton canvas exterior",
        "Padded 16-inch laptop compartment",
        "Vegetable-tanned leather carry handle",
      ],
      tech_specs: {
        Capacity: "18 Liters",
        Material: "Waxed Canvas & Full-Grain Leather",
        Dimensions: "44cm × 30cm × 14cm",
        Origin: "Dhaka, Bangladesh",
      },
      activity: ["Travel", "Everyday"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80", alt_text: "Minimal canvas backpack", display_order: 0 },
      ],
      product_variants: [
        { variant_name: "Charcoal", price_modifier: 0, sku: "BBD-BAG-WXD-CHR", stock_level: 13 },
        { variant_name: "Sand Olive", price_modifier: 0, sku: "BBD-BAG-WXD-OLV", stock_level: 9 },
      ],
    },
    {
      name: "Full-Grain Vegetable-Tanned Cardholder",
      name_bn: "ফুল-গ্রেইন ভেজিটেবল-ট্যান্ড কার্ডহোল্ডার",
      slug: "vegetable-tanned-leather-cardholder",
      category_id: catAccessories._id,
      size_chart_id: null,
      base_price: 950,
      traditional_price: null,
      is_featured: false,
      is_recommended: true,
      short_description: "Slim 5-slot hand-burnished leather card sleeve crafted in Savar.",
      long_description:
        "Develops a warm amber patina over time. Hand-stitched with waxed linen thread for decades of daily pocket carry.",
      highlights: [
        "100% full-grain vegetable-tanned cowhide",
        "Holds up to 6 cards + folded BDT notes",
        "Hand-burnished beeswax edges",
      ],
      tech_specs: {
        Material: "Full-Grain Leather",
        Slots: "4 Card Slots + Center Pocket",
        Origin: "Savar, Bangladesh",
      },
      activity: ["Everyday", "Smart Casual"],
      product_images: [
        { url: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80", alt_text: "Minimal leather cardholder", display_order: 0 },
      ],
      product_variants: [
        { variant_name: "Espresso", price_modifier: 0, sku: "BBD-ACC-CRD-ESP", stock_level: 25 },
        { variant_name: "Cognac", price_modifier: 0, sku: "BBD-ACC-CRD-COG", stock_level: 19 },
      ],
    },
  ];

  const createdProducts = [];
  for (const item of catalogSeed) {
    const p = await Product.create(item);
    createdProducts.push(p);
  }

  // 5. Generate pgvector Embeddings for Semantic Search & AI Concierge
  console.log("🧠 Generating pgvector embeddings for all 17 products...");
  const categoryNameById = new Map([
    [catTees._id.toString(), catTees.name],
    [catOversizedTees._id.toString(), catOversizedTees.name],
    [catHoodies._id.toString(), catHoodies.name],
    [catShirts._id.toString(), catShirts.name],
    [catPants._id.toString(), catPants.name],
    [catCargo._id.toString(), catCargo.name],
    [catJackets._id.toString(), catJackets.name],
    [catAccessories._id.toString(), catAccessories.name],
  ]);

  await upsertProductEmbeddingsBatch(
    createdProducts.map((p) => ({
      product: p.toObject ? p.toObject() : p,
      categoryName: categoryNameById.get(p.category_id?.toString()) || "",
    }))
  );

  // 6. Seed Coupons
  console.log("🏷️  Seeding Coupons...");
  const futureDate = new Date(Date.now() + 90 * 86400_000);
  await Coupon.create([
    {
      code: "DHAKA10",
      discount_type: "percentage",
      discount_value: 10,
      min_purchase: 1500,
      usage_limit: 500,
      used_count: 14,
      expiry_date: futureDate,
      is_active: true,
    },
    {
      code: "WELCOME200",
      discount_type: "fixed",
      discount_value: 200,
      min_purchase: 1200,
      usage_limit: 1000,
      used_count: 29,
      expiry_date: futureDate,
      is_active: true,
    },
    {
      code: "EID2026",
      discount_type: "percentage",
      discount_value: 15,
      min_purchase: 2500,
      usage_limit: 300,
      used_count: 8,
      expiry_date: futureDate,
      is_active: true,
    },
  ]);

  // 7. Seed Realistic BDT Orders over last 6 days
  console.log("📦 Seeding realistic BDT orders...");
  const dayMs = 86400_000;
  const now = Date.now();
  const sampleOrders = [
    {
      user_id: sampleCustomer._id,
      status: "delivered",
      total_amount: 4160,
      shipping_cost: 60,
      payment_method: "cash_on_delivery",
      courier_name: "Steadfast",
      tracking_id: "SF-882410",
      phone_number: "01711223344",
      shipping_address: {
        full_name: "Nadia Rahman",
        address: "House 18, Road 11, Banani",
        city: "Dhaka",
        area: "Banani",
        delivery_zone: "inside_dhaka",
      },
      order_items: [
        {
          product_id: createdProducts[0]._id,
          variant_id: createdProducts[0].product_variants[1]._id.toString(),
          quantity: 1,
          unit_price: 1150,
          product_name: createdProducts[0].name,
          variant_name: "M",
        },
        {
          product_id: createdProducts[4]._id,
          variant_id: createdProducts[4].product_variants[1]._id.toString(),
          quantity: 1,
          unit_price: 2950,
          product_name: createdProducts[4].name,
          variant_name: "M",
        },
      ],
      createdAt: new Date(now - 5 * dayMs),
    },
    {
      user_id: sampleCustomer2._id,
      status: "delivered",
      total_amount: 4660,
      shipping_cost: 60,
      payment_method: "online_payment",
      courier_name: "Pathao",
      tracking_id: "PT-394022",
      phone_number: "01819334455",
      shipping_address: {
        full_name: "Tariq Mahmud",
        address: "Flat 4B, Road 27, Dhanmondi",
        city: "Dhaka",
        area: "Dhanmondi",
        delivery_zone: "inside_dhaka",
      },
      order_items: [
        {
          product_id: createdProducts[7]._id,
          variant_id: createdProducts[7].product_variants[2]._id.toString(),
          quantity: 1,
          unit_price: 2250,
          product_name: createdProducts[7].name,
          variant_name: "L",
        },
        {
          product_id: createdProducts[10]._id,
          variant_id: createdProducts[10].product_variants[1]._id.toString(),
          quantity: 1,
          unit_price: 2350,
          product_name: createdProducts[10].name,
          variant_name: "32",
        },
      ],
      createdAt: new Date(now - 4 * dayMs),
    },
    {
      guest_email: "farhana.kabir@example.com",
      status: "shipped",
      total_amount: 4770,
      shipping_cost: 120,
      payment_method: "cash_on_delivery",
      courier_name: "Steadfast",
      tracking_id: "SF-882991",
      phone_number: "01911556677",
      shipping_address: {
        full_name: "Farhana Kabir",
        address: "East Nasirabad, Road 2",
        city: "Chattogram",
        area: "Nasirabad",
        delivery_zone: "outside_dhaka",
      },
      order_items: [
        {
          product_id: createdProducts[13]._id,
          variant_id: createdProducts[13].product_variants[1]._id.toString(),
          quantity: 1,
          unit_price: 4650,
          product_name: createdProducts[13].name,
          variant_name: "L",
        },
      ],
      createdAt: new Date(now - 3 * dayMs),
    },
    {
      user_id: sampleCustomer._id,
      status: "shipped",
      total_amount: 3310,
      shipping_cost: 60,
      payment_method: "cash_on_delivery",
      courier_name: "Pathao",
      tracking_id: "PT-395110",
      phone_number: "01711223344",
      shipping_address: {
        full_name: "Nadia Rahman",
        address: "House 18, Road 11, Banani",
        city: "Dhaka",
        area: "Banani",
        delivery_zone: "inside_dhaka",
      },
      order_items: [
        {
          product_id: createdProducts[15]._id,
          variant_id: createdProducts[15].product_variants[0]._id.toString(),
          quantity: 1,
          unit_price: 3250,
          product_name: createdProducts[15].name,
          variant_name: "Charcoal",
        },
      ],
      createdAt: new Date(now - 2 * dayMs),
    },
    {
      guest_email: "rafiq.islam@example.com",
      status: "confirmed",
      total_amount: 2640,
      shipping_cost: 60,
      payment_method: "cash_on_delivery",
      phone_number: "01677889900",
      shipping_address: {
        full_name: "Rafiqul Islam",
        address: "Sector 7, Road 14, Uttara",
        city: "Dhaka",
        area: "Uttara",
        delivery_zone: "inside_dhaka",
      },
      order_items: [
        {
          product_id: createdProducts[1]._id,
          variant_id: createdProducts[1].product_variants[1]._id.toString(),
          quantity: 2,
          unit_price: 1290,
          product_name: createdProducts[1].name,
          variant_name: "M",
        },
      ],
      createdAt: new Date(now - 1 * dayMs),
    },
    {
      user_id: sampleCustomer2._id,
      status: "processing",
      total_amount: 3910,
      shipping_cost: 60,
      payment_method: "online_payment",
      phone_number: "01819334455",
      shipping_address: {
        full_name: "Tariq Mahmud",
        address: "Flat 4B, Road 27, Dhanmondi",
        city: "Dhaka",
        area: "Dhanmondi",
        delivery_zone: "inside_dhaka",
      },
      order_items: [
        {
          product_id: createdProducts[14]._id,
          variant_id: createdProducts[14].product_variants[0]._id.toString(),
          quantity: 1,
          unit_price: 3850,
          product_name: createdProducts[14].name,
          variant_name: "M",
        },
      ],
      createdAt: new Date(now - 6 * 3600_000),
    },
    {
      guest_email: "mehedi.hasan@example.com",
      status: "pending",
      total_amount: 2310,
      shipping_cost: 120,
      payment_method: "cash_on_delivery",
      phone_number: "01755443322",
      shipping_address: {
        full_name: "Mehedi Hasan",
        address: "Zindabazar Main Road",
        city: "Sylhet",
        area: "Zindabazar",
        delivery_zone: "outside_dhaka",
      },
      order_items: [
        {
          product_id: createdProducts[11]._id,
          variant_id: createdProducts[11].product_variants[1]._id.toString(),
          quantity: 1,
          unit_price: 2190,
          product_name: createdProducts[11].name,
          variant_name: "32",
        },
      ],
      createdAt: new Date(now - 2 * 3600_000),
    },
  ];
  await Order.create(sampleOrders);

  // 8. Seed Reviews & Product Q&A
  console.log("💬 Seeding Reviews & Product Q&A...");
  await Review.create([
    {
      product_id: createdProducts[0]._id,
      user_id: sampleCustomer._id,
      user_name: "Nadia Rahman",
      rating: 5,
      comment:
        "Very breathable 190 GSM cotton and the collar stays flat even after three cold washes. Fits true to the Dhaka size chart.",
      is_moderated: true,
      is_verified_purchase: true,
    },
    {
      product_id: createdProducts[4]._id,
      user_id: sampleCustomer._id,
      user_name: "Nadia Rahman",
      rating: 5,
      comment:
        "Heavy French terry feels substantial without overheating indoors. Stitching around the hood and pocket is super clean.",
      is_moderated: true,
      is_verified_purchase: true,
    },
    {
      product_id: createdProducts[7]._id,
      user_id: sampleCustomer2._id,
      user_name: "Tariq Mahmud",
      rating: 5,
      comment:
        "The linen-cotton weave keeps its structure through humid Dhaka commutes. Ordered L and the chest fit matches 43 inches.",
      is_moderated: true,
      is_verified_purchase: true,
    },
    {
      product_id: createdProducts[10]._id,
      user_id: sampleCustomer2._id,
      user_name: "Tariq Mahmud",
      rating: 4,
      comment: "Great tapered silhouette and soft peached twill. Looking forward to more olive shades.",
      is_moderated: false,
      is_verified_purchase: true,
    },
  ]);

  await Question.create([
    {
      product_id: createdProducts[0]._id,
      user_id: sampleCustomer._id,
      user_name: "Nadia Rahman",
      question: "Does the Chalk white crew tee shrink after washing?",
      answer:
        "Our 190 GSM combed cotton jersey is pre-shrunk and enzyme-washed in Gazipur, so shrinkage remains under 2% when washed cold and shade-dried.",
      is_answered: true,
      is_moderated: true,
    },
    {
      product_id: createdProducts[7]._id,
      user_id: sampleCustomer2._id,
      user_name: "Tariq Mahmud",
      question: "Is the Dhaka Loom Linen Shirt sheer under bright sunlight?",
      answer:
        "No—we weave it at 155 GSM using a balanced 55% linen and 45% combed cotton count so it stays breathable while remaining opaque.",
      is_answered: true,
      is_moderated: true,
    },
    {
      product_id: createdProducts[13]._id,
      user_id: sampleCustomer._id,
      user_name: "Farhana Kabir",
      question: "Can the Matte Shell Jacket fit over a 420 GSM hoodie?",
      answer: "",
      is_answered: false,
      is_moderated: false,
    },
  ]);

  // 9. Seed Support Tickets & Jobs
  console.log("🎫 Seeding Support Tickets & Careers...");
  await SupportTicket.create([
    {
      name: "Samira Chowdhury",
      email: "samira.c@example.com",
      subject: "Size exchange request — Dhaka Loom Linen Shirt",
      message: "Hi team, I ordered size M and would like to exchange for size L in Banani.",
      status: "replied",
      replies: [
        {
          message:
            "Hello Samira, we have scheduled a courier pickup & size L swap for tomorrow between 2 PM and 5 PM.",
          repliedBy: "Super Admin",
        },
      ],
    },
    {
      name: "Tanvir Ahmed",
      email: "tanvir.ahmed@example.com",
      subject: "Corporate studio batch inquiry",
      message: "Looking to order 25 Chalk Cotton Crew Tees for our Dhaka architecture studio.",
      status: "open",
    },
  ]);

  await Job.create([
    {
      title: "Apparel Production & QC Coordinator",
      department: "Production",
      location: "Banani & Gazipur, Dhaka",
      type: "Full-time",
      salaryRange: "৳45,000 – ৳65,000",
      description:
        "Coordinate small-batch knitting, enzyme washing, and inline quality assurance across partner mills in Gazipur and Narayanganj.",
      requirements:
        "2+ years in woven/knit garment merchandising, strong measurement spec literacy, and comfort working between Dhaka studio and mill floors.",
      is_active: true,
    },
    {
      title: "Full-Stack Commerce Engineer",
      department: "Engineering",
      location: "Dhaka (Hybrid)",
      type: "Full-time",
      salaryRange: "৳70,000 – ৳1,10,000",
      description:
        "Build storefront experiences, semantic pgvector product search, and real-time Gemini voice concierge tooling on React, Express, and PostgreSQL.",
      requirements:
        "Strong TypeScript, React, Node.js, and SQL/PostgreSQL experience. Familiarity with Tailwind CSS and AI streaming APIs is a plus.",
      is_active: true,
    },
    {
      title: "Customer Experience & Courier Ops Specialist",
      department: "Operations",
      location: "Dhaka, Bangladesh",
      type: "Full-time",
      salaryRange: "৳28,000 – ৳38,000",
      description:
        "Manage daily Steadfast and Pathao parcel handoffs, verify COD dispatches, and resolve customer sizing questions in English and বাংলা.",
      requirements:
        "Clear written and spoken communication in Bengali and English, attention to detail with inventory & courier tracking.",
      is_active: true,
    },
  ]);

  // 10. Clean Store Settings
  console.log("⚙️  Updating store policy settings...");
  const settingsData = [
    {
      key: "vacation_mode",
      value: {
        enabled: false,
        message: "We are taking a short break for seasonal stocktaking and will reopen shortly.",
      },
    },
    {
      key: "shipping_info",
      value:
        "Inside Dhaka: ৳60 (24–48 hours via Pathao/Steadfast). Outside Dhaka: ৳120 (2–4 business days across all 64 districts).",
    },
    {
      key: "returns_exchanges",
      value:
        "Unworn garments with original tags may be exchanged within 7 days of delivery. Defective or incorrect items include complimentary pickup.",
    },
  ];
  for (const s of settingsData) {
    await Settings.findOneAndUpdate({ key: s.key }, { value: s.value }, { upsert: true, new: true });
  }

  console.log("\n✅ Database scrubbed of garbage data and seeded with clean BazzarBD data!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Clean seed failed:", err);
  process.exit(1);
});
