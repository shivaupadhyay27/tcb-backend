import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload, TokenPair } from '../types/auth.types';
import { Role } from '@prisma/client';
import prisma from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';

void REFRESH_SECRET; // declared for completeness, used in future RS256 migration

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  } as jwt.SignOptions);
}

export function signRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export async function issueTokenPair(
  userId: string,
  email: string,
  role: Role,
): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: userId, email, role });
  const refreshToken = signRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId, expiresAt },
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
  } catch {
    throw new AppError('Invalid or expired access token', 401);
  }
}

export async function rotateRefreshToken(oldToken: string): Promise<TokenPair> {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: { user: true },
  });

  if (!stored || stored.revoked) throw new AppError('Invalid refresh token', 401);
  if (stored.expiresAt < new Date()) throw new AppError('Refresh token expired', 401);

  await prisma.refreshToken.update({
    where: { token: oldToken },
    data: { revoked: true },
  });

  return issueTokenPair(stored.userId, stored.user.email, stored.user.role);
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revoked: true },
  });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
}
