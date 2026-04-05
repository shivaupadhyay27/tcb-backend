import { z } from 'zod';
import { SLUG_RULES } from '../../seo/constants/url-conventions';

const seoFields = {
  metaTitle: z.string().max(60, 'Meta title should be under 60 chars for SEO').optional(),
  metaDesc: z.string().max(160, 'Meta description should be under 160 chars for SEO').optional(),
  ogTitle: z.string().max(60).optional(),
  ogDesc: z.string().max(160).optional(),
  ogImage: z.string().url('OG image must be a valid URL').optional(),
  twitterTitle: z.string().max(60).optional(),
  twitterDesc: z.string().max(160).optional(),
  twitterImage: z.string().url('Twitter image must be a valid URL').optional(),
  schemaType: z.enum(['Article', 'BlogPosting']).optional(),
};

export const createPostSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(110, 'Title must be under 110 characters'),

  content: z.string().min(50, 'Content must be at least 50 characters'),

  excerpt: z.string().max(300).optional(),

  // 🔥 ADD THIS
  is_sponsored: z.boolean().optional(),

  slug: z
    .string()
    .regex(
      SLUG_RULES.ALLOWED_PATTERN,
      'Slug must contain only lowercase letters, numbers, and hyphens',
    )
    .max(SLUG_RULES.MAX_LENGTH)
    .optional(),

  categoryIds: z.array(z.string().uuid()).max(5).optional(),

  ...seoFields,
});

export const updatePostSchema = z
  .object({
    title: z.string().min(5).max(110).optional(),
    content: z.string().min(50).optional(),
    excerpt: z.string().max(300).optional(),
    slug: z.string().regex(SLUG_RULES.ALLOWED_PATTERN).max(SLUG_RULES.MAX_LENGTH).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    publishedAt: z
      .string()
      .datetime({ message: 'publishedAt must be a valid ISO 8601 datetime' })
      .optional()
      .nullable(),
    canonicalUrl: z.string().url('Canonical URL must be a valid URL').optional(),
    categoryIds: z.array(z.string().uuid()).max(5).optional(),
    ...seoFields,
  })
  .refine(
    (data) => {
      if (data.status === 'PUBLISHED') return !!data.title || !!data.content;
      return true;
    },
    { message: 'Cannot publish a post without title and content' },
  );

export const publishPostSchema = z.object({
  publishedAt: z
    .string()
    .datetime({ message: 'publishedAt must be a valid ISO 8601 datetime' })
    .optional()
    .nullable(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PublishPostInput = z.infer<typeof publishPostSchema>;
