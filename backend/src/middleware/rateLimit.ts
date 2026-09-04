import type { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };

/**
 * Minimal fixed-window rate limiter (per-IP, in-memory).
 * Enough to throttle auth endpoints against brute-force / CPU burn.
 * For multi-instance deploys, replace with a shared store (e.g. rate-limit-redis).
 */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    let bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ error: "Too many requests, slow down" });
    }

    // Opportunistic cleanup so the map can't grow unbounded.
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) {
        if (now >= b.resetAt) buckets.delete(k);
      }
    }

    next();
  };
}

/** Strict throttle for login/signup: 20 attempts per 15 min per IP. */
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
