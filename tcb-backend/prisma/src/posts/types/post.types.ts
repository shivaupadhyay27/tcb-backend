import { PostStatus } from '@prisma/client';

export interface PostResponse {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: PostStatus;
  metaTitle: string | null;
  metaDesc: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDesc: string | null;
  ogImage: string | null;
  twitterTitle: string | null;
  twitterDesc: string | null;
  twitterImage: string | null;
  schemaType: string | null;
  publishedAt: Date | null;
  readingTimeMin: number | null;
  viewCount: number;
  author: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    bio?: string | null;
  };
  categories: {
    id: string;
    name: string;
    slug: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedPostsResponse {
  posts: PostResponse[];
  total: number;
  page: number;
  totalPages: number;
}
