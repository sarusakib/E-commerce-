import { createHash } from "node:crypto";

type Bucket = { count: number; resetAt: number };
export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size <= 10000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
    if (buckets.size <= 8000) break;
  }
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const realIp = request.headers.get("x-real-ip")?.trim() ?? "";
  const userAgent = request.headers.get("user-agent")?.slice(0, 160) ?? "";
  return hashValue([forwarded || realIp || "unknown", userAgent].join("|"));
}

export function rateLimit(key: string, limit = 60, windowMs = 60000): RateLimitResult {
  const now = Date.now();
  prune(now);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      limit,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  current.count += 1;
  return {
    allowed: current.count <= limit,
    limit,
    remaining: Math.max(limit - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  };
}
