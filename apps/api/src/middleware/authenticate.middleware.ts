// apps/api/src/middleware/authenticate.middleware.ts
import type { Request, Response, NextFunction } from "express";
import { JwtService } from "@services/jwt.service";
import { AuthenticationError } from "./errors";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AuthenticationError("No access token provided"));
  }

  const token = authHeader.slice(7); // remove "Bearer "
  try {
    const payload = JwtService.verifyAccessToken(token);
    req.context = {
      userId: payload.sub,
      role: payload.role,
      orgId: payload.orgId,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

// Optional authenticate — attaches context if token present, does not fail if absent
// Used for routes that behave differently for authenticated vs anonymous users
export const optionalAuthenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();

  const token = authHeader.slice(7);
  try {
    const payload = JwtService.verifyAccessToken(token);
    req.context = {
      userId: payload.sub,
      role: payload.role,
      orgId: payload.orgId,
    };
  } catch {
    /* invalid token — treat as unauthenticated */
  }
  return next();
};
