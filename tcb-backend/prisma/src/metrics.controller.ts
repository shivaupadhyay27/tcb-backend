import { Request, Response } from 'express';
import { prisma } from './lib/prisma';
import os from 'os';

export async function handleMetrics(req: Request, res: Response) {
  try {
    const start = Date.now();

    // DB health check
    // Kyu: DB connection alive hai ya nahi check karna hai
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - start;

    // Server memory usage
    // Kyu: Memory leak detect karne ke liye
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      db: {
        status: 'connected',
        latencyMs: dbLatency,
      },
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        systemTotal: Math.round(totalMem / 1024 / 1024),
        systemFree: Math.round(freeMem / 1024 / 1024),
      },
      node: process.version,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
}
