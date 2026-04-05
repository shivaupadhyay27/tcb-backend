import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
