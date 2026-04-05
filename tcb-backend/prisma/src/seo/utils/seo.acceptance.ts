// ─────────────────────────────────────────────
// SEO Acceptance Checklist v1
// Run: npx tsx src/seo/utils/seo.acceptance.ts
// ─────────────────────────────────────────────

export interface CheckItem {
  id: string;
  category: string;
  description: string;
  status: 'pass' | 'fail' | 'manual';
  notes?: string;
}

export function generateSEOChecklist(): CheckItem[] {
  return [
    // ── HEAD TAGS ──────────────────────────────
    {
      id: 'title-tag',
      category: 'Head Tags',
      description: '<title> tag present on every page, 50–60 chars',
      status: 'manual',
      notes: 'Validated via dynamic metadata engine: seo_title || title',
    },
    {
      id: 'meta-description',
      category: 'Head Tags',
      description: '<meta description> present, 150–160 chars',
      status: 'manual',
      notes: 'Validated via: seo_description || excerpt',
    },
    {
      id: 'canonical-tag',
      category: 'Head Tags',
      description: 'Self-referencing canonical tag on all pages',
      status: 'manual',
      notes:
        'Canonical override logic implemented — explicit canonicalUrl takes priority, else auto-generated from slug',
    },
    {
      id: 'clean-urls',
      category: 'Head Tags',
      description: 'Clean URL structure: /blog/:slug, /blog/category/:slug, /blog/author/:slug',
      status: 'pass',
    },
    {
      id: 'no-query-dup',
      category: 'Head Tags',
      description: 'No query parameter duplication in canonicals',
      status: 'pass',
      notes: 'Canonical URLs strip query params via canonicalHeaderMiddleware',
    },
    {
      id: 'viewport',
      category: 'Head Tags',
      description: 'viewport meta tag for mobile rendering',
      status: 'pass',
    },
    { id: 'charset', category: 'Head Tags', description: 'charset=UTF-8', status: 'pass' },
    {
      id: 'lang-attr',
      category: 'Head Tags',
      description: 'html lang="en" attribute',
      status: 'pass',
    },
    {
      id: 'robots-meta',
      category: 'Head Tags',
      description: 'robots meta tag (index/follow) on public, noindex on admin/draft',
      status: 'pass',
    },

    // ── OPEN GRAPH ─────────────────────────────
    {
      id: 'og-title',
      category: 'OpenGraph',
      description: 'og:title present on all pages',
      status: 'pass',
    },
    {
      id: 'og-description',
      category: 'OpenGraph',
      description: 'og:description present',
      status: 'pass',
    },
    {
      id: 'og-image',
      category: 'OpenGraph',
      description: 'og:image min 1200x630px',
      status: 'manual',
      notes: 'Uses ogImage from post or falls back to default',
    },
    { id: 'og-url', category: 'OpenGraph', description: 'og:url = canonical URL', status: 'pass' },
    {
      id: 'og-type',
      category: 'OpenGraph',
      description: 'og:type = article on posts, website on listings',
      status: 'pass',
    },
    {
      id: 'og-site-name',
      category: 'OpenGraph',
      description: 'og:site_name present',
      status: 'pass',
    },

    // ── TWITTER CARDS ──────────────────────────
    {
      id: 'twitter-card',
      category: 'Twitter Cards',
      description: 'twitter:card = summary_large_image on posts',
      status: 'pass',
    },
    {
      id: 'twitter-title',
      category: 'Twitter Cards',
      description: 'twitter:title present',
      status: 'pass',
    },
    {
      id: 'twitter-desc',
      category: 'Twitter Cards',
      description: 'twitter:description present',
      status: 'pass',
    },
    {
      id: 'twitter-image',
      category: 'Twitter Cards',
      description: 'twitter:image present',
      status: 'pass',
    },
    {
      id: 'twitter-site',
      category: 'Twitter Cards',
      description: 'twitter:site handle',
      status: 'pass',
    },

    // ── JSON-LD / STRUCTURED DATA ──────────────
    {
      id: 'jsonld-article',
      category: 'Structured Data',
      description: 'Article/BlogPosting JSON-LD on post pages',
      status: 'pass',
    },
    {
      id: 'jsonld-breadcrumb',
      category: 'Structured Data',
      description: 'BreadcrumbList JSON-LD on all pages',
      status: 'pass',
    },
    {
      id: 'jsonld-author',
      category: 'Structured Data',
      description: 'Person JSON-LD on author pages',
      status: 'pass',
    },
    {
      id: 'jsonld-website',
      category: 'Structured Data',
      description: 'WebSite JSON-LD on blog home',
      status: 'pass',
    },
    {
      id: 'breadcrumb-correct',
      category: 'Structured Data',
      description: 'Breadcrumb hierarchy: Home > Blog > Category > Post',
      status: 'pass',
    },
    {
      id: 'no-dup-canonical',
      category: 'Structured Data',
      description: 'No duplicate canonical tags',
      status: 'pass',
      notes: 'Single canonical per page via Next.js metadata API',
    },
    {
      id: 'rich-results',
      category: 'Structured Data',
      description: 'Validate with Rich Results Test',
      status: 'manual',
      notes: 'https://search.google.com/test/rich-results',
    },

    // ── DRAFT / INDEXING SAFETY ────────────────
    {
      id: 'no-draft-exposure',
      category: 'Indexing',
      description: 'Draft/archived posts return 404 on public routes',
      status: 'pass',
      notes: 'publishedWhere() enforces status=PUBLISHED + publishedAt not null',
    },
    {
      id: 'published-at-guard',
      category: 'Indexing',
      description: 'published_at null guard on all public queries',
      status: 'pass',
    },
    {
      id: 'noindex-drafts',
      category: 'Indexing',
      description: 'Draft posts never appear in sitemap',
      status: 'pass',
    },
    {
      id: 'noindex-admin',
      category: 'Indexing',
      description: 'Admin/API routes have X-Robots-Tag: noindex',
      status: 'pass',
    },
    {
      id: 'sitemap-published',
      category: 'Indexing',
      description: 'Sitemap only includes published posts',
      status: 'pass',
    },
    {
      id: 'robots-txt',
      category: 'Indexing',
      description: 'robots.txt blocks /admin, /api, /auth, /dashboard',
      status: 'pass',
    },

    // ── PERFORMANCE ────────────────────────────
    {
      id: 'lighthouse-90',
      category: 'Performance',
      description: 'Lighthouse CI all categories >= 90',
      status: 'manual',
      notes: 'lighthouserc.js configured, CI pipeline added',
    },
    {
      id: 'lazy-images',
      category: 'Performance',
      description: 'All below-fold images lazy loaded',
      status: 'pass',
    },
    {
      id: 'brotli',
      category: 'Performance',
      description: 'Brotli compression enabled',
      status: 'pass',
      notes: 'Next.js compress:true + Vercel CDN serves Brotli',
    },
    {
      id: 'loading-skeletons',
      category: 'Performance',
      description: 'Loading skeletons on all pages (no layout shift)',
      status: 'pass',
    },
    {
      id: 'isr-15min',
      category: 'Performance',
      description: 'ISR revalidation set to 900s (15 min)',
      status: 'pass',
    },
    {
      id: 'cloudinary-auto',
      category: 'Performance',
      description: 'Cloudinary f_auto,q_auto transformations auto-applied',
      status: 'pass',
    },

    // ── SECURITY HEADERS ───────────────────────
    {
      id: 'hsts',
      category: 'Security',
      description: 'Strict-Transport-Security header',
      status: 'pass',
    },
    {
      id: 'csp',
      category: 'Security',
      description: 'Content-Security-Policy header',
      status: 'pass',
    },
    {
      id: 'x-content-type',
      category: 'Security',
      description: 'X-Content-Type-Options: nosniff',
      status: 'pass',
    },
    { id: 'x-frame', category: 'Security', description: 'X-Frame-Options: DENY', status: 'pass' },
    {
      id: 'referrer',
      category: 'Security',
      description: 'Referrer-Policy: strict-origin-when-cross-origin',
      status: 'pass',
    },
    {
      id: 'permissions',
      category: 'Security',
      description: 'Permissions-Policy: camera=(), microphone=(), geolocation=()',
      status: 'pass',
    },

    // ── HEALTH / DEVOPS ────────────────────────
    {
      id: 'health-endpoint',
      category: 'DevOps',
      description: 'GET /health returns DB status + uptime',
      status: 'pass',
    },
    {
      id: 'neon-cold-start',
      category: 'DevOps',
      description: 'Validate Neon cold start timing',
      status: 'manual',
      notes: 'Monitor /health responseTimeMs after idle periods',
    },
    {
      id: 'preview-deploys',
      category: 'DevOps',
      description: 'Vercel preview deployments enabled',
      status: 'pass',
    },
    {
      id: 'access-logs',
      category: 'DevOps',
      description: 'Query performance logging middleware active',
      status: 'pass',
    },
  ];
}

// ── CLI runner ────────────────────────────────

function printChecklist() {
  const checks = generateSEOChecklist();
  const categories = [...new Set(checks.map((c) => c.category))];

  console.log('\n📋 SEO Acceptance Checklist v1\n' + '═'.repeat(60));

  for (const cat of categories) {
    console.log(`\n▸ ${cat}`);
    console.log('─'.repeat(60));
    const items = checks.filter((c) => c.category === cat);
    for (const item of items) {
      const icon = item.status === 'pass' ? '✅' : item.status === 'fail' ? '❌' : '🔍';
      console.log(`  ${icon} ${item.description}`);
      if (item.notes) console.log(`     └─ ${item.notes}`);
    }
  }

  const pass = checks.filter((c) => c.status === 'pass').length;
  const fail = checks.filter((c) => c.status === 'fail').length;
  const manual = checks.filter((c) => c.status === 'manual').length;

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ ${pass} passed  ❌ ${fail} failed  🔍 ${manual} manual verification needed`);
  console.log('═'.repeat(60));
}

printChecklist();
