import { Request, Response, NextFunction } from 'express';
import {
  createPost,
  updatePost,
  getPostById,
  getPostBySlug,
  listPosts,
  listPublishedPosts,
  getPostsByCategorySlug,
  getPostsByAuthorSlug,
  deletePost,
} from '../services/post.service';
import { CreatePostInput, UpdatePostInput } from '../validators/post.validators';
import { PostStatus } from '@prisma/client';

export const handleCreatePost = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const post = await createPost(req.user!.sub, req.body as CreatePostInput);
    res.status(201).json({ status: 'success', data: post });
  } catch (err) {
    next(err);
  }
};

export const handleUpdatePost = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const post = await updatePost(
      req.params.id,
      req.user!.sub,
      req.user!.role,
      req.body as UpdatePostInput,
    );
    res.status(200).json({ status: 'success', data: post });
  } catch (err) {
    next(err);
  }
};

export const handleGetPost = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const post = await getPostById(req.params.id);
    res.status(200).json({ status: 'success', data: post });
  } catch (err) {
    next(err);
  }
};

export const handleGetPostBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const post = await getPostBySlug(req.params.slug);
    res.status(200).json({ status: 'success', data: post });
  } catch (err) {
    next(err);
  }
};

export const handleListPosts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, authorId, categoryId, page, limit } = req.query as Record<string, string>;
    const result = await listPosts({
      status: status as PostStatus | undefined,
      authorId,
      categoryId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

export const handleListPublishedPosts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const result = await listPublishedPosts({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

export const handleGetPostsByCategorySlug = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const result = await getPostsByCategorySlug(req.params.slug, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

export const handleGetPostsByAuthorSlug = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const result = await getPostsByAuthorSlug(req.params.slug, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

export const handleDeletePost = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await deletePost(req.params.id, req.user!.sub, req.user!.role);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
