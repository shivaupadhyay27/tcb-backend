#!/usr/bin/env node

// ─────────────────────────────────────────────
// Load Test — Publish Endpoint Stress Test
// Usage: node scripts/load-test.mjs [concurrent] [total]
// Example: node scripts/load-test.mjs 100 500
// ─────────────────────────────────────────────

const API_URL = process.env.API_URL || 'http://localhost:5000';
const CONCURRENT = parseInt(process.argv[2] || '100', 10);
const TOTAL_REQUESTS = parseInt(process.argv[3] || '500', 10);

// ── Stats ────────────────────────────────────

const stats = {
  total: 0,
  success: 0,
  errors: 0,
  rateLimited: 0,
  durations: [],
  statusCodes: {},
};

async function makeRequest(endpoint, method = 'GET') {
  const start = Date.now();
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
    });
    const duration = Date.now() - start;
    stats.total++;
    stats.durations.push(duration);
    stats.statusCodes[res.status] = (stats.statusCodes[res.status] || 0) + 1;

    if (res.status === 429) {
      stats.rateLimited++;
    } else if (res.ok) {
      stats.success++;
    } else {
      stats.errors++;
    }

    return { status: res.status, duration };
  } catch (err) {
    stats.total++;
    stats.errors++;
    return { status: 0, duration: Date.now() - start, error: err.message };
  }
}

async function runBatch(endpoints, batchSize) {
  const results = [];
  for (let i = 0; i < endpoints.length; i += batchSize) {
    const batch = endpoints.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((ep) => makeRequest(ep.path, ep.method)));
    results.push(...batchResults);

    const progress = Math.round(((i + batchSize) / endpoints.length) * 100);
    process.stdout.write(
      `\r  Progress: ${Math.min(progress, 100)}% (${stats.total}/${endpoints.length})`,
    );
  }
  return results;
}

function printStats(label) {
  const sorted = stats.durations.sort((a, b) => a - b);
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  console.log(`\n\n${'═'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Total Requests:  ${stats.total}`);
  console.log(`  Concurrent:      ${CONCURRENT}`);
  console.log(`  ✅ Success:      ${stats.success}`);
  console.log(`  ❌ Errors:       ${stats.errors}`);
  console.log(`  🚫 Rate Limited: ${stats.rateLimited}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Response Times:`);
  console.log(`    Avg:   ${avg.toFixed(1)}ms`);
  console.log(`    Min:   ${min}ms`);
  console.log(`    P50:   ${p50}ms`);
  console.log(`    P90:   ${p90}ms`);
  console.log(`    P95:   ${p95}ms`);
  console.log(`    P99:   ${p99}ms`);
  console.log(`    Max:   ${max}ms`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Status Codes:`);
  for (const [code, count] of Object.entries(stats.statusCodes)) {
    console.log(`    ${code}: ${count}`);
  }
  console.log(`${'═'.repeat(60)}\n`);
}

// ── Main ─────────────────────────────────────

async function main() {
  console.log(`\n🔥 Load Test — ${API_URL}`);
  console.log(`   Concurrent: ${CONCURRENT} | Total: ${TOTAL_REQUESTS}\n`);

  // Test 1: Health endpoint
  console.log('📋 Test 1: Health Check Endpoint');
  const healthEndpoints = Array.from({ length: TOTAL_REQUESTS }, () => ({
    path: '/health',
    method: 'GET',
  }));
  await runBatch(healthEndpoints, CONCURRENT);
  printStats('Health Check — /health');

  // Reset stats
  Object.assign(stats, {
    total: 0,
    success: 0,
    errors: 0,
    rateLimited: 0,
    durations: [],
    statusCodes: {},
  });

  // Test 2: Published posts listing
  console.log('📋 Test 2: Published Posts Listing');
  const listEndpoints = Array.from({ length: TOTAL_REQUESTS }, () => ({
    path: '/api/v1/posts/published?page=1&limit=10',
    method: 'GET',
  }));
  await runBatch(listEndpoints, CONCURRENT);
  printStats('Published Posts — /api/v1/posts/published');

  // Reset stats
  Object.assign(stats, {
    total: 0,
    success: 0,
    errors: 0,
    rateLimited: 0,
    durations: [],
    statusCodes: {},
  });

  // Test 3: Post by slug (will 404 but tests the pipeline)
  console.log('📋 Test 3: Post By Slug');
  const slugEndpoints = Array.from({ length: TOTAL_REQUESTS }, () => ({
    path: '/api/v1/posts/slug/test-post-load-test',
    method: 'GET',
  }));
  await runBatch(slugEndpoints, CONCURRENT);
  printStats('Post By Slug — /api/v1/posts/slug/:slug');

  // Reset stats
  Object.assign(stats, {
    total: 0,
    success: 0,
    errors: 0,
    rateLimited: 0,
    durations: [],
    statusCodes: {},
  });

  // Test 4: Rate limit verification
  console.log('📋 Test 4: Rate Limit Verification (burst)');
  const burstEndpoints = Array.from({ length: 200 }, () => ({
    path: '/api/v1/posts/published',
    method: 'GET',
  }));
  await runBatch(burstEndpoints, 200); // all at once
  printStats('Rate Limit Burst Test');

  console.log('✅ Load test complete!\n');
}

main().catch(console.error);
