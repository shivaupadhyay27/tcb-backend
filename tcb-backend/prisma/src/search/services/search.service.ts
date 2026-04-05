import prisma from '../../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../../lib/cache';
import { PostResponse, PaginatedPostsResponse } from '../../posts/types/post.types';
import { Prisma } from '@prisma/client';

// ── Shared select (no N+1) ───────────────────

const POST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  status: true,
  metaTitle: true,
  metaDesc: true,
  canonicalUrl: true,
  ogTitle: true,
  ogDesc: true,
  ogImage: true,
  twitterTitle: true,
  twitterDesc: true,
  twitterImage: true,
  schemaType: true,
  publishedAt: true,
  readingTimeMin: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, slug: true, avatarUrl: true, bio: true } },
  postCategories: { select: { category: { select: { id: true, name: true, slug: true } } } },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatPost(raw: any): PostResponse {
  return {
    ...raw,
    categories:
      raw.postCategories?.map(
        (pc: { category: { id: string; name: string; slug: string } }) => pc.category,
      ) || [],
  };
}

// ── Input sanitization ───────────────────────

function sanitizeSearchQuery(input: string): string {
  // Remove SQL injection vectors and special chars
  return input
    .replace(/[;'"`\\/*-]/g, '') // strip SQL meta chars
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
    .slice(0, 200); // max 200 chars
}

function toTsQuery(input: string): string {
  const sanitized = sanitizeSearchQuery(input);
  if (!sanitized) return '';

  // Convert to tsquery format: split words, join with &
  const words = sanitized
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map((w) => `${w}:*`) // prefix matching
    .join(' & ');

  return words;
}

// ── Full-text search ─────────────────────────

export interface SearchResult extends PaginatedPostsResponse {
  query: string;
  durationMs: number;
}

export async function searchPosts(options: {
  query: string;
  page?: number;
  limit?: number;
  userId?: string;
  ip?: string;
}): Promise<SearchResult> {
  const { query: rawQuery, page = 1, limit = 20, userId, ip } = options;
  const start = Date.now();

  const sanitized = sanitizeSearchQuery(rawQuery);
  if (!sanitized || sanitized.length < 2) {
    return { posts: [], total: 0, page, totalPages: 0, query: sanitized, durationMs: 0 };
  }

  const tsQuery = toTsQuery(sanitized);
  if (!tsQuery) {
    return { posts: [], total: 0, page, totalPages: 0, query: sanitized, durationMs: 0 };
  }

  const skip = (page - 1) * limit;

  try {
    // Use raw query for tsvector search — parameterized to prevent injection
    const postIds = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
      SELECT id, ts_rank(search_vector, to_tsquery('english', ${tsQuery})) AS rank
      FROM posts
      WHERE status = 'PUBLISHED'
        AND published_at IS NOT NULL
        AND search_vector @@ to_tsquery('english', ${tsQuery})
      ORDER BY rank DESC, published_at DESC
      LIMIT ${limit}
      OFFSET ${skip}
    `;

    const totalResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count
      FROM posts
      WHERE status = 'PUBLISHED'
        AND published_at IS NOT NULL
        AND search_vector @@ to_tsquery('english', ${tsQuery})
    `;

    const total = Number(totalResult[0]?.count || 0);
    const ids = postIds.map((r) => r.id);

    // Fetch full post data with relations (no N+1)
    let posts: PostResponse[] = [];
    if (ids.length > 0) {
      const fullPosts = await prisma.post.findMany({
        where: { id: { in: ids } },
        select: POST_SELECT,
      });

      // Maintain rank order
      const postMap = new Map(fullPosts.map((p) => [p.id, p]));
      posts = ids
        .map((id) => postMap.get(id))
        .filter(Boolean)
        .map(formatPost);
    }

    const durationMs = Date.now() - start;

    // Log search query (non-blocking)
    logSearchQuery(sanitized, total, durationMs, userId, ip).catch(() => {});

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      query: sanitized,
      durationMs,
    };
  } catch (err) {
    // Fallback to ILIKE search if tsvector fails
    console.error('[Search] tsvector search failed, falling back to ILIKE:', err);
    return fallbackSearch(sanitized, page, limit, start, userId, ip);
  }
}

// ── Fallback ILIKE search ────────────────────

async function fallbackSearch(
  query: string,
  page: number,
  limit: number,
  startTime: number,
  userId?: string,
  ip?: string,
): Promise<SearchResult> {
  const skip = (page - 1) * limit;

  const where: Prisma.PostWhereInput = {
    status: 'PUBLISHED',
    publishedAt: { not: null },
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { excerpt: { contains: query, mode: 'insensitive' } },
      { metaTitle: { contains: query, mode: 'insensitive' } },
    ],
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: POST_SELECT,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  const durationMs = Date.now() - startTime;
  logSearchQuery(query, total, durationMs, userId, ip).catch(() => {});

  return {
    posts: posts.map(formatPost),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    query,
    durationMs,
  };
}

// ── Related posts (shared categories) ────────

export async function getRelatedPosts(postId: string, limit = 4): Promise<PostResponse[]> {
  // Get current post's categories
  const postCategories = await prisma.postCategory.findMany({
    where: { postId },
    select: { categoryId: true },
  });

  if (postCategories.length === 0) {
    // Fallback: return latest published posts
    const latest = await prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { not: null },
        id: { not: postId },
      },
      select: POST_SELECT,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
    return latest.map(formatPost);
  }

  const categoryIds = postCategories.map((pc) => pc.categoryId);

  // Find posts sharing categories, ordered by overlap count
  const relatedPostIds = await prisma.$queryRaw<Array<{ post_id: string; shared: bigint }>>`
    SELECT pc."postId" as post_id, count(*) as shared
    FROM post_categories pc
    JOIN posts p ON p.id = pc."postId"
    WHERE pc."categoryId" = ANY(${categoryIds}::text[])
      AND pc."postId" != ${postId}
      AND p.status = 'PUBLISHED'
      AND p.published_at IS NOT NULL
    GROUP BY pc."postId"
    ORDER BY shared DESC, p.published_at DESC
    LIMIT ${limit}
  `;

  if (relatedPostIds.length === 0) {
    const latest = await prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { not: null },
        id: { not: postId },
      },
      select: POST_SELECT,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
    return latest.map(formatPost);
  }

  const ids = relatedPostIds.map((r) => r.post_id);
  const posts = await prisma.post.findMany({
    where: { id: { in: ids } },
    select: POST_SELECT,
  });

  // Maintain relevance order
  const postMap = new Map(posts.map((p) => [p.id, p]));
  return ids
    .map((id) => postMap.get(id))
    .filter(Boolean)
    .map(formatPost);
}

// ── Popular posts (cached) ───────────────────

export async function getPopularPosts(limit = 10): Promise<PostResponse[]> {
  const cacheKey = CacheKeys.postsList(0, limit); // special key for popular
  const cached = await cache.get<string>(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* fall through */
    }
  }

  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', publishedAt: { not: null } },
    select: POST_SELECT,
    orderBy: { viewCount: 'desc' },
    take: limit,
  });

  const formatted = posts.map(formatPost);
  await cache.set(cacheKey, JSON.stringify(formatted), CacheTTL.POSTS_LIST);
  return formatted;
}

// ── Search query logging ─────────────────────

async function logSearchQuery(
  query: string,
  resultCount: number,
  durationMs: number,
  userId?: string,
  ip?: string,
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO search_query_logs (id, query, "resultCount", "durationMs", "userId", ip, "createdAt")
      VALUES (gen_random_uuid(), ${query}, ${resultCount}, ${durationMs}, ${userId || null}, ${ip || null}, NOW())
    `;
  } catch (err) {
    console.error('[Search] Failed to log query:', err);
  }
}

// ── Search analytics ─────────────────────────

export async function getSearchAnalytics(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const topQueries = await prisma.$queryRaw<
    Array<{ query: string; count: bigint; avg_duration: number; avg_results: number }>
  >`
    SELECT query, count(*) as count, avg("durationMs")::int as avg_duration, avg("resultCount")::int as avg_results
    FROM search_query_logs
    WHERE "createdAt" >= ${since}
    GROUP BY query
    ORDER BY count DESC
    LIMIT 50
  `;

  const slowQueries = await prisma.$queryRaw<
    Array<{ query: string; duration: number; created: Date }>
  >`
    SELECT query, "durationMs" as duration, "createdAt" as created
    FROM search_query_logs
    WHERE "createdAt" >= ${since} AND "durationMs" > 500
    ORDER BY "durationMs" DESC
    LIMIT 20
  `;

  return { topQueries, slowQueries };
}
