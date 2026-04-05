import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/token.service';
import prisma from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authorization header missing or malformed', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or deactivated', 401);
    }

    // ✅ FIXED
    req.user = {
      sub: payload.sub,
      role: payload.role,
      email: payload.email,
    };

    next();
  } catch (err) {
    next(err);
  }
};
