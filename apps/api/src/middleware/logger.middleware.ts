// apps/api/src/middleware/logger.middleware.ts — production-ready version
import winston from "winston";
import { env } from "@config/env";
import type { Request, Response, NextFunction } from "express";

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(
    ({ level, message, timestamp, ...meta }) =>
      timestamp +
      " " +
      level +
      ": " +
      message +
      (Object.keys(meta).length ? " " + JSON.stringify(meta) : ""),
  ),
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL ?? "info",
  format: env.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    // In production, also write to file for log shipper pickup
    ...(env.NODE_ENV === "production"
      ? [
          new winston.transports.File({
            filename: "/var/log/aidflow/error.log",
            level: "error",
          }),
          new winston.transports.File({
            filename: "/var/log/aidflow/combined.log",
          }),
        ]
      : []),
  ],
});

// Request logger — every API request logged with timing
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();
  const reqId = Math.random().toString(36).slice(2, 10);
  (req as any).requestId = reqId;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger.log(level, "request", {
      requestId: reqId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration_ms: duration,
      userId: (req as any).context?.userId ?? null,
      role: (req as any).context?.role ?? null,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  });
  next();
};
