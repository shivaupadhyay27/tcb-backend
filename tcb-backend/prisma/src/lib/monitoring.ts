// ─────────────────────────────────────────────
// Sentry Error Monitoring Integration
// Install: npm install @sentry/node
// ─────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';

// ── Sentry-compatible error reporter ─────────
// Uses console logging as fallback when Sentry is not configured.
// To enable Sentry: npm install @sentry/node, set SENTRY_DSN env var

interface ErrorReport extends Record<string, unknown> {
  message: string;
  stack?: string;
  path: string;
  method: string;
  statusCode: number;
  userId?: string;
  timestamp: string;
  extra?: Record<string, unknown>;
}

let sentryInitialized = false;

export async function initErrorMonitoring(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log('[Monitor] Sentry DSN not set — using console error logging');
    return;
  }

  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [],
    });
    sentryInitialized = true;
    console.log('[Monitor] ✅ Sentry initialized');
  } catch {
    console.warn('[Monitor] @sentry/node not installed — using console logging');
  }
}

export function captureError(error: Error, extra?: Record<string, unknown>): void {
  if (sentryInitialized) {
    import('@sentry/node')
      .then((Sentry) => {
        Sentry.captureException(error, { extra });
      })
      .catch(() => {});
  }

  // Always log to console
  console.error('[Error]', error.message, extra || '');
}

export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
): void {
  if (sentryInitialized) {
    import('@sentry/node')
      .then((Sentry) => {
        Sentry.captureMessage(message, level);
      })
      .catch(() => {});
  }
  console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](
    `[Monitor] ${message}`,
  );
}

// ── Express error monitoring middleware ───────

export const errorMonitoringMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const report: ErrorReport = {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    statusCode: res.statusCode || 500,
    userId: req.user?.sub,
    timestamp: new Date().toISOString(),
  };

  captureError(err, report);
  next(err);
};
