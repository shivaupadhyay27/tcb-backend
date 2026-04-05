#!/usr/bin/env tsx

// ─────────────────────────────────────────────
// DB Connection & Performance Monitor
// Usage: npx tsx scripts/db-monitor.ts
// ─────────────────────────────────────────────

import 'dotenv/config';
import prisma from '../src/lib/prisma';

interface MonitorSnapshot {
  timestamp: string;
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  queryTimeMs: number;
  dbSizeMB: number;
  postCount: number;
  publishedCount: number;
}

async function takeSnapshot(): Promise<MonitorSnapshot> {
  const start = Date.now();

  // Connection stats
  const connStats = (await prisma.$queryRaw`
    SELECT
      count(*) FILTER (WHERE state = 'active') as active,
      count(*) FILTER (WHERE state = 'idle') as idle,
      count(*) as total
    FROM pg_stat_activity
    WHERE datname = current_database()
  `) as Array<{ active: bigint; idle: bigint; total: bigint }>;

  // DB size
  const sizeResult = (await prisma.$queryRaw`
    SELECT pg_database_size(current_database()) / 1024 / 1024 as size_mb
  `) as Array<{ size_mb: bigint }>;

  // Post counts
  const [postCount, publishedCount] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
  ]);

  const queryTimeMs = Date.now() - start;

  return {
    timestamp: new Date().toISOString(),
    activeConnections: Number(connStats[0]?.active || 0),
    idleConnections: Number(connStats[0]?.idle || 0),
    totalConnections: Number(connStats[0]?.total || 0),
    queryTimeMs,
    dbSizeMB: Number(sizeResult[0]?.size_mb || 0),
    postCount,
    publishedCount,
  };
}

async function monitor(intervalMs = 5000, iterations = 12) {
  console.log('\n📊 DB Connection & Performance Monitor');
  console.log('═'.repeat(70));
  console.log('Timestamp                | Active | Idle | Total | Query(ms) | DB(MB) | Posts');
  console.log('─'.repeat(70));

  for (let i = 0; i < iterations; i++) {
    try {
      const snap = await takeSnapshot();
      const ts = snap.timestamp.replace('T', ' ').slice(0, 19);
      console.log(
        `${ts} |   ${String(snap.activeConnections).padStart(4)} | ${String(snap.idleConnections).padStart(4)} | ${String(snap.totalConnections).padStart(5)} | ${String(snap.queryTimeMs).padStart(9)} | ${String(snap.dbSizeMB).padStart(6)} | ${snap.publishedCount}/${snap.postCount}`,
      );

      // Warnings
      if (snap.activeConnections > 20) {
        console.warn(`  ⚠️  High active connections: ${snap.activeConnections}`);
      }
      if (snap.queryTimeMs > 500) {
        console.warn(`  🐌 Slow monitoring query: ${snap.queryTimeMs}ms`);
      }
    } catch (err) {
      console.error(`  ❌ Monitor error: ${(err as Error).message}`);
    }

    if (i < iterations - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  console.log('═'.repeat(70));
  console.log('Monitor complete.\n');
  await prisma.$disconnect();
}

monitor().catch(console.error);
