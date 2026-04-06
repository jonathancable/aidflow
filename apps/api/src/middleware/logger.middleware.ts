import winston from 'winston';
import type { Request, Response, NextFunction } from 'express';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),   // structured JSON in production
  ),
  transports: [new winston.transports.Console()],
});

export const requestLogger = (
  req: Request, res: Response, next: NextFunction
) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      method:     req.method,
      path:       req.path,
      status:     res.statusCode,
      duration_ms:Date.now() - start,
      user_id:    (req as any).context?.userId ?? null,
      role:       (req as any).context?.role ?? null,
      ip:         req.ip,
    });
  });
  next();
};