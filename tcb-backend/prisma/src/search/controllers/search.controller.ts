import { Request, Response, NextFunction } from 'express';
import {
  searchPosts,
  getRelatedPosts,
  getPopularPosts,
  getSearchAnalytics,
} from '../services/search.service';
import { searchQuerySchema } from '../validators/search.validators';

// GET /search?q=&page=&limit=
export const handleSearch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = searchQuerySchema.parse(req.query);

    const result = await searchPosts({
      query: parsed.q,
      page: parsed.page,
      limit: parsed.limit,
      userId: req.user?.sub,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.setHeader('X-Search-Duration-Ms', result.durationMs.toString());
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// GET /posts/:id/related
export const handleRelatedPosts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 4, 10);
    const posts = await getRelatedPosts(req.params.id, limit);
    res.status(200).json({ status: 'success', data: posts });
  } catch (err) {
    next(err);
  }
};

// GET /posts/popular
export const handlePopularPosts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const posts = await getPopularPosts(limit);
    res.status(200).json({ status: 'success', data: posts });
  } catch (err) {
    next(err);
  }
};

// GET /search/analytics (admin only)
export const handleSearchAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 7, 90);
    const analytics = await getSearchAnalytics(days);
    res.status(200).json({ status: 'success', data: analytics });
  } catch (err) {
    next(err);
  }
};
