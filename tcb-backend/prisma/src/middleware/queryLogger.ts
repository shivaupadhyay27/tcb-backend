import { Request, Response, NextFunction } from 'express';

export interface QueryLog {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

export const queryPerformanceLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  const originalEnd = res.end;

  res.end = function (this: Response, ...args: Parameters<Response['end']>) {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    const log: QueryLog = {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
    };

    const isSlowQuery = durationMs > 500;
    const logLevel = isSlowQuery ? 'warn' : 'info';

    if (process.env.NODE_ENV === 'development' || isSlowQuery) {
      const emoji = isSlowQuery ? '🐌' : '⚡';
      console[logLevel](
        `${emoji} [Query] ${log.method} ${log.path} → ${log.statusCode} (${log.durationMs}ms)`,
      );
    }

    if (isSlowQuery) {
      console.warn(`[SLOW QUERY] ${log.method} ${log.path} took ${log.durationMs}ms`, {
        threshold: 500,
        actual: log.durationMs,
      });
    }

    return originalEnd.call(this, ...args);
  } as typeof res.end;

  next();
};
