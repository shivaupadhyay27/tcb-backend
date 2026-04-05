import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';

function generateViewerHash(req: Request): string {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const today = new Date().toISOString().split('T')[0];
  return crypto.createHash('sha256').update(`${ip}-${ua}-${today}`).digest('hex');
}

export async function handleTrackView(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id, status: 'PUBLISHED' },
      select: { id: true },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const viewerHash = generateViewerHash(req);
    const today = new Date().toISOString().split('T')[0];

    const existingView = await prisma.postView.findFirst({
      where: {
        postId: id,
        viewerHash,
        viewedAt: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lte: new Date(`${today}T23:59:59.999Z`),
        },
      },
    });

    if (!existingView) {
      await prisma.$transaction([
        prisma.postView.create({
          data: { postId: id, viewerHash },
        }),
        prisma.post.update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        }),
      ]);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('View tracking error:', error);
    return res.status(500).json({ error: 'Failed to track view' });
  }
}

export async function handleGetPopularPosts(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        ogImage: true,
        viewCount: true,
        publishedAt: true,
        readingTimeMin: true,
        author: {
          select: { name: true, slug: true },
        },
        postCategories: {
          include: {
            category: {
              select: { name: true, slug: true },
            },
          },
        },
      },
    });

    const formatted = posts.map((post) => ({
      ...post,
      categories: post.postCategories.map((pc) => pc.category),
      postCategories: undefined,
    }));

    return res.json({ posts: formatted });
  } catch (error) {
    console.error('Popular posts error:', error);
    return res.status(500).json({ error: 'Failed to fetch popular posts' });
  }
}
