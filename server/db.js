import { pool } from "./db/postgres.js";
import { initPostgresTables } from "./db/initDb.js";

const connectDB = async (retries = 5, delayMs = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Test PostgreSQL connection
      await pool.query("SELECT 1;");
      console.log("✅ PostgreSQL connected successfully");

      // Verify and initialize PostgreSQL tables & vector index
      await initPostgresTables();
      return;
    } catch (err) {
      console.error(`❌ PostgreSQL connection attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) {
        console.log(`Retrying in ${delayMs / 1000}s...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.error("All PostgreSQL connection attempts exhausted.");
        process.exit(1);
      }
    }
  }
};

export default connectDB;