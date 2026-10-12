import pg from "pg";
const { Pool } = pg;

const connectionString =
  process.env.PG_CONNECTION_STRING ||
  process.env.DATABASE_URL ||
  "postgresql://bazzar_user:bazzar_password@localhost:5432/bazzar_vectors";

const isProduction = process.env.NODE_ENV === "production";
const useSsl = connectionString.includes("sslmode=require") || connectionString.includes("render.com") || connectionString.includes("supabase.co");

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const query = (text, params) => pool.query(text, params);

/**
 * Initialize PostgreSQL with the pgvector extension, table, and HNSW index.
 */
export async function initPgVector() {
  const client = await pool.connect();
  try {
    // 1. Enable pgvector extension
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");

    // 2. Create product_embeddings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_embeddings (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(64) NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT,
        base_price NUMERIC,
        chunk_text TEXT NOT NULL,
        embedding vector(1536) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create HNSW index for fast approximate nearest neighbor cosine search
    await client.query(`
      CREATE INDEX IF NOT EXISTS product_embeddings_hnsw_idx 
      ON product_embeddings USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    `);

    console.log("✅ PostgreSQL + pgvector initialized successfully (HNSW index ready).");
  } catch (err) {
    console.error("❌ Error initializing pgvector:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
