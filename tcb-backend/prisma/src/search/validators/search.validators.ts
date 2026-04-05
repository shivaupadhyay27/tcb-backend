import { z } from 'zod';

// ── Strict search query validation ───────────
// Prevents SQL injection, XSS, and abuse

const BLOCKED_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION|FROM|WHERE)\b)/i,
  /(-{2}|\/\*|\*\/)/, // SQL comments
  /[;'"\\`]/, // SQL meta chars
  /<script/i, // XSS attempt
  /javascript:/i, // XSS via protocol
  /on\w+\s*=/i, // event handler injection
];

export const searchQuerySchema = z.object({
  q: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(200, 'Search query must be under 200 characters')
    .transform((val) => val.trim())
    .refine((val) => !BLOCKED_PATTERNS.some((pattern) => pattern.test(val)), {
      message: 'Search query contains invalid characters',
    }),
  page: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val || '1', 10);
      return isNaN(num) || num < 1 ? 1 : Math.min(num, 100);
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val || '20', 10);
      return isNaN(num) || num < 1 ? 20 : Math.min(num, 50);
    }),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

// ── Pagination validator (reusable) ──────────

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val || '1', 10);
      return isNaN(num) || num < 1 ? 1 : Math.min(num, 1000);
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const num = parseInt(val || '20', 10);
      return isNaN(num) || num < 1 ? 20 : Math.min(num, 100);
    }),
});
