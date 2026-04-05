export interface BaseSEOMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  og: OpenGraphMeta;
  twitter: TwitterMeta;
  robots: RobotsDirective;
}

export interface OpenGraphMeta {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  url: string;
  type: OGType;
  siteName: string;
  locale: string;
}

export interface TwitterMeta {
  card: TwitterCardType;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  site: string;
  creator: string;
}

export interface RobotsDirective {
  index: boolean;
  follow: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  maxSnippet?: number;
  maxImagePreview?: 'none' | 'standard' | 'large';
}

export interface ArticleSchema {
  '@context': 'https://schema.org';
  '@type': 'Article' | 'BlogPosting';
  headline: string;
  description: string;
  image: string[];
  datePublished: string;
  dateModified: string;
  author: PersonSchema;
  publisher: OrganizationSchema;
  mainEntityOfPage: { '@type': 'WebPage'; '@id': string };
  articleSection?: string;
  wordCount?: number;
  keywords?: string[];
}

export interface PersonSchema {
  '@type': 'Person';
  name: string;
  url: string;
  image?: string;
}

export interface OrganizationSchema {
  '@type': 'Organization';
  name: string;
  url: string;
  logo: { '@type': 'ImageObject'; url: string };
}

export interface BreadcrumbSchema {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  '@type': 'ListItem';
  position: number;
  name: string;
  item: string;
}

export interface WebSiteSchema {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  url: string;
  potentialAction: {
    '@type': 'SearchAction';
    target: { '@type': 'EntryPoint'; urlTemplate: string };
    'query-input': 'required name=search_term_string';
  };
}

export type OGType = 'article' | 'website' | 'profile';
export type TwitterCardType = 'summary' | 'summary_large_image' | 'app' | 'player';

export interface PostSEOPayload {
  title: string;
  metaTitle?: string;
  metaDesc?: string;
  excerpt?: string;
  slug: string;
  ogImage?: string;
  ogTitle?: string;
  ogDesc?: string;
  twitterTitle?: string;
  twitterDesc?: string;
  twitterImage?: string;
  publishedAt?: Date;
  updatedAt: Date;
  author: { name: string; slug: string; avatarUrl?: string };
  categories: string[];
  schemaType?: 'Article' | 'BlogPosting';
  readingTimeMin?: number;
  wordCount?: number;
}

export interface CategorySEOPayload {
  name: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDesc?: string;
  ogImage?: string;
}

export interface AuthorSEOPayload {
  name: string;
  slug: string;
  bio?: string;
  avatarUrl?: string;
}
