import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';

const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 3,
  EDITOR: 2,
  WRITER: 1,
};

export const authorize =
  (...allowedRoles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError('Not authenticated', 401));

    const userLevel = ROLE_HIERARCHY[req.user.role];
    const minAllowed = Math.min(...allowedRoles.map((r) => ROLE_HIERARCHY[r]));

    if (userLevel < minAllowed) {
      return next(new AppError(`Access denied. Required role: ${allowedRoles.join(' or ')}`, 403));
    }

    next();
  };

export const isAdmin = authorize('ADMIN');
export const isEditor = authorize('EDITOR');
export const isWriter = authorize('WRITER');

export const isOwnerOrAdmin =
  (getResourceUserId: (req: Request) => string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError('Not authenticated', 401));

    const resourceUserId = getResourceUserId(req);
    const isOwner = req.user.sub === resourceUserId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return next(new AppError('Access denied. Not the resource owner', 403));
    }

    next();
  };
