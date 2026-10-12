import dotenv from "dotenv";
import fs from "fs";
const envPath = fs.existsSync("./server/.env") ? "./server/.env" : "./.env";
dotenv.config({ path: envPath });

import connectDB from "../db.js";
import { initPgVector } from "../db/postgres.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { upsertProductEmbeddingsBatch } from "../services/embeddingService.js";

async function main() {
  console.log("🚀 Starting Product Embeddings Migration to pgvector (Gemini embeddings)...");
  const startTime = Date.now();

  try {
    await connectDB();
    await initPgVector();

    const products = await Product.find({}).populate("category_id", "name").lean();
    console.log(`📦 Found ${products.length} products to embed.`);

    const BATCH_SIZE = 20;
    let totalEmbedded = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const slice = products.slice(i, i + BATCH_SIZE);
      const items = slice.map((p) => ({
        product: p,
        categoryName: p.category_id?.name || "",
      }));

      process.stdout.write(`⏳ Embedding batch [${i + 1}-${Math.min(i + BATCH_SIZE, products.length)} of ${products.length}]... `);
      const count = await upsertProductEmbeddingsBatch(items);
      totalEmbedded += count;
      process.stdout.write(`✅ Done (${count} items)\n`);

      // Gentle pause to stay well clear of any rate limit
      if (i + BATCH_SIZE < products.length) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Embeddings Complete in ${elapsed}s!`);
    console.log(`   - Successfully embedded: ${totalEmbedded}/${products.length}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

main();
