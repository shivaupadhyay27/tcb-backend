import {
  BaseSEOMeta,
  ArticleSchema,
  BreadcrumbSchema,
  WebSiteSchema,
  PostSEOPayload,
  CategorySEOPayload,
  AuthorSEOPayload,
} from '../types/seo.types';

const SITE_URL = process.env.SITE_URL || 'https://thecorporateblog.com';
const SITE_NAME = process.env.SITE_NAME || 'The Corporate Blog';
const SITE_TWITTER = process.env.SITE_TWITTER || '@TheCorporateBlog';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;
const LOGO_URL = `${SITE_URL}/images/logo.png`;

export function buildPostMeta(post: PostSEOPayload): BaseSEOMeta {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const title = post.metaTitle || post.title;
  const description = post.metaDesc || post.excerpt || '';
  const image = post.ogImage || DEFAULT_OG_IMAGE;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    canonicalUrl: url,
    og: {
      title: post.ogTitle || title,
      description: post.ogDesc || description,
      image,
      imageAlt: post.ogTitle || title,
      url,
      type: 'article',
      siteName: SITE_NAME,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.twitterTitle || title,
      description: post.twitterDesc || description,
      image: post.twitterImage || image,
      imageAlt: post.twitterTitle || title,
      site: SITE_TWITTER,
      creator: `@${post.author.slug}`,
    },
    robots: { index: true, follow: true, maxImagePreview: 'large', maxSnippet: -1 },
  };
}

export function buildCategoryMeta(cat: CategorySEOPayload): BaseSEOMeta {
  const url = `${SITE_URL}/category/${cat.slug}`;
  const title = cat.metaTitle || `${cat.name} Articles`;
  const description =
    cat.metaDesc || cat.description || `Browse all ${cat.name} articles on ${SITE_NAME}`;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    canonicalUrl: url,
    og: {
      title,
      description,
      image: cat.ogImage || DEFAULT_OG_IMAGE,
      imageAlt: title,
      url,
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      image: cat.ogImage || DEFAULT_OG_IMAGE,
      imageAlt: title,
      site: SITE_TWITTER,
      creator: SITE_TWITTER,
    },
    robots: { index: true, follow: true, maxImagePreview: 'large', maxSnippet: -1 },
  };
}

export function buildAuthorMeta(author: AuthorSEOPayload): BaseSEOMeta {
  const url = `${SITE_URL}/author/${author.slug}`;
  const title = `${author.name} — Author`;
  const description = author.bio || `Read all articles by ${author.name} on ${SITE_NAME}`;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    canonicalUrl: url,
    og: {
      title,
      description,
      image: author.avatarUrl || DEFAULT_OG_IMAGE,
      imageAlt: author.name,
      url,
      type: 'profile',
      siteName: SITE_NAME,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      image: author.avatarUrl || DEFAULT_OG_IMAGE,
      imageAlt: author.name,
      site: SITE_TWITTER,
      creator: `@${author.slug}`,
    },
    robots: { index: true, follow: true, maxImagePreview: 'large', maxSnippet: -1 },
  };
}

export function buildNoIndexMeta(pageTitle: string): Pick<BaseSEOMeta, 'title' | 'robots'> {
  return {
    title: `${pageTitle} | ${SITE_NAME}`,
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  };
}

export function buildArticleSchema(post: PostSEOPayload): ArticleSchema {
  return {
    '@context': 'https://schema.org',
    '@type': post.schemaType || 'Article',
    headline: post.metaTitle || post.title,
    description: post.metaDesc || post.excerpt || '',
    image: [post.ogImage || DEFAULT_OG_IMAGE],
    datePublished: post.publishedAt?.toISOString() || new Date().toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: post.author.name,
      url: `${SITE_URL}/author/${post.author.slug}`,
      image: post.author.avatarUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: LOGO_URL },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
    articleSection: post.categories[0],
    wordCount: post.wordCount,
    keywords: post.categories,
  };
}

export function buildBreadcrumbSchema(crumbs: { name: string; url: string }[]): BreadcrumbSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function buildWebSiteSchema(): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}
