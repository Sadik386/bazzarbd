import rateLimit from "express-rate-limit";

// General rate limiter for standard API routes (increased to 3000 for high-volume client/admin usage)
export const generalLimiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW_MINS) || parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 60000 || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  message: {
    error: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl && req.originalUrl.includes("/api/admin"),
  // admin limiter
  
});


// Stricter rate limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 60 attempts (increased from 20 to allow smooth testing/re-authentications)
  message: {
    error: "Too many authentication attempts. Please try again after 5 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: (parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MINS) || 5) * 60 * 1000,
  max: 100, // 50 uploads per 5 mins (increased to allow fast bulk product image creation)
  message: {
    error: "Too many file upload requests. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

