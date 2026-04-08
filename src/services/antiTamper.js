const { RateLimiterMemory } = require('rate-limiter-flexible');
const config = require('../config');
const logger = require('../utils/logger');

// Simple in-memory rate limiter and idempotency store.
// Production: use Redis for distributed rate limiting and deduplication.

const rateLimiter = new RateLimiterMemory({
  points: config.RATE_LIMIT_POINTS,
  duration: config.RATE_LIMIT_DURATION
});

const idempotencyStore = new Map(); // key -> timestamp

function cleanupIdempotency() {
  const now = Date.now();
  for (const [k, t] of idempotencyStore.entries()) {
    if (now - t > 1000 * 60 * 60) idempotencyStore.delete(k);
  }
}
setInterval(cleanupIdempotency, 1000 * 60 * 10);

async function checkRateLimit(key) {
  try {
    await rateLimiter.consume(key);
    return true;
  } catch (e) {
    logger.warn('Rate limit exceeded for', key);
    return false;
  }
}

function idempotentCheck(idempotencyKey) {
  if (!idempotencyKey) return false;
  if (idempotencyStore.has(idempotencyKey)) return false; // duplicate
  idempotencyStore.set(idempotencyKey, Date.now());
  return true;
}

module.exports = { checkRateLimit, idempotentCheck };
