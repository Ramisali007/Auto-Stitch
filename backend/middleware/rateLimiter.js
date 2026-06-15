/**
 * Rate Limiting Middleware
 * Protects against brute-force and DDoS attacks
 */

// Simple in-memory rate limiter (no extra dependencies needed)
const rateLimit = (windowMs, maxRequests, message) => {
  const hits = new Map();

  // Cleanup stale entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of hits) {
      if (now - data.startTime > windowMs) {
        hits.delete(key);
      }
    }
  }, 60 * 1000);

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const record = hits.get(key);

    if (!record || now - record.startTime > windowMs) {
      hits.set(key, { count: 1, startTime: now });
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later.',
      });
    }

    next();
  };
};

// Global limiter: 2000 requests per 15 minutes per IP (Increased for development)
const globalLimiter = rateLimit(15 * 60 * 1000, 2000, 'Too many requests from this IP, please try again after 15 minutes.');

// Auth limiter: 100 requests per 15 minutes per IP (Increased for development)
const authLimiter = rateLimit(15 * 60 * 1000, 100, 'Too many authentication attempts, please try again after 15 minutes.');

// Chatbot limiter: 20 requests per 15 minutes
const chatbotLimiter = rateLimit(15 * 60 * 1000, 20, 'Too many chatbot requests, please try again after 15 minutes.');

// Track order limiter: 5 requests per 15 minutes
const trackOrderLimiter = rateLimit(15 * 60 * 1000, 5, 'Too many order tracking attempts, please try again after 15 minutes.');

module.exports = { globalLimiter, authLimiter, chatbotLimiter, trackOrderLimiter };
