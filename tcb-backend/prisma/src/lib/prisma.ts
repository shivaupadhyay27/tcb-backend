import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// ── Query execution timing middleware ─────────
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const durationMs = Date.now() - start;

  const threshold = 200; // ms

  if (durationMs > threshold) {
    console.warn(`🐌 [Prisma Slow Query] ${params.model}.${params.action} took ${durationMs}ms`, {
      model: params.model,
      action: params.action,
      duration: durationMs,
      threshold,
    });
  } else if (process.env.NODE_ENV === 'development') {
    console.log(`⚡ [Prisma] ${params.model}.${params.action} → ${durationMs}ms`);
  }

  return result;
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
