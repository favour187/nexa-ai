








const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number;
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


export function _resetRateLimiterForTests(): void {
  buckets.clear();
}
