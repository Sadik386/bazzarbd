import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool, initPgVector } from "./postgres.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initPostgresTables() {
  const client = await pool.connect();
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
    await client.query(schemaSql);
    console.log("✅ PostgreSQL tables and indexes verified/created.");

    // Also ensure pgvector is initialized
    await initPgVector();
  } catch (err) {
    console.error("❌ Error initializing PostgreSQL tables:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

export default initPostgresTables;