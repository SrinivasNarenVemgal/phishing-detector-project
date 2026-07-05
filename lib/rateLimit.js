// A simple in-memory sliding-window rate limiter.
// Good enough for a single-instance deployment (which is what this project
// targets). If you later run multiple server instances behind a load
// balancer, swap this for a shared store (e.g. Redis + @upstash/ratelimit)
// since in-memory state doesn't sync across processes.

const buckets = new Map(); // key -> array of request timestamps (ms)

/**
 * @param {string} key - unique identifier for what's being limited (e.g. `login:${ip}`)
 * @param {number} maxRequests - allowed requests per window
 * @param {number} windowMs - window size in milliseconds
 * @returns {{ allowed: boolean, retryAfterSeconds: number, remaining: number }}
 */
export function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = buckets.get(key) || [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= maxRequests) {
    const oldestInWindow = timestamps[0];
    const retryAfterSeconds = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    buckets.set(key, timestamps);
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, retryAfterSeconds: 0, remaining: maxRequests - timestamps.length };
}

// Periodically clear old entries so the Map doesn't grow forever on a long-running server.
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000; // drop anything with no activity in the last hour
  for (const [key, timestamps] of buckets.entries()) {
    const recent = timestamps.filter((t) => t > cutoff);
    if (recent.length === 0) buckets.delete(key);
    else buckets.set(key, recent);
  }
}, 10 * 60 * 1000).unref?.();

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
