import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import Sentry from '../lib/sentry';

interface RequestWithMeta extends Request {
  requestId?: string;
}

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: RequestWithMeta,
  res: Response,
  _next: NextFunction,
): void => {
  // 🔹 Send to Sentry
  Sentry.captureException(err);

  let statusCode = 500;
  let errorType = 'Server Error';
  const message = err.message || 'Internal server error';

  // 🔹 Validation Error (Zod)
  if (err instanceof ZodError) {
    statusCode = 422;
    errorType = 'Validation Error';

    console.error('⚠️ VALIDATION ERROR:', err.errors);

    res.status(statusCode).json({
      requestId: req.requestId,
      errorType,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // 🔹 Custom App Error
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorType = statusCode >= 500 ? 'Server Error' : 'Client Error';

    console.error('⚠️ APP ERROR:', err.message);

    res.status(statusCode).json({
      requestId: req.requestId,
      errorType,
      message: err.message,
    });
    return;
  }

  // 🔹 Auth Error (example)
  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorType = 'Auth Error';
  }

  // 🔹 Generic Client Errors
  if (err.status && err.status >= 400 && err.status < 500) {
    statusCode = err.status;
    errorType = 'Client Error';
  }

  // 🔹 Unknown / Server Error
  console.error('🔥 SERVER ERROR:', err);

  res.status(statusCode).json({
    requestId: req.requestId,
    errorType,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
  });
};
