export const SEO_CHECKLIST = {
  HEAD_TAGS: [
    { id: 'title', required: true, description: '<title> tag, 50–60 chars' },
    { id: 'meta-description', required: true, description: 'meta description, 150–160 chars' },
    { id: 'canonical', required: true, description: 'Self-referencing canonical URL' },
    {
      id: 'robots',
      required: true,
      description: 'robots meta tag (index/noindex, follow/nofollow)',
    },
    { id: 'viewport', required: true, description: 'viewport meta for mobile rendering' },
    { id: 'charset', required: true, description: 'charset=UTF-8' },
    { id: 'lang', required: true, description: 'html lang attribute (e.g. en)' },
  ],
  OPEN_GRAPH: [
    { id: 'og:title', required: true, description: 'og:title — matches page intent' },
    { id: 'og:description', required: true, description: 'og:description — 2–4 sentences' },
    { id: 'og:image', required: true, description: 'og:image — min 1200x630px, under 8MB' },
    { id: 'og:image:alt', required: true, description: 'og:image:alt — descriptive alt text' },
    { id: 'og:url', required: true, description: 'og:url — canonical URL' },
    { id: 'og:type', required: true, description: 'og:type — article | website | profile' },
    { id: 'og:site_name', required: true, description: 'og:site_name' },
    { id: 'og:locale', required: false, description: 'og:locale — e.g. en_US' },
  ],
  TWITTER_CARDS: [
    { id: 'twitter:card', required: true, description: 'summary_large_image for posts' },
    { id: 'twitter:title', required: true, description: 'twitter:title' },
    { id: 'twitter:description', required: true, description: 'twitter:description' },
    { id: 'twitter:image', required: true, description: 'twitter:image — min 800x418px' },
    { id: 'twitter:image:alt', required: true, description: 'twitter:image:alt' },
    { id: 'twitter:site', required: true, description: 'twitter:site — @handle' },
    { id: 'twitter:creator', required: false, description: 'twitter:creator — author @handle' },
  ],
  SCHEMA_ORG: [
    {
      id: 'schema-article',
      required: true,
      description: 'Article or BlogPosting JSON-LD on post pages',
    },
    { id: 'schema-breadcrumb', required: true, description: 'BreadcrumbList JSON-LD on all pages' },
    {
      id: 'schema-website',
      required: true,
      description: 'WebSite JSON-LD on homepage (SearchAction)',
    },
    { id: 'schema-person', required: false, description: 'Person JSON-LD on author pages' },
  ],
  CONTENT: [
    { id: 'h1-single', required: true, description: 'Exactly one H1 per page' },
    { id: 'h2-structure', required: true, description: 'Logical heading hierarchy H2 → H3' },
    { id: 'img-alt', required: true, description: 'All images have descriptive alt text' },
    { id: 'internal-links', required: true, description: 'At least 2 internal links per post' },
    { id: 'word-count', required: false, description: 'Posts min 800 words for topical depth' },
    { id: 'reading-time', required: false, description: 'Reading time displayed for UX' },
  ],
  PERFORMANCE: [
    { id: 'lcp', required: true, description: 'LCP under 2.5s (Largest Contentful Paint)' },
    { id: 'cls', required: true, description: 'CLS under 0.1 (Cumulative Layout Shift)' },
    { id: 'fid', required: true, description: 'FID/INP under 200ms (Interaction to Next Paint)' },
    { id: 'ttfb', required: true, description: 'TTFB under 800ms (Time to First Byte)' },
    { id: 'image-webp', required: true, description: 'Images served as WebP via Cloudinary' },
    { id: 'lazy-load', required: true, description: 'Below-fold images lazy loaded' },
  ],
  INDEXING: [
    { id: 'sitemap', required: true, description: 'XML sitemap at /sitemap.xml' },
    { id: 'sitemap-index', required: false, description: 'Sitemap index for large sites' },
    { id: 'robots-txt', required: true, description: 'robots.txt blocks /admin, /api, /draft' },
    { id: 'noindex-drafts', required: true, description: 'Draft posts never indexed' },
    { id: 'noindex-admin', required: true, description: 'Admin routes blocked from indexing' },
    { id: 'pagination-canonical', required: false, description: 'Paginated pages have canonical' },
  ],
} as const;

export const LIGHTHOUSE_TARGETS = {
  performance: 90,
  accessibility: 90,
  bestPractices: 90,
  seo: 100,
} as const;

export const CORE_WEB_VITALS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  INP: { good: 200, needsImprovement: 500 },
  TTFB: { good: 800, needsImprovement: 1800 },
  FCP: { good: 1800, needsImprovement: 3000 },
} as const;
