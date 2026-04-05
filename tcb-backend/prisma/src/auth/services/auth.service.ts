import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { issueTokenPair } from './token.service';
import { TokenPair, GoogleProfile } from '../types/auth.types';
import { generateSlug, makeUserSlugUnique } from '../../seo/services/slug.service';

const SALT_ROUNDS = 12;

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<TokenPair> {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new AppError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const baseSlug = generateSlug(name);
  const slug = await makeUserSlugUnique(baseSlug);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, slug },
  });

  return issueTokenPair(user.id, user.email, user.role);
}

export async function loginUser(email: string, password: string): Promise<TokenPair> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) throw new AppError('Invalid credentials', 401);
  if (!user.isActive) throw new AppError('Account is deactivated', 403);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401);

  return issueTokenPair(user.id, user.email, user.role);
}

export async function findOrCreateGoogleUser(profile: GoogleProfile): Promise<TokenPair> {
  let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

  if (user) {
    if (!user.isActive) throw new AppError('Account is deactivated', 403);
    return issueTokenPair(user.id, user.email, user.role);
  }

  user = await prisma.user.findUnique({ where: { email: profile.email } });

  if (user) {
    user = await prisma.user.update({
      where: { email: profile.email },
      data: { googleId: profile.id, avatarUrl: user.avatarUrl || profile.avatarUrl },
    });
    return issueTokenPair(user.id, user.email, user.role);
  }

  const baseSlug = generateSlug(profile.name);
  const slug = await makeUserSlugUnique(baseSlug);

  user = await prisma.user.create({
    data: {
      name: profile.name,
      email: profile.email,
      googleId: profile.id,
      avatarUrl: profile.avatarUrl,
      slug,
    },
  });

  return issueTokenPair(user.id, user.email, user.role);
}
