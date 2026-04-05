import { Request, Response, NextFunction } from 'express';

const SITE_URL = process.env.SITE_URL || 'https://thecorporateblog.com';

export const canonicalHeaderMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const path = req.path.toLowerCase();

  const isBlocked =
    path.startsWith('/admin') ||
    path.startsWith('/api') ||
    path.startsWith('/auth') ||
    path.startsWith('/preview');

  if (!isBlocked) {
    const cleanPath = req.path.split('?')[0];
    res.setHeader('Link', `<${SITE_URL}${cleanPath}>; rel="canonical"`);
  }

  next();
};
