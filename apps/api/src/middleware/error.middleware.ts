// apps/api/src/middleware/error.middleware.ts
import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errors";
import { logger } from "./logger.middleware";
import { ZodError } from "zod";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Zod validation errors — convert to ValidationError shape
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: err.flatten().fieldErrors,
      },
    });
  }

  // Prisma unique constraint violation
  if ((err as { code?: string }).code === "P2002") {
    return res.status(409).json({
      success: false,
      error: {
        code: "CONFLICT",
        message: "A record with these details already exists",
        details: null,
      },
    });
  }

  // Known application errors
  if (err instanceof AppError) {
    // Log 5xx errors; 4xx are expected client errors
    if (err.statusCode >= 500) {
      logger.error("Application error", {
        code: err.code,
        message: err.message,
        path: req.path,
        method: req.method,
        stack: err.stack,
      });
    }
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      },
    });
  }

  // Unknown / unhandled errors — log full details, return generic response
  logger.error("Unhandled error", {
    message: err.message,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      details: null,
    },
  });
};
