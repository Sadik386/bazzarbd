import express from "express";
import https from "https";
import http from "http";

const router = express.Router();

// Simple in-memory LRU-style cache: url → { buffer, contentType, timestamp }
const imgCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE = 200; // max entries

/**
 * GET /api/img?url=<encoded-cloudinary-url>
 *
 * Proxies images from Cloudinary through this server so that Cloudinary's
 * account-level delivery restrictions (quota exceeded → 401) don't affect
 * end users.  The server fetches the image using its own network identity,
 * caches it in memory for 24 hours, and serves it with long-lived headers.
 */
router.get("/", async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl || typeof rawUrl !== "string") {
    return res.status(400).json({ error: "Missing url param" });
  }

  // Only proxy known-safe Cloudinary URLs
  if (!rawUrl.startsWith("https://res.cloudinary.com/")) {
    return res.status(403).json({ error: "Only Cloudinary URLs are proxied" });
  }

  // Serve from cache
  const cached = imgCache.get(rawUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    res.set("Content-Type", cached.contentType);
    res.set("Cache-Control", "public, max-age=86400, s-maxage=86400, immutable");
    res.set("X-Cache", "HIT");
    return res.send(cached.buffer);
  }

  try {
    const buffer = await fetchUrl(rawUrl);
    const contentType = buffer.contentType || "image/jpeg";

    // Evict oldest if at capacity
    if (imgCache.size >= MAX_CACHE) {
      imgCache.delete(imgCache.keys().next().value);
    }
    imgCache.set(rawUrl, { buffer: buffer.data, contentType, timestamp: Date.now() });

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400, s-maxage=86400, immutable");
    res.set("X-Cache", "MISS");
    return res.send(buffer.data);
  } catch (err) {
    console.error("[img-proxy] fetch error:", err.message, rawUrl);
    return res.status(502).json({ error: "Failed to fetch image" });
  }
});

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers: { "User-Agent": "Thelagari-Server/1.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode}`));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ data: Buffer.concat(chunks), contentType: res.headers["content-type"] }));
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

export default router;
