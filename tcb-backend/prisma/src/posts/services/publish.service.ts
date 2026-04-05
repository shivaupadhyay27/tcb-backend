import prisma from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { triggerISRRevalidation, getPostRevalidationPaths } from '../../lib/revalidate';
import { buildUrl } from '../../seo/constants/url-conventions';
import { PostResponse } from '../types/post.types';

// ── Shared select ────────────────────────────

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
  scheduledAt: true,
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
    categories: raw.postCategories.map(
      (pc: { category: { id: string; name: string; slug: string } }) => pc.category,
    ),
  };
}

// ── Pre-publish validation ───────────────────

export interface PublishValidationError {
  field: string;
  message: string;
}

export function validatePublishRequirements(post: {
  title: string;
  slug: string;
  content: string;
  ogImage: string | null;
  metaDesc: string | null;
  excerpt: string | null;
}): PublishValidationError[] {
  const errors: PublishValidationError[] = [];

  if (!post.title || post.title.trim().length < 5) {
    errors.push({ field: 'title', message: 'Title is required (min 5 characters)' });
  }

  if (!post.slug || post.slug.trim().length < 3) {
    errors.push({ field: 'slug', message: 'Slug is required (min 3 characters)' });
  }

  if (!post.ogImage) {
    errors.push({
      field: 'ogImage',
      message: 'Banner image (OG image) is required for publishing',
    });
  }

  if (!post.metaDesc && !post.excerpt) {
    errors.push({
      field: 'metaDesc',
      message: 'Meta description or excerpt is required for publishing',
    });
  }

  if (!post.content || post.content.trim().length < 50) {
    errors.push({ field: 'content', message: 'Content must be at least 50 characters' });
  }

  // Check for oversized images in content
  try {
    const doc = JSON.parse(post.content);
    if (doc.blocks) {
      for (const block of doc.blocks) {
        if (block.type === 'image') {
          if (!block.altText) {
            errors.push({ field: `block:${block.id}`, message: 'All images must have alt text' });
          }
          if (block.width && block.width > 4096) {
            errors.push({
              field: `block:${block.id}`,
              message: 'Image width exceeds 4096px maximum',
            });
          }
          if (block.height && block.height > 4096) {
            errors.push({
              field: `block:${block.id}`,
              message: 'Image height exceeds 4096px maximum',
            });
          }
        }
      }
    }
  } catch {
    // Content is not JSON — skip block-level validation
  }

  return errors;
}

// ── Publish post (atomic transaction) ────────

export interface PublishOptions {
  publishedAt?: string | null; // ISO datetime — future date = scheduled
}

export async function publishPost(
  postId: string,
  userId: string,
  userRole: string,
  options: PublishOptions = {},
): Promise<{
  post: PostResponse;
  isScheduled: boolean;
  auditLogId: string;
  revalidation: { success: boolean; paths: string[] };
}> {
  const start = Date.now();

  // ── Fetch existing post ─────────────────────
  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      status: true,
      authorId: true,
      ogImage: true,
      metaDesc: true,
      excerpt: true,
      publishedAt: true,
      author: { select: { slug: true } },
      postCategories: { select: { category: { select: { slug: true } } } },
    },
  });

  if (!existing) throw new AppError('Post not found', 404);

  // ── Permission check ────────────────────────
  const isEditor = userRole === 'EDITOR' || userRole === 'ADMIN';
  if (!isEditor) throw new AppError('Only Editors and Admins can publish posts', 403);

  // ── Pre-publish validation ──────────────────
  const validationErrors = validatePublishRequirements({
    title: existing.title,
    slug: existing.slug,
    content: existing.content,
    ogImage: existing.ogImage,
    metaDesc: existing.metaDesc,
    excerpt: existing.excerpt,
  });

  if (validationErrors.length > 0) {
    throw new AppError(`Cannot publish: ${validationErrors.map((e) => e.message).join('; ')}`, 422);
  }

  // ── Determine publish timing ────────────────
  const now = new Date();
  const requestedDate = options.publishedAt ? new Date(options.publishedAt) : null;
  const isScheduled = requestedDate !== null && requestedDate > now;
  const publishDate = isScheduled ? null : requestedDate || existing.publishedAt || now;
  const scheduledAt = isScheduled ? requestedDate : null;
  const targetStatus = isScheduled ? 'DRAFT' : 'PUBLISHED';

  // ── Atomic transaction ──────────────────────
  const result = await prisma.$transaction(async (tx) => {
    // Update the post
    const updatedPost = await tx.post.update({
      where: { id: postId },
      data: {
        status: targetStatus,
        publishedAt: publishDate,
        scheduledAt,
        canonicalUrl: existing.slug ? buildUrl.post(existing.slug) : undefined,
      },
      select: POST_SELECT,
    });

    // Create audit log entry
    const auditLog = await tx.publishAuditLog.create({
      data: {
        postId,
        userId,
        action: isScheduled ? 'SCHEDULE' : 'PUBLISH',
        fromStatus: existing.status,
        toStatus: targetStatus,
        scheduledAt,
        publishedAt: publishDate,
        durationMs: Date.now() - start,
        metadata: {
          userRole,
          hadPreviousPublishDate: !!existing.publishedAt,
          isReschedule: !!existing.publishedAt && isScheduled,
        },
      },
    });

    return { post: updatedPost, auditLogId: auditLog.id };
  });

  const formatted = formatPost(result.post);

  // ── Trigger ISR revalidation (non-blocking) ─
  let revalidation = { success: false, paths: [] as string[] };
  if (!isScheduled) {
    const categorySlug = existing.postCategories[0]?.category?.slug;
    const authorSlug = existing.author.slug;
    const paths = getPostRevalidationPaths(existing.slug, categorySlug, authorSlug);

    // Fire and forget — don't block the response
    triggerISRRevalidation(paths)
      .then((r) => {
        revalidation = r;
        console.log(
          `[Publish] ISR revalidation completed in ${r.durationMs}ms for ${r.paths.length} paths`,
        );
      })
      .catch((err) => {
        console.error('[Publish] ISR revalidation failed:', err);
      });

    revalidation = { success: true, paths };
  }

  const durationMs = Date.now() - start;
  console.log(
    `[Publish] Post "${existing.slug}" ${isScheduled ? 'scheduled' : 'published'} in ${durationMs}ms`,
  );

  return {
    post: formatted,
    isScheduled,
    auditLogId: result.auditLogId,
    revalidation,
  };
}

// ── Unpublish ────────────────────────────────

export async function unpublishPost(
  postId: string,
  userId: string,
  userRole: string,
): Promise<PostResponse> {
  const start = Date.now();

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      slug: true,
      status: true,
      authorId: true,
      author: { select: { slug: true } },
      postCategories: { select: { category: { select: { slug: true } } } },
    },
  });

  if (!existing) throw new AppError('Post not found', 404);

  const isEditor = userRole === 'EDITOR' || userRole === 'ADMIN';
  if (!isEditor) throw new AppError('Only Editors and Admins can unpublish posts', 403);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.post.update({
      where: { id: postId },
      data: { status: 'DRAFT', publishedAt: null, scheduledAt: null },
      select: POST_SELECT,
    });

    await tx.publishAuditLog.create({
      data: {
        postId,
        userId,
        action: 'UNPUBLISH',
        fromStatus: existing.status,
        toStatus: 'DRAFT',
        durationMs: Date.now() - start,
        metadata: { userRole },
      },
    });

    return updated;
  });

  // Revalidate to remove from public
  const categorySlug = existing.postCategories[0]?.category?.slug;
  const paths = getPostRevalidationPaths(existing.slug, categorySlug, existing.author.slug);
  triggerISRRevalidation(paths).catch(console.error);

  return formatPost(result);
}

// ── Get publish history ──────────────────────

export async function getPublishHistory(postId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.publishAuditLog.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, slug: true, avatarUrl: true } },
      },
    }),
    prisma.publishAuditLog.count({ where: { postId } }),
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
}

// ── Scheduled publish processor ──────────────
// Run this via a cron job: e.g., every minute

export async function processScheduledPosts(): Promise<number> {
  const now = new Date();

  const scheduled = await prisma.post.findMany({
    where: {
      scheduledAt: { lte: now },
      status: 'DRAFT',
    },
    select: {
      id: true,
      slug: true,
      authorId: true,
      author: { select: { slug: true } },
      postCategories: { select: { category: { select: { slug: true } } } },
    },
  });

  let published = 0;

  for (const post of scheduled) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.post.update({
          where: { id: post.id },
          data: { status: 'PUBLISHED', publishedAt: now, scheduledAt: null },
        });

        await tx.publishAuditLog.create({
          data: {
            postId: post.id,
            userId: post.authorId,
            action: 'SCHEDULED_PUBLISH',
            fromStatus: 'DRAFT',
            toStatus: 'PUBLISHED',
            publishedAt: now,
            metadata: { automated: true },
          },
        });
      });

      const categorySlug = post.postCategories[0]?.category?.slug;
      const paths = getPostRevalidationPaths(post.slug, categorySlug, post.author.slug);
      triggerISRRevalidation(paths).catch(console.error);

      published++;
      console.log(`[Scheduler] Published scheduled post: ${post.slug}`);
    } catch (err) {
      console.error(`[Scheduler] Failed to publish ${post.slug}:`, err);
    }
  }

  return published;
}
