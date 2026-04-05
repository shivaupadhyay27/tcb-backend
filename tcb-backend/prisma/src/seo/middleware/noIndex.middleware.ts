import { Request, Response, NextFunction } from 'express';

const NO_INDEX_PREFIXES = ['/admin', '/api', '/auth', '/dashboard', '/preview'] as const;
const NO_INDEX_EXACT = ['/auth/login', '/auth/register', '/auth/callback'] as const;

export const noIndexMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const path = req.path.toLowerCase();

  const shouldBlock =
    NO_INDEX_PREFIXES.some((prefix) => path.startsWith(prefix)) ||
    NO_INDEX_EXACT.some((exact) => path === exact);

  if (shouldBlock) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  }

  next();
};

export const setNoIndex = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
};
