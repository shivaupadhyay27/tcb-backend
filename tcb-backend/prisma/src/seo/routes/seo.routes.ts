import { Router, Request, Response } from 'express';
import { generateRobotsTxt } from '../constants/robots';
import sitemapRouter from './sitemap.routes';

const router = Router();
const SITE_URL = process.env.SITE_URL || 'https://thecorporateblog.com';

router.get('/robots.txt', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(generateRobotsTxt(SITE_URL));
});

router.use('/', sitemapRouter);

export default router;
