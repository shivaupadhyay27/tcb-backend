import prisma from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import {
  generateSlug,
  makePostSlugUnique,
  calculateReadingTime,
  validateSlug,
} from '../../seo/services/slug.service';
import { buildUrl } from '../../seo/constants/url-conventions';
import { CreatePostInput, UpdatePostInput } from '../validators/post.validators';
import { PostResponse, PaginatedPostsResponse } from '../types/post.types';
import { PostStatus } from '@prisma/client';

// ── Shared select shape ──────────────────────

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
    categories: raw.postCategories.map(
      (pc: { category: { id: string; name: string; slug: string } }) => pc.category,
    ),
  };
}

// ── Published-only where clause ──────────────

function publishedWhere() {
  return {
    status: 'PUBLISHED' as PostStatus,
    publishedAt: { not: null },
  };
}

// ── Category validation ──────────────────────

async function validateCategories(categoryIds: string[]): Promise<void> {
  if (!categoryIds.length) return;
  const found = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true },
  });
  if (found.length !== categoryIds.length) {
    const missing = categoryIds.filter((id) => !found.map((c) => c.id).includes(id));
    throw new AppError(`Category IDs not found: ${missing.join(', ')}`, 404);
  }
}

// ── FAQ Block validation ─────────────────────
// Kyu: FAQ block mein empty questions/answers nahi hone chahiye
// Kya hoga: Invalid FAQ blocks save nahi honge — data quality ensure hogi

function validateFAQBlocks(content: string): void {
  try {
    const doc = JSON.parse(content);
    if (!doc.blocks) return;

    for (const block of doc.blocks) {
      if (block.type === 'faq') {
        if (!block.items || block.items.length === 0) {
          throw new AppError('FAQ block must have at least one item', 422);
        }
        for (const item of block.items) {
          if (!item.question?.trim()) {
            throw new AppError('FAQ block: question cannot be empty', 422);
          }
          if (!item.answer?.trim()) {
            throw new AppError('FAQ block: answer cannot be empty', 422);
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
  }
}

// ── CREATE ───────────────────────────────────

export async function createPost(authorId: string, input: CreatePostInput): Promise<PostResponse> {
  const { title, content, categoryIds = [], slug: manualSlug, ...rest } = input;

  let baseSlug: string;
  if (manualSlug) {
    const { valid, errors } = validateSlug(manualSlug);
    if (!valid) throw new AppError(errors.join(', '), 422);
    baseSlug = manualSlug;
  } else {
    baseSlug = generateSlug(title);
  }

  const slug = await makePostSlugUnique(baseSlug);
  await validateCategories(categoryIds);

  // FAQ validation — empty questions/answers allowed nahi
  if (content) validateFAQBlocks(content);

  const readingTimeMin = calculateReadingTime(content);
  const canonicalUrl = buildUrl.post(slug);

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      content,
      readingTimeMin,
      canonicalUrl,
      authorId,
      status: 'DRAFT',
      publishedAt: null,
      ...rest,
      postCategories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
    },
    select: POST_SELECT,
  });

  return formatPost(post);
}

// ── UPDATE ───────────────────────────────────

export async function updatePost(
  postId: string,
  requesterId: string,
  requesterRole: string,
  input: UpdatePostInput,
): Promise<PostResponse> {
  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, slug: true, status: true },
  });

  if (!existing) throw new AppError('Post not found', 404);

  const isOwner = existing.authorId === requesterId;
  const isEditor = requesterRole === 'EDITOR' || requesterRole === 'ADMIN';
  if (!isOwner && !isEditor)
    throw new AppError('You do not have permission to edit this post', 403);

  const {
    categoryIds,
    slug: manualSlug,
    status,
    publishedAt,
    content,
    canonicalUrl: inputCanonical,
    ...rest
  } = input;

  let slug = existing.slug;
  if (manualSlug && manualSlug !== existing.slug) {
    const { valid, errors } = validateSlug(manualSlug);
    if (!valid) throw new AppError(errors.join(', '), 422);
    slug = await makePostSlugUnique(manualSlug, postId);
  }

  // ── published_at null guard ─────────────────
  let resolvedPublishedAt = publishedAt;
  if (status === 'PUBLISHED' && existing.status === 'DRAFT') {
    resolvedPublishedAt = resolvedPublishedAt
      ? (new Date(resolvedPublishedAt as string) as unknown as null)
      : (new Date() as unknown as null);
  }
  if (status === 'DRAFT' && existing.status === 'PUBLISHED') {
    resolvedPublishedAt = null;
  }
  if (status === 'ARCHIVED') {
    resolvedPublishedAt = undefined;
  }

  // FAQ validation — empty questions/answers allowed nahi
  if (content) validateFAQBlocks(content);

  const readingTimeMin = content ? calculateReadingTime(content) : undefined;

  // ── Canonical override logic ────────────────
  let canonicalUrl: string | undefined;
  if (inputCanonical) {
    canonicalUrl = inputCanonical;
  } else if (slug !== existing.slug) {
    canonicalUrl = buildUrl.post(slug);
  }

  const updateData: Record<string, unknown> = {
    ...rest,
    slug,
    ...(content && { content }),
    ...(status && { status }),
    ...(readingTimeMin && { readingTimeMin }),
    ...(canonicalUrl && { canonicalUrl }),
    ...(resolvedPublishedAt !== undefined && { publishedAt: resolvedPublishedAt }),
  };

  if (categoryIds !== undefined) {
    await validateCategories(categoryIds);
    await prisma.postCategory.deleteMany({ where: { postId } });
    updateData.postCategories = { create: categoryIds.map((categoryId) => ({ categoryId })) };
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: updateData,
    select: POST_SELECT,
  });
  return formatPost(updated);
}

// ── GET BY ID (admin - any status) ───────────

export async function getPostById(postId: string): Promise<PostResponse> {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: POST_SELECT });
  if (!post) throw new AppError('Post not found', 404);
  return formatPost(post);
}

// ── GET BY SLUG (public - published only) ────

export async function getPostBySlug(slug: string): Promise<PostResponse> {
  const post = await prisma.post.findUnique({ where: { slug }, select: POST_SELECT });
  if (!post) throw new AppError('Post not found', 404);
  if (post.status !== 'PUBLISHED') throw new AppError('Post not found', 404);
  if (!post.publishedAt) throw new AppError('Post not found', 404);
  return formatPost(post);
}

// ── LIST POSTS ───────────────────────────────

export async function listPosts(options: {
  status?: PostStatus;
  authorId?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedPostsResponse> {
  const { status, authorId, categoryId, page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(authorId && { authorId }),
    ...(categoryId && { postCategories: { some: { categoryId } } }),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: POST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return { posts: posts.map(formatPost), total, page, totalPages: Math.ceil(total / limit) };
}

// ── LIST PUBLISHED POSTS (public) ────────────

export async function listPublishedPosts(options: {
  page?: number;
  limit?: number;
}): Promise<PaginatedPostsResponse> {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const where = publishedWhere();

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

  return { posts: posts.map(formatPost), total, page, totalPages: Math.ceil(total / limit) };
}

// ── GET POSTS BY CATEGORY SLUG (public, paginated) ──

export async function getPostsByCategorySlug(
  categorySlug: string,
  options: {
    page?: number;
    limit?: number;
  },
): Promise<
  PaginatedPostsResponse & {
    category: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      metaTitle: string | null;
      metaDesc: string | null;
      ogImage: string | null;
    };
  }
> {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      metaTitle: true,
      metaDesc: true,
      ogImage: true,
    },
  });

  if (!category) throw new AppError('Category not found', 404);

  const where = {
    ...publishedWhere(),
    postCategories: { some: { categoryId: category.id } },
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

  return {
    category,
    posts: posts.map(formatPost),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ── GET POSTS BY AUTHOR SLUG (public) ────────

export async function getPostsByAuthorSlug(
  authorSlug: string,
  options: {
    page?: number;
    limit?: number;
  },
): Promise<
  PaginatedPostsResponse & {
    author: {
      id: string;
      name: string;
      slug: string;
      avatarUrl: string | null;
      bio: string | null;
    };
  }
> {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const author = await prisma.user.findUnique({
    where: { slug: authorSlug },
    select: { id: true, name: true, slug: true, avatarUrl: true, bio: true },
  });

  if (!author) throw new AppError('Author not found', 404);

  const where = {
    ...publishedWhere(),
    authorId: author.id,
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

  return {
    author,
    posts: posts.map(formatPost),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ── DELETE ────────────────────────────────────

export async function deletePost(
  postId: string,
  requesterId: string,
  requesterRole: string,
): Promise<void> {
  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!existing) throw new AppError('Post not found', 404);

  const isOwner = existing.authorId === requesterId;
  const isAdmin = requesterRole === 'ADMIN';
  if (!isOwner && !isAdmin)
    throw new AppError('You do not have permission to delete this post', 403);

  await prisma.post.delete({ where: { id: postId } });
}
