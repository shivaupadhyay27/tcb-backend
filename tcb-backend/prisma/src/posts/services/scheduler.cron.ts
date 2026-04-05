// ─────────────────────────────────────────────
// Scheduled Publish Cron
// Run via: tsx src/posts/services/scheduler.cron.ts
// Or set up as a Vercel Cron / external cron job
// ─────────────────────────────────────────────

import 'dotenv/config';
import { processScheduledPosts } from './publish.service';

async function run() {
  console.log(`[Scheduler] Running at ${new Date().toISOString()}`);
  try {
    const count = await processScheduledPosts();
    console.log(`[Scheduler] Published ${count} scheduled post(s)`);
  } catch (err) {
    console.error('[Scheduler] Error:', err);
    process.exit(1);
  }
  process.exit(0);
}

run();
