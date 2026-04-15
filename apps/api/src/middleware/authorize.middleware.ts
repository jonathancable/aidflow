// apps/api/src/middleware/authorize.middleware.ts
import type { Request, Response, NextFunction } from "express";
import { hasPermission } from "@/config/permissions";
import { AuthorizationError } from "@/middleware/errors";

type Action = Parameters<typeof hasPermission>[2];

// Returns an Express middleware that checks req.context.role against the permission map.
// Must be used after authenticate() — depends on req.context being set.
export function authorize(resource: string, action: Action) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!hasPermission(req.context.role, resource, action)) {
      return next(
        new AuthorizationError(
          `Role '${req.context.role}' cannot perform '${action}' on '${resource}'`,
        ),
      );
    }
    next();
  };
}
