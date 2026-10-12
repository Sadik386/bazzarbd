import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import pgvector from "pgvector";
import { query } from "../db/postgres.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;

/**
 * Generate a deterministic pseudo-embedding (1536 dims, normalized)
 * used as a safe fallback when OPENAI_API_KEY is not yet configured.
 */
function generateFallbackEmbedding(text) {
  const vec = new Float32Array(EMBEDDING_DIM);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    vec[i] = Math.sin(hash + i * 31);
  }
  // Normalize vector to unit length
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec.map((v) => v / norm));
}

/**
 * Generate 1536-dimension embedding via Gemini embedding-001 or OpenAI text-embedding-3-small
 */
export async function generateEmbedding(text) {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  // 1. Prioritize Gemini embedding if GEMINI_API_KEY is configured
  if (geminiApiKey && geminiApiKey !== "your_gemini_api_key_here") {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: text.slice(0, 8000) }] },
            outputDimensionality: EMBEDDING_DIM, // 1536 dimensions matches pgvector schema
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.embedding?.values && data.embedding.values.length === EMBEDDING_DIM) {
          return data.embedding.values;
        }
      } else {
        const errText = await res.text();
        console.warn(`Gemini Embedding API notice (${res.status}): ${errText}`);
      }
    } catch (error) {
      console.warn("Failed to generate Gemini embedding:", error.message);
    }
  }

  // 2. Fallback to OpenAI if configured
  if (openaiApiKey && openaiApiKey !== "your_openai_api_key_here") {
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text.slice(0, 8000),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.data[0].embedding;
      }
    } catch (error) {
      console.warn("Failed to generate OpenAI embedding:", error.message);
    }
  }

  console.warn("⚠️ Using deterministic fallback embedding for development.");
  return generateFallbackEmbedding(text);
}

/**
 * Generate embeddings in batch (up to 50 items per call) for fast catalog migrations.
 */
export async function generateBatchEmbeddings(texts) {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (geminiApiKey && geminiApiKey !== "your_gemini_api_key_here") {
    try {
      const requests = texts.map((t) => ({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text: t.slice(0, 8000) }] },
        outputDimensionality: EMBEDDING_DIM,
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requests }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.embeddings) && data.embeddings.length === texts.length) {
          return data.embeddings.map((e) => e.values);
        }
      } else {
        const errText = await res.text();
        console.warn(`Gemini Batch Embedding API notice (${res.status}): ${errText}`);
      }
    } catch (error) {
      console.warn("Gemini batch embedding error:", error.message);
    }
  }

  // Fallback to sequential generation
  const results = [];
  for (const t of texts) {
    results.push(await generateEmbedding(t));
  }
  return results;
}

/**
 * Build rich descriptive text for a product to maximize semantic search recall.
 */
export function buildProductText(product, categoryName = "") {
  const parts = [];

  const name = product.name || "";
  const cat = (categoryName || product.category_id?.name || "").trim();
  const combined = `${name} ${cat} ${product.short_description || ""} ${product.long_description || ""}`.toLowerCase();

  if (name) parts.push(`Product Name: ${name}`);
  if (cat) parts.push(`Category: ${cat}`);

  // Place seasonal & apparel type tags immediately at the top for maximum semantic weighting
  if (combined.includes("hoodie") || combined.includes("hoodies") || cat.toLowerCase().includes("hoie")) {
    parts.push("Product Type & Season: Hoodies & Sweatshirts. Warm winter clothes, cold weather fleece hoodie, warm winter wear, pullover sweater, autumn/winter clothing.");
  } else if (combined.includes("jacket") || combined.includes("coat") || combined.includes("puffer") || combined.includes("blazer")) {
    parts.push("Product Type & Season: Jackets & Coats. Warm winter clothes, cold weather outerwear, warm winter jacket, insulated layer, autumn/winter clothing.");
  } else if (combined.includes("t-shirt") || combined.includes("tee")) {
    parts.push("Product Type & Season: T-Shirts & Tops. Summer clothes, warm weather, lightweight breathable cotton daily wear.");
  } else if (combined.includes("pant") || combined.includes("trouser") || combined.includes("jeans") || combined.includes("cargo")) {
    parts.push("Product Type: Pants & Trousers. Everyday casual bottoms, streetwear fashion.");
  }

  if (product.base_price) parts.push(`Price: BDT ${product.base_price} taka`);
  if (product.short_description) parts.push(`Summary: ${product.short_description}`);
  if (product.long_description) parts.push(`Details: ${product.long_description}`);

  if (product.activity && Array.isArray(product.activity) && product.activity.length > 0) {
    parts.push(`Tags / Activities: ${product.activity.join(", ")}`);
  }

  if (product.product_variants && Array.isArray(product.product_variants) && product.product_variants.length > 0) {
    const variants = product.product_variants.map((v) => v.variant_name).join(", ");
    parts.push(`Available Variants / Colors / Sizes: ${variants}`);
  }

  if (product.tech_specs && typeof product.tech_specs === "object") {
    const specs = Object.entries(product.tech_specs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    if (specs) parts.push(`Specifications: ${specs}`);
  }

  return parts.join("\n");
}

/**
 * Chunk product text using LangChain.js RecursiveCharacterTextSplitter.
 */
export async function chunkProductText(fullText) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  });
  const docs = await splitter.createDocuments([fullText]);
  return docs.map((d) => d.pageContent).join("\n---\n");
}

/**
 * Embed and upsert a single product into PostgreSQL pgvector table.
 */
export async function upsertProductEmbedding(product, categoryName = "") {
  try {
    const productId = product._id?.toString() || product.id?.toString();
    if (!productId) return;

    const fullText = buildProductText(product, categoryName);
    const chunkedText = await chunkProductText(fullText);
    const vector = await generateEmbedding(chunkedText);

    const vectorSql = pgvector.toSql(vector);

    await query(
      `
      INSERT INTO product_embeddings (product_id, name, category, base_price, chunk_text, embedding, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (product_id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        base_price = EXCLUDED.base_price,
        chunk_text = EXCLUDED.chunk_text,
        embedding = EXCLUDED.embedding,
        updated_at = CURRENT_TIMESTAMP;
      `,
      [
        productId,
        product.name || "Untitled",
        categoryName || product.category_id?.name || null,
        product.base_price || 0,
        chunkedText,
        vectorSql,
      ]
    );

    return true;
  } catch (err) {
    console.error(`❌ Failed to upsert embedding for product ${product._id}:`, err.message);
    return false;
  }
}

/**
 * Upsert multiple product embeddings in batch for fast catalog migrations.
 */
export async function upsertProductEmbeddingsBatch(items) {
  if (!items || items.length === 0) return 0;
  const prepared = [];
  for (const { product, categoryName } of items) {
    const productId = product._id?.toString() || product.id?.toString();
    if (!productId) continue;
    const fullText = buildProductText(product, categoryName);
    const chunkedText = await chunkProductText(fullText);
    prepared.push({ productId, product, categoryName, chunkedText });
  }

  if (prepared.length === 0) return 0;
  const vectors = await generateBatchEmbeddings(prepared.map((p) => p.chunkedText));

  for (let i = 0; i < prepared.length; i++) {
    const item = prepared[i];
    const vector = vectors[i];
    const vectorSql = pgvector.toSql(vector);
    await query(
      `
      INSERT INTO product_embeddings (product_id, name, category, base_price, chunk_text, embedding, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (product_id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        base_price = EXCLUDED.base_price,
        chunk_text = EXCLUDED.chunk_text,
        embedding = EXCLUDED.embedding,
        updated_at = CURRENT_TIMESTAMP;
      `,
      [
        item.productId,
        item.product.name || "Untitled",
        item.categoryName || item.product.category_id?.name || null,
        item.product.base_price || 0,
        item.chunkedText,
        vectorSql,
      ]
    );
  }
  return prepared.length;
}

/**
 * Delete a product's embedding from PostgreSQL pgvector table.
 */
export async function deleteProductEmbedding(productId) {
  try {
    const id = productId.toString();
    await query("DELETE FROM product_embeddings WHERE product_id = $1;", [id]);
    return true;
  } catch (err) {
    console.error(`❌ Failed to delete embedding for product ${productId}:`, err.message);
    return false;
  }
}

/**
 * Perform cosine similarity semantic search against pgvector.
 * Matches are ordered by highest cosine similarity (lowest cosine distance <=>).
 */
export async function searchSimilarProducts(queryText, limit = 10, minScore = 0.3) {
  try {
    const queryVector = await generateEmbedding(queryText);
    const vectorSql = pgvector.toSql(queryVector);

    // Fetch candidate pool (up to 3x limit) so multiple categories can be fairly represented
    const candidateLimit = Math.max(limit * 3, 24);

    const res = await query(
      `
      SELECT product_id, name, category, base_price,
             1 - (embedding <=> $1) AS similarity
      FROM product_embeddings
      WHERE 1 - (embedding <=> $1) >= $2
      ORDER BY embedding <=> $1 ASC
      LIMIT $3;
      `,
      [vectorSql, minScore, candidateLimit]
    );

    if (res.rows.length === 0) {
      return [];
    }

    const productIds = res.rows.map((r) => r.product_id);
    const scoreMap = new Map(res.rows.map((r) => [r.product_id, parseFloat(r.similarity)]));

    // Fetch full product objects from MongoDB (filter out incomplete/zero-price test items)
    const mongoProducts = await Product.find({
      _id: { $in: productIds },
      base_price: { $gt: 0 },
      $or: [
        { short_description: { $exists: true, $ne: "" } },
        { long_description: { $exists: true, $ne: "" } },
      ],
    })
      .populate("category_id", "name slug")
      .lean();

    // Map and preserve score-based ranking
    const sorted = mongoProducts
      .map((p) => ({
        ...p,
        id: p._id.toString(),
        similarity_score: scoreMap.get(p._id.toString()) || 0,
      }))
      .sort((a, b) => b.similarity_score - a.similarity_score);

    // Ensure category diversity: prevent a single category from filling all slots for broad queries
    const results = [];
    const categoryCounts = new Map();
    const maxPerCategory = Math.max(Math.ceil(limit / 2), 2);
    const overflow = [];

    for (const p of sorted) {
      const cat = p.category_id?.name || p.category || "General";
      const count = categoryCounts.get(cat) || 0;
      if (count < maxPerCategory && results.length < limit) {
        results.push(p);
        categoryCounts.set(cat, count + 1);
      } else {
        overflow.push(p);
      }
    }

    while (results.length < limit && overflow.length > 0) {
      results.push(overflow.shift());
    }

    return results;
  } catch (err) {
    console.error("❌ Semantic search error:", err.message);
    return [];
  }
}
