export function generateRobotsTxt(siteUrl: string): string {
  return `
User-agent: *
Allow: /

# Block admin and API routes
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Disallow: /dashboard/

# Block draft and preview pages
Disallow: /preview/
Disallow: /*?status=draft

# Block pagination duplicates
Disallow: /*?page=

# Allow crawling of assets
Allow: /*.js
Allow: /*.css
Allow: /*.png
Allow: /*.jpg
Allow: /*.webp
Allow: /*.svg

# Sitemap location
Sitemap: ${siteUrl}/sitemap.xml

# Crawl delay
Crawl-delay: 1
`.trim();
}
