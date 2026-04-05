export const URL_CONVENTIONS = {
  HOME: '/',
  BLOG_FEED: '/blog',
  SEARCH: '/search',
  SITEMAP: '/sitemap.xml',
  ROBOTS: '/robots.txt',
  POST: '/blog/:slug',
  CATEGORY: '/category/:slug',
  AUTHOR: '/author/:slug',
  TAG: '/tag/:slug',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  GOOGLE_AUTH: '/api/v1/auth/google',
  GOOGLE_CB: '/api/v1/auth/google/callback',
  ADMIN_BASE: '/admin',
  ADMIN_POSTS: '/admin/posts',
  ADMIN_USERS: '/admin/users',
  ADMIN_MEDIA: '/admin/media',
  API_BASE: '/api/v1',
  API_AUTH: '/api/v1/auth',
  API_POSTS: '/api/v1/posts',
  API_USERS: '/api/v1/users',
  API_CATEGORIES: '/api/v1/categories',
  API_IMAGES: '/api/v1/images',
} as const;

const SITE_URL = process.env.SITE_URL || 'https://thecorporateblog.com';

export const buildUrl = {
  post: (slug: string) => `${SITE_URL}/blog/${slug}`,
  category: (slug: string) => `${SITE_URL}/category/${slug}`,
  author: (slug: string) => `${SITE_URL}/author/${slug}`,
  tag: (slug: string) => `${SITE_URL}/tag/${slug}`,
  sitemap: () => `${SITE_URL}/sitemap.xml`,
  feed: () => `${SITE_URL}/blog`,
  home: () => SITE_URL,
};

export const SLUG_RULES = {
  MAX_LENGTH: 80,
  MIN_LENGTH: 3,
  SEPARATOR: '-',
  ALLOWED_PATTERN: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  FORBIDDEN_PREFIXES: ['the-', 'a-', 'an-'],
  FORBIDDEN_WORDS: [
    'admin',
    'api',
    'auth',
    'login',
    'register',
    'dashboard',
    'sitemap',
    'robots',
    'search',
    'preview',
    'health',
  ],
} as const;
