import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from './auth/config/passport';
import { requestIdMiddleware } from './middleware/requestId';
import { structuredLogger } from './middleware/structuredLogger';
import affiliateRoutes from './affiliate/affiliate.route';

// Routes
import authRoutes from './auth/routes/auth.routes';
import postRoutes from './posts/routes/post.routes';
import categoryRoutes from './categories/routes/category.routes';
import authorRoutes from './authors/routes/author.routes';
import searchRoutes from './search/routes/search.routes';
import seoRoutes from './seo/routes/seo.routes';
import imageRoutes from './images/routes/image.routes';

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { queryPerformanceLogger } from './middleware/queryLogger';
import { responseTimeMetrics, getResponseMetrics } from './middleware/responseMetrics';
import { apiLimiter, authLimiter } from './middleware/rateLimit';
import { noIndexMiddleware } from './seo/middleware/noIndex.middleware';
import { canonicalHeaderMiddleware } from './seo/middleware/canonicalHeader.middleware';
import { seoSecurityHeaders } from './seo/middleware/securityHeaders.middleware';
import { httpSecurityHeaders } from './seo/middleware/httpSecurityHeaders.middleware';
import { initErrorMonitoring, errorMonitoringMiddleware } from './lib/monitoring';

// Search sub-routes
import { handleRelatedPosts, handlePopularPosts } from './search/routes/search.routes';

const app: Application = express();

// ── Init monitoring ───────────────────────────
initErrorMonitoring().catch(console.error);

// ── Core middleware ───────────────────────────
app.use(helmet());
app.use(requestIdMiddleware);
app.use(structuredLogger);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true, // required for httpOnly cookies
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(passport.initialize());
app.use(requestIdMiddleware);

// ── Performance & Security middleware ─────────
app.use(queryPerformanceLogger);
app.use(responseTimeMetrics);
app.use(httpSecurityHeaders);

// ── SEO middleware (global) ───────────────────
app.use(noIndexMiddleware);
app.use(canonicalHeaderMiddleware);
app.use(seoSecurityHeaders);

app.use('/r', affiliateRoutes);
// ── Health check ──────────────────────────────
app.get('/health', async (_req, res) => {
  const start = Date.now();
  let dbStatus = 'ok';
  let dbConnectionCount = 0;
  try {
    const prisma = (await import('./lib/prisma')).default;
    await prisma.$queryRaw`SELECT 1`;
    const result =
      (await prisma.$queryRaw`SELECT count(*) as cnt FROM pg_stat_activity WHERE state = 'active'`) as Array<{
        cnt: bigint;
      }>;
    dbConnectionCount = Number(result[0]?.cnt || 0);
  } catch {
    dbStatus = 'error';
  }
  const uptime = process.uptime();
  const durationMs = Date.now() - start;
  const memUsage = process.memoryUsage();
  res.status(dbStatus === 'ok' ? 200 : 503).json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.round(uptime),
    db: { status: dbStatus, activeConnections: dbConnectionCount, responseTimeMs: durationMs },
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
    },
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/uptime', (_req, res) => {
  res.status(200).json({
    status: 'up',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/metrics', (_req, res) => {
  res.status(200).json({ status: 'success', data: getResponseMetrics() });
});

// ── Routes ────────────────────────────────────
app.use('/', seoRoutes);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/posts', apiLimiter, postRoutes);
app.use('/api/v1/categories', apiLimiter, categoryRoutes);
app.use('/api/v1/authors', apiLimiter, authorRoutes);
app.use('/api/v1/search', apiLimiter, searchRoutes);
app.use('/api/v1/images', apiLimiter, imageRoutes);

// ── Search sub-routes ─────────────────────────
app.get('/api/v1/posts/popular', apiLimiter, handlePopularPosts);
app.get('/api/v1/posts/:id/related', apiLimiter, handleRelatedPosts);

// ── Error monitoring + handling ───────────────
app.use(errorMonitoringMiddleware);
app.use(notFound);
app.use(errorHandler);

export default app;
