interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup stale keys every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((record, key) => {
      record.timestamps = record.timestamps.filter(ts => now - ts < 60000);
      if (record.timestamps.length === 0) {
        rateLimitMap.delete(key);
      }
    });
  }, 300000);
}

/**
 * Checks if a client IP is allowed within a sliding time window.
 * Default: 30 requests per 60 seconds.
 */
export function checkRateLimit(
  identifier: string,
  limit = 30,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier) || { timestamps: [] };

  // Remove timestamps outside window
  record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    };
  }

  record.timestamps.push(now);
  rateLimitMap.set(identifier, record);

  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    resetMs: windowMs,
  };
}
