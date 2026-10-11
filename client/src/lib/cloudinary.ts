const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const IS_DEV   = API_BASE.includes("localhost");

// The VPS host — derived from the API base so no extra env var is needed.
// In production: https://thelagaribd.com
// In dev: http://localhost:5001  (Node.js serves /uploads via express.static)
const HOST_BASE = API_BASE.replace(/\/api$/, "");

/**
 * Resolve any stored image URL to a fully usable browser URL.
 *
 * Handles all three URL formats that may exist in the database:
 *
 *  1. NEW  — Relative VPS path:    "/uploads/filename.jpg"
 *            → prepends the server host so the browser can fetch it
 *
 *  2. OLD  — Full Cloudinary URL:  "https://res.cloudinary.com/..."
 *            In production: routed through /api/img proxy (avoids quota blocks)
 *            In dev: used directly (faster, proxy adds unnecessary latency)
 *
 *  3. PASS — Already absolute, non-Cloudinary:  "https://..."
 *            → returned unchanged
 */
export function cloudinaryUrl(url: string): string {
  if (!url) return "";

  // ── Case 1: New VPS-hosted image (relative path) ──────────────────────────
  if (url.startsWith("/uploads/")) {
    return `${HOST_BASE}${url}?v=1.0.1`;
  }

  // ── Case 2: Legacy Cloudinary URL ────────────────────────────────────────
  if (url.includes("cloudinary.com")) {
    // In dev: use direct URL — faster and avoids proxy timeout issues
    if (IS_DEV) return url;
    // In production: route through proxy to handle Cloudinary quota limits
    return `${API_BASE}/img?url=${encodeURIComponent(url)}`;
  }

  // ── Case 3: Already a full absolute URL ──────────────────────────────────
  return url;
}

// Alias — use this name in new code going forward
export const getImageUrl = cloudinaryUrl;
