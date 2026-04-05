import { Request, Response, NextFunction } from 'express';
import {
  publishPost,
  unpublishPost,
  getPublishHistory,
  validatePublishRequirements,
} from '../services/publish.service';

// PUT /posts/:id/publish
export const handlePublishPost = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const start = Date.now();
    const { publishedAt } = req.body as { publishedAt?: string };

    const result = await publishPost(req.params.id, req.user!.sub, req.user!.role, { publishedAt });

    const latencyMs = Date.now() - start;
    console.log(`[Publish Latency] POST /posts/${req.params.id}/publish → ${latencyMs}ms`);

    res.status(200).json({
      status: 'success',
      data: {
        post: result.post,
        isScheduled: result.isScheduled,
        auditLogId: result.auditLogId,
        revalidation: result.revalidation,
        latencyMs,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /posts/:id/unpublish
export const handleUnpublishPost = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const post = await unpublishPost(req.params.id, req.user!.sub, req.user!.role);
    res.status(200).json({ status: 'success', data: post });
  } catch (err) {
    next(err);
  }
};

// GET /posts/:id/publish-history
export const handleGetPublishHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const result = await getPublishHistory(
      req.params.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// POST /posts/:id/validate-publish
export const handleValidatePublish = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const prisma = (await import('../../lib/prisma')).default;
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      select: {
        title: true,
        slug: true,
        content: true,
        ogImage: true,
        metaDesc: true,
        excerpt: true,
      },
    });

    if (!post) {
      res.status(404).json({ status: 'error', message: 'Post not found' });
      return;
    }

    const errors = validatePublishRequirements(post);
    res.status(200).json({
      status: 'success',
      data: {
        canPublish: errors.length === 0,
        errors,
      },
    });
  } catch (err) {
    next(err);
  }
};
