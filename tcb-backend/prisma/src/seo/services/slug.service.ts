import { SLUG_RULES } from '../constants/url-conventions';
import prisma from '../../lib/prisma';

export function generateSlug(input: string): string {
  let slug = input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, SLUG_RULES.SEPARATOR)
    .replace(/^-+|-+$/g, '');

  if (slug.length > SLUG_RULES.MAX_LENGTH) {
    slug = slug.substring(0, SLUG_RULES.MAX_LENGTH);
    slug = slug.substring(0, slug.lastIndexOf(SLUG_RULES.SEPARATOR));
  }

  for (const prefix of SLUG_RULES.FORBIDDEN_PREFIXES) {
    if (slug.startsWith(prefix)) {
      slug = slug.slice(prefix.length);
    }
  }

  return slug;
}

export function validateSlug(slug: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (slug.length < SLUG_RULES.MIN_LENGTH)
    errors.push(`Slug must be at least ${SLUG_RULES.MIN_LENGTH} characters`);

  if (slug.length > SLUG_RULES.MAX_LENGTH)
    errors.push(`Slug must be at most ${SLUG_RULES.MAX_LENGTH} characters`);

  if (!SLUG_RULES.ALLOWED_PATTERN.test(slug))
    errors.push('Slug must contain only lowercase letters, numbers, and hyphens');

  if ((SLUG_RULES.FORBIDDEN_WORDS as readonly string[]).includes(slug))
    errors.push(`Slug "${slug}" is a reserved word`);

  if (slug.startsWith('-') || slug.endsWith('-'))
    errors.push('Slug must not start or end with a hyphen');

  return { valid: errors.length === 0, errors };
}

export async function makePostSlugUnique(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.post.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function makeUserSlugUnique(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.user.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function makeCategorySlugUnique(
  baseSlug: string,
  excludeId?: string,
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

export function calculateReadingTime(content: string): number {
  const WORDS_PER_MINUTE = 225;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.ceil(wordCount / WORDS_PER_MINUTE);
}

export function calculateWordCount(content: string): number {
  const stripped = content.replace(/<[^>]*>/g, '');
  return stripped.trim().split(/\s+/).filter(Boolean).length;
}
