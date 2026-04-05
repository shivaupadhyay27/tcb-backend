// ─────────────────────────────────────────────
// Vercel On-Demand ISR Revalidation
// ─────────────────────────────────────────────

const FRONTEND_URL =
  process.env.FRONTEND_URL || process.env.SITE_URL || 'https://thecorporateblog.com';
const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET || '';

interface RevalidationResult {
  success: boolean;
  paths: string[];
  errors: string[];
  durationMs: number;
}

export async function triggerISRRevalidation(paths: string[]): Promise<RevalidationResult> {
  const start = Date.now();
  const errors: string[] = [];
  const succeeded: string[] = [];

  if (!REVALIDATION_SECRET) {
    console.warn('[ISR] REVALIDATION_SECRET not set — skipping revalidation');
    return {
      success: false,
      paths: [],
      errors: ['REVALIDATION_SECRET not configured'],
      durationMs: Date.now() - start,
    };
  }

  for (const path of paths) {
    try {
      const url = `${FRONTEND_URL}/api/revalidate?path=${encodeURIComponent(path)}&secret=${encodeURIComponent(REVALIDATION_SECRET)}`;
      const res = await fetch(url, { method: 'POST' });

      if (res.ok) {
        succeeded.push(path);
        console.log(`[ISR] ✅ Revalidated: ${path}`);
      } else {
        const body = await res.text();
        errors.push(`${path}: ${res.status} ${body}`);
        console.error(`[ISR] ❌ Failed to revalidate ${path}: ${res.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`${path}: ${msg}`);
      console.error(`[ISR] ❌ Error revalidating ${path}: ${msg}`);
    }
  }

  return {
    success: errors.length === 0,
    paths: succeeded,
    errors,
    durationMs: Date.now() - start,
  };
}

export function getPostRevalidationPaths(
  postSlug: string,
  categorySlug?: string,
  authorSlug?: string,
): string[] {
  const paths = [
    '/blog', // Blog listing
    `/blog/${postSlug}`, // Post page
  ];

  if (categorySlug) {
    paths.push(`/blog/category/${categorySlug}`);
  }
  if (authorSlug) {
    paths.push(`/blog/author/${authorSlug}`);
  }

  return paths;
}
