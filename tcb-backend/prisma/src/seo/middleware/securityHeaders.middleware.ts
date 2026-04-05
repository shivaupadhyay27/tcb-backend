import { Request, Response, NextFunction } from 'express';

const PRIVATE_PREFIXES = ['/admin', '/api', '/auth', '/dashboard'];

export const seoSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  const path = req.path.toLowerCase();
  const isPrivate = PRIVATE_PREFIXES.some((p) => path.startsWith(p));

  if (isPrivate) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  }

  next();
};
