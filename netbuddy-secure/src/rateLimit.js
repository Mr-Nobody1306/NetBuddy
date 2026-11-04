"use strict";

/* Sliding-window per-IP rate limiter (in-memory — fine for one box). */

function createRateLimiter({ windowMs, max }) {
  const hits = new Map(); // ip -> [timestamps]

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, arr] of hits) {
      const fresh = arr.filter((t) => now - t < windowMs);
      if (fresh.length) hits.set(ip, fresh);
      else hits.delete(ip);
    }
  }, windowMs);
  if (timer.unref) timer.unref();

  return {
    isLimited(ip) {
      const now = Date.now();
      const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
      arr.push(now);
      hits.set(ip, arr);
      return arr.length > max;
    },
    stop() { clearInterval(timer); }
  };
}

module.exports = { createRateLimiter };
