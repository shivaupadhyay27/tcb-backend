import { Request, Response, NextFunction } from 'express';

// ─────────────────────────────────────────────
// In-memory rate limiter
// Phase 2: Replace with Redis-based sliding window
// ─────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  },
  5 * 60 * 1000,
);

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  keyGenerator?: (req: Request) => string;
  message?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown',
    message = 'Too many requests, please try again later',
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      next();
      return;
    }

    entry.count++;

    if (entry.count > max) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetAt).toISOString());
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      res.status(429).json({ status: 'error', message });
      return;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - entry.count);
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetAt).toISOString());
    next();
  };
}

// ── Pre-configured limiters ──────────────────

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min
  message: 'API rate limit exceeded. Try again in 15 minutes.',
});

export const publishLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 publish actions per minute
  keyGenerator: (req) => `publish:${req.user?.sub || req.ip}`,
  message: 'Publish rate limit exceeded. Please wait before publishing again.',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many auth attempts. Try again in 15 minutes.',
});
