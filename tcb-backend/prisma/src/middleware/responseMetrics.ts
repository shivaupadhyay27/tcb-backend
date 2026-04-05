import { Request, Response, NextFunction } from 'express';

// ── In-memory metrics store ──────────────────

interface RouteMetric {
  count: number;
  totalMs: number;
  maxMs: number;
  minMs: number;
  p95: number[];
}

const metrics = new Map<string, RouteMetric>();

export const responseTimeMetrics = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  const originalEnd = res.end;
  res.end = function (this: Response, ...args: Parameters<Response['end']>) {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = Math.round(durationNs / 1_000_000);

    res.setHeader('X-Response-Time', `${durationMs}ms`);
    res.setHeader('Server-Timing', `total;dur=${durationMs}`);

    const key = `${req.method} ${req.route?.path || req.path}`;
    const metric = metrics.get(key) || { count: 0, totalMs: 0, maxMs: 0, minMs: Infinity, p95: [] };

    metric.count++;
    metric.totalMs += durationMs;
    metric.maxMs = Math.max(metric.maxMs, durationMs);
    metric.minMs = Math.min(metric.minMs, durationMs);
    metric.p95.push(durationMs);

    if (metric.p95.length > 1000) metric.p95 = metric.p95.slice(-500);

    metrics.set(key, metric);

    // ✅ FIXED LINE
    return originalEnd.call(this, ...args);
  } as typeof res.end;

  next();
};

// ── Get metrics snapshot ─────────────────────

type ResponseMetrics = {
  count: number;
  avgMs: number;
  maxMs: number;
  minMs: number;
  p95Ms: number;
};

export function getResponseMetrics(): Record<string, ResponseMetrics> {
  const result: Record<string, ResponseMetrics> = {};
  for (const [key, m] of metrics.entries()) {
    const sorted = [...m.p95].sort((a, b) => a - b);
    result[key] = {
      count: m.count,
      avgMs: Math.round(m.totalMs / m.count),
      maxMs: m.maxMs,
      minMs: m.minMs === Infinity ? 0 : m.minMs,
      p95Ms: sorted[Math.floor(sorted.length * 0.95)] || 0,
    };
  }
  return result;
}

export function resetMetrics(): void {
  metrics.clear();
}
