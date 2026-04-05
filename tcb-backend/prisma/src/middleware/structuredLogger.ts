import { Request, Response, NextFunction } from 'express';

interface RequestWithMeta extends Request {
  requestId?: string;
}

export const structuredLogger = (req: RequestWithMeta, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - start;

    const log = {
      requestId: req.requestId,
      method: req.method,
      route: req.originalUrl,
      status: res.statusCode,
      responseTime,
      user: req.user?.role || 'guest',
    };

    console.log(JSON.stringify(log));

    if (responseTime > 1500) {
      console.warn(
        JSON.stringify({
          type: 'SLOW_API',
          requestId: req.requestId,
          route: req.originalUrl,
          responseTime,
        }),
      );
    }
  });

  next();
};
