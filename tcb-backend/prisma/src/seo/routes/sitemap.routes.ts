import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';

const router = Router();
const SITE_URL = process.env.SITE_URL || 'https://thecorporateblog.com';

function sitemapEntry({
  url,
  lastmod,
  changefreq,
  priority,
}: {
  url: string;
  lastmod?: Date;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}): string {
  return `  <url>
    <loc>${url}</loc>
    ${lastmod ? `<lastmod>${lastmod.toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}

router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const [posts, categories, authors] = await Promise.all([
      prisma.post.findMany({
        where: { status: 'PUBLISHED', publishedAt: { not: null } },
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.user.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    ]);

    const urls: string[] = [
      sitemapEntry({ url: SITE_URL, lastmod: new Date(), changefreq: 'daily', priority: 1.0 }),
      sitemapEntry({
        url: `${SITE_URL}/blog`,
        lastmod: new Date(),
        changefreq: 'hourly',
        priority: 0.9,
      }),
      ...posts.map((post) =>
        sitemapEntry({
          url: `${SITE_URL}/blog/${post.slug}`,
          lastmod: post.updatedAt,
          changefreq: 'weekly',
          priority: 0.8,
        }),
      ),
      ...categories.map((cat) =>
        sitemapEntry({
          url: `${SITE_URL}/blog/category/${cat.slug}`,
          lastmod: cat.updatedAt,
          changefreq: 'daily',
          priority: 0.7,
        }),
      ),
      ...authors.map((author) =>
        sitemapEntry({
          url: `${SITE_URL}/blog/author/${author.slug}`,
          lastmod: author.updatedAt,
          changefreq: 'weekly',
          priority: 0.6,
        }),
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
    http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.send(xml);
  } catch {
    res.status(500).json({ status: 'error', message: 'Failed to generate sitemap' });
  }
});

export default router;
