/**
 * Simple in-memory, per-user rate limiter for AI endpoints
 * (specs/architecture.md §9: "rate limiting on AI endpoints (cost + abuse)").
 *
 * Suitable for a single-instance hackathon deploy. A multi-instance production
 * deployment should back this with a distributed store (e.g. Upstash Redis),
 * which would be a spec-reviewed addition (prelint.md §3.4).
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number; // seconds
}

export function rateLimit(
  userId: string,
  options: { max?: number; windowMs?: number } = {},
): RateLimitResult {
  const max = options.max ?? MAX_REQUESTS;
  const windowMs = options.windowMs ?? WINDOW_MS;
  const now = Date.now();

  const recent = (buckets.get(userId) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    const retryAfter = Math.max(
      1,
      Math.ceil((recent[0] + windowMs - now) / 1000),
    );
    buckets.set(userId, recent);
    return { ok: false, retryAfter };
  }

  recent.push(now);
  buckets.set(userId, recent);
  return { ok: true, retryAfter: 0 };
}

/** Test-only helper to reset state between tests. */
export function _resetRateLimiterForTests(): void {
  buckets.clear();
}
